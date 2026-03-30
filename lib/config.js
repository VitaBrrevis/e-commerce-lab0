/**
 * Build DB pool and app settings from environment (12-factor).
 * @param {NodeJS.ProcessEnv} [env]
 */
export function getPoolAndAppConfig(env = process.env) {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_PASS,
    DB_PASSWORD,
    DB_NAME = 'appdb',
    DB_SSL = 'false',
    DB_MAX_POOL = '5',
    DB_IDLE_TIMEOUT = '10000',
    DB_CONNECT_TIMEOUT = '5000',
    APP_PORT = '3000',
  } = env;

  const password = DB_PASS ?? DB_PASSWORD ?? 'postgres';

  return {
    pool: {
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password,
      database: DB_NAME,
      ssl: DB_SSL === 'true',
      max: Number(DB_MAX_POOL),
      idleTimeoutMillis: Number(DB_IDLE_TIMEOUT),
      connectionTimeoutMillis: Number(DB_CONNECT_TIMEOUT),
    },
    appPort: Number(APP_PORT),
  };
}
