import { resolve } from 'node:path';

const supportedNames = new Set([
  'AITRACE_BIND_HOST',
  'AITRACE_REQUEST_BODY_LIMIT_BYTES'
]);

function integer(name, value, fallback, minimum, maximum) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a whole number.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function databasePath(value, rootDir) {
  if (!value) return resolve(rootDir, 'data/aitrace.sqlite');
  if (value.includes('\0')) throw new Error('DATABASE_PATH must not contain a null character.');
  return value === ':memory:' ? value : resolve(rootDir, value);
}

export function isAllowedHostHeader(value, allowedHostnames) {
  if (typeof value !== 'string') return false;
  const match = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/i.exec(value);
  if (!match) return false;
  if (match[2] && Number(match[2]) > 65535) return false;
  return allowedHostnames.includes(match[1].toLowerCase());
}

export function loadConfig({ env = process.env, args = process.argv.slice(2), rootDir } = {}) {
  if (!rootDir) throw new Error('Configuration requires the application root directory.');
  const unknown = Object.keys(env).filter(name => name.startsWith('AITRACE_') && !supportedNames.has(name));
  if (unknown.length) throw new Error(`Unknown AITrace configuration: ${unknown.sort().join(', ')}.`);

  const production = args.includes('--production');
  const bindHost = env.AITRACE_BIND_HOST || '127.0.0.1';
  if (bindHost !== '127.0.0.1') {
    throw new Error('AITRACE_BIND_HOST must remain 127.0.0.1 until authentication and deployment security are approved.');
  }

  const port = integer('PORT', env.PORT, 5173, 1, 65535);
  const requestBodyLimitBytes = integer('AITRACE_REQUEST_BODY_LIMIT_BYTES', env.AITRACE_REQUEST_BODY_LIMIT_BYTES, 32768, 1024, 1048576);
  const allowedHostnames = Object.freeze(['127.0.0.1', 'localhost']);
  const paths = Object.freeze({
    database: databasePath(env.DATABASE_PATH, rootDir),
    distribution: resolve(rootDir, 'dist')
  });
  const http = Object.freeze({ requestBodyLimitBytes, allowedHostnames, development: !production });

  return Object.freeze({
    mode: production ? 'production' : 'development',
    production,
    bindHost,
    port,
    publicUrl: `http://${bindHost}:${port}`,
    paths,
    http
  });
}
