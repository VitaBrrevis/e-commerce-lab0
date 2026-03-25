import 'dotenv/config';
import pg from 'pg';
import pino from 'pino';

const { Pool } = pg;

function requiredEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return v;
}

// Config from environment only — no secrets or deploy-specific values in code (12-factor III).
const DB_HOST = requiredEnv('DB_HOST');
const DB_PORT = requiredEnv('DB_PORT');
const DB_USER = requiredEnv('DB_USER');
const DB_PASS = requiredEnv('DB_PASS');
const DB_NAME = requiredEnv('DB_NAME');
const DB_SSL = process.env.DB_SSL ?? 'false';
const DB_MAX_POOL = process.env.DB_MAX_POOL ?? '5';
const DB_IDLE_TIMEOUT = process.env.DB_IDLE_TIMEOUT ?? '10000';
const DB_CONNECT_TIMEOUT = process.env.DB_CONNECT_TIMEOUT ?? '5000';

export const logger = pino({
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({ service: 'app' }),
  },
});

export const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  ssl: DB_SSL === 'true',
  max: Number(DB_MAX_POOL),
  idleTimeoutMillis: Number(DB_IDLE_TIMEOUT),
  connectionTimeoutMillis: Number(DB_CONNECT_TIMEOUT),
});

export async function waitForDb(retries = 15, delayMs = 2000) {
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

/** Release-phase task: run via `node migrate.js` or npm run migrate (12-factor V, XII). */
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(255) NOT NULL,
      position  VARCHAR(255) NOT NULL,
      department VARCHAR(255) NOT NULL,
      hired_at  DATE         NOT NULL DEFAULT CURRENT_DATE
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM employees');
  if (parseInt(rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO employees (name, position, department, hired_at) VALUES
        ('Alice Johnson',  'Software Engineer',   'Engineering', '2023-03-15'),
        ('Bob Smith',      'Product Manager',     'Product',     '2022-07-01'),
        ('Carol Williams', 'UX Designer',         'Design',      '2023-09-20'),
        ('David Brown',    'DevOps Engineer',     'Engineering', '2021-11-05'),
        ('Eva Martinez',   'Data Analyst',        'Analytics',   '2024-01-10')
    `);
    logger.info({ message: 'Initial seed data inserted' });
  }

  logger.info({ message: 'Migrations complete' });
}
