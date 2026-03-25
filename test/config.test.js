import assert from 'node:assert/strict';
import test from 'node:test';
import { getPoolAndAppConfig } from '../lib/config.js';

test('getPoolAndAppConfig uses documented defaults', () => {
  const { pool, appPort } = getPoolAndAppConfig({});
  assert.equal(pool.host, 'localhost');
  assert.equal(pool.port, 5432);
  assert.equal(pool.user, 'postgres');
  assert.equal(pool.password, 'postgres');
  assert.equal(pool.database, 'appdb');
  assert.equal(pool.ssl, false);
  assert.equal(pool.max, 5);
  assert.equal(pool.idleTimeoutMillis, 10000);
  assert.equal(pool.connectionTimeoutMillis, 5000);
  assert.equal(appPort, 3000);
});

test('getPoolAndAppConfig enables ssl when DB_SSL is true', () => {
  const { pool } = getPoolAndAppConfig({ DB_SSL: 'true' });
  assert.equal(pool.ssl, true);
});

test('getPoolAndAppConfig reads overrides from env', () => {
  const { pool, appPort } = getPoolAndAppConfig({
    DB_HOST: 'db.example',
    DB_PORT: '5433',
    APP_PORT: '8080',
  });
  assert.equal(pool.host, 'db.example');
  assert.equal(pool.port, 5433);
  assert.equal(appPort, 8080);
});
