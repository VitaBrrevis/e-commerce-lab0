import { pool, waitForDb, migrate, logger } from './db.js';

async function main() {
  await waitForDb();
  try {
    await migrate();
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  logger.error({ message: 'Migration failed', error: err.message });
  process.exit(1);
});
