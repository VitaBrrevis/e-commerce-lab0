import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pg from 'pg';
import pino from 'pino';

import { runner } from 'node-pg-migrate';
import { getPoolAndAppConfig } from './lib/config.js';
import { esc } from './lib/esc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const { pool: poolConfig, appPort } = getPoolAndAppConfig();


// --- Structured JSON logging ---
const logger = pino({
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({ service: 'app' }),
  },
});

// --- DB pool ---
const pool = new Pool(poolConfig);

// --- Wait for DB ---
async function waitForDb(retries = 15, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      logger.warn({ message: `DB not ready, attempt ${i}/${retries}` });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to database after retries');
}

// --- Migrations (node-pg-migrate: versioned SQL/schema, applied automatically on startup) ---
async function runMigrations() {
  const ran = await runner({
    databaseUrl: {
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      password: poolConfig.password,
      database: poolConfig.database,
      ssl: poolConfig.ssl,
    },
    migrationsTable: 'schema_migrations',
    dir: path.join(__dirname, 'migrations'),
    direction: 'up',
    count: Infinity,
    logger: {
      info: (msg) => logger.info({ message: msg }),
      warn: (msg) => logger.warn({ message: msg }),
      error: (msg) => logger.error({ message: msg }),
      debug: (msg) => logger.debug({ message: msg }),
    },
  });

  logger.info({
    message: 'Migrations complete',
    applied: ran.length,
    names: ran.map((m) => m.name),
  });
}

// --- Health check with 5s cache ---
let healthCache = null;
let healthCacheAt = 0;

async function getHealth() {
  const now = Date.now();
  if (healthCache && now - healthCacheAt < 5000) return healthCache;

  const start = Date.now();
  let db;
  try {
    await pool.query('SELECT 1');
    db = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    db = { status: 'error', message: err.message };
  }

  healthCache = { status: db.status === 'ok' ? 'ok' : 'degraded', db };
  healthCacheAt = now;
  return healthCache;
}

// --- Express app ---
const app = express();

app.get('/health', async (req, res) => {
  const health = await getHealth();
  logger.info({ message: 'Health check', status: health.status });
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, position, department, hired_at FROM employees ORDER BY id'
    );
    const rows_html = rows
      .map(
        (r) => `
      <tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.position)}</td>
        <td>${esc(r.department)}</td>
        <td>${new Date(r.hired_at).toLocaleDateString('uk-UA')}</td>
      </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Employees</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f7fa; color: #222; }
    header { background: #1a1a2e; color: #fff; padding: 1.5rem 2rem; }
    header h1 { font-size: 1.4rem; font-weight: 600; letter-spacing: .02em; }
    main { padding: 2rem; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    thead th { background: #f0f2f5; padding: .75rem 1rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
    tbody td { padding: .7rem 1rem; border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #fafbfc; }
    .badge { display: inline-block; padding: .2rem .6rem; border-radius: 4px; font-size: .78rem; font-weight: 500; background: #e8f0fe; color: #1a73e8; }
    .count { color: #666; font-size: .85rem; margin-bottom: .75rem; }
  </style>
</head>
<body>
  <header><h1>Employees Directory</h1></header>
  <main>
    <p class="count">${rows.length} record${rows.length !== 1 ? 's' : ''} found</p>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Position</th>
            <th>Department</th>
            <th>Hired</th>
          </tr>
        </thead>
        <tbody>${rows_html}</tbody>
      </table>
    </div>
  </main>
</body>
</html>`);
  } catch (err) {
    logger.error({ message: 'Failed to fetch employees', error: err.message });
    res.status(500).send('Internal Server Error');
  }
});

// --- Start ---
async function start() {
  await waitForDb();
  await runMigrations();

  const server = app.listen(appPort, () => {
    logger.info({ message: `Server listening on port ${appPort}` });
  });

  // --- Graceful shutdown ---
  function shutdown(signal) {
    logger.info({ message: `Received ${signal}, shutting down gracefully...` });
    server.close(async () => {
      logger.info({ message: 'HTTP server closed' });
      await pool.end();
      logger.info({ message: 'Database pool closed' });
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ message: 'Startup failed', error: err.message });
  process.exit(1);
});
