import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { isAllowedHostHeader, loadConfig } from '../../server/config.js';

const rootDir = resolve('fixture-root');
test('secure local defaults are frozen', () => {
  const config = loadConfig({ env: {}, args: [], rootDir });
  assert.equal(config.bindHost, '127.0.0.1');
  assert.equal(config.port, 5173);
  assert.equal(config.http.requestBodyLimitBytes, 32768);
  assert.equal(config.paths.database, resolve(rootDir, 'data/aitrace.sqlite'));
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.http));
});
test('supported settings are configurable and validated', () => {
  const config = loadConfig({ env: { PORT: '6200', DATABASE_PATH: ':memory:', AITRACE_REQUEST_BODY_LIMIT_BYTES: '65536' }, args: ['--production'], rootDir });
  assert.equal(config.port, 6200);
  assert.equal(config.paths.database, ':memory:');
  assert.equal(config.http.requestBodyLimitBytes, 65536);
  assert.equal(config.production, true);
  assert.throws(() => loadConfig({ env: { PORT: '0' }, rootDir }), /PORT must be between/);
  assert.throws(() => loadConfig({ env: { AITRACE_BIND_HOST: '0.0.0.0' }, rootDir }), /locally/);
  assert.throws(() => loadConfig({ env: { AITRACE_UNKNOWN: 'value' }, rootDir }), /Unknown AITrace configuration/);
});
test('PostgreSQL URL selects hosted database mode without requiring SQLite path', () => {
  const config = loadConfig({ env: { DATABASE_URL: 'postgresql://db.example.test:5432/aitrace' }, args: ['--production'], rootDir });
  assert.equal(config.paths.databaseUrl, 'postgresql://db.example.test:5432/aitrace');
  assert.throws(() => loadConfig({ env: { DATABASE_URL: 'sqlite://not-postgres' }, rootDir }), /valid PostgreSQL/);
});
test('host-header validation only permits configured local names and valid ports', () => {
  const allowed = ['127.0.0.1', 'localhost'];
  assert.equal(isAllowedHostHeader('localhost:5173', allowed), true);
  assert.equal(isAllowedHostHeader('127.0.0.1', allowed), true);
  assert.equal(isAllowedHostHeader('example.com', allowed), false);
  assert.equal(isAllowedHostHeader('localhost:99999', allowed), false);
  assert.equal(isAllowedHostHeader('localhost.evil.test', allowed), false);
});
test('TLS requires paired files and enables secure transport configuration',()=>{
 assert.throws(()=>loadConfig({rootDir:process.cwd(),env:{AITRACE_TLS_CERT_PATH:'cert.pem'},args:[]}),/both TLS/);
 const config=loadConfig({rootDir:process.cwd(),env:{AITRACE_TLS_CERT_PATH:'cert.pem',AITRACE_TLS_KEY_PATH:'key.pem'},args:['--production']});
 assert.equal(config.http.secure,true);assert.ok(config.publicUrl.startsWith('https://'));assert.equal(config.http.development,false);
});
