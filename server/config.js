import { resolve } from 'node:path';

const supportedNames = new Set([
  'AITRACE_BIND_HOST','AITRACE_ALLOWED_HOSTNAMES','AITRACE_BOOTSTRAP_LOGIN','AITRACE_BOOTSTRAP_PASSWORD','AITRACE_BOOTSTRAP_DISPLAY_NAME','AITRACE_BOOTSTRAP_ORGANIZATION_ID','AITRACE_BOOTSTRAP_ORGANIZATION_NAME',
  'AITRACE_REQUEST_BODY_LIMIT_BYTES',
  'AITRACE_REMINDER_INTERVAL_MS',
  'AITRACE_CERTIFICATES_DIR','AITRACE_TLS_BUNDLE_PATH','AITRACE_TLS_CERT_PATH','AITRACE_TLS_KEY_PATH','AITRACE_LOGIN_MAX_ATTEMPTS','AITRACE_LOGIN_WINDOW_MS'
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
  if (bindHost !== '127.0.0.1' && !(production && bindHost === '0.0.0.0')) {
    throw new Error('AITRACE_BIND_HOST must be 127.0.0.1 locally or 0.0.0.0 in production.');
  }

  const port = integer('PORT', env.PORT, 5173, 1, 65535);
  const requestBodyLimitBytes = integer('AITRACE_REQUEST_BODY_LIMIT_BYTES', env.AITRACE_REQUEST_BODY_LIMIT_BYTES, 32768, 1024, 1048576);
  const configuredHosts = (env.AITRACE_ALLOWED_HOSTNAMES || ['127.0.0.1','localhost',env.RENDER_EXTERNAL_HOSTNAME].filter(Boolean).join(',')).split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if (!configuredHosts.length || configuredHosts.some(value=>!/^([a-z0-9.-]+)$/.test(value))) throw new Error('AITRACE_ALLOWED_HOSTNAMES must be a comma-separated list of hostnames.');
  const allowedHostnames = Object.freeze([...new Set(configuredHosts)]);
  const paths = Object.freeze({
    database: databasePath(env.DATABASE_PATH, rootDir),
    distribution: resolve(rootDir, 'dist')
  });
  if(Boolean(env.AITRACE_TLS_CERT_PATH)!==Boolean(env.AITRACE_TLS_KEY_PATH))throw new Error('Configure both TLS certificate and key paths.');
  if(env.AITRACE_TLS_BUNDLE_PATH&&env.AITRACE_TLS_CERT_PATH)throw new Error('Choose a TLS bundle or separate PEM paths, not both.');
  const tls=env.AITRACE_TLS_BUNDLE_PATH?Object.freeze({bundle:resolve(rootDir,env.AITRACE_TLS_BUNDLE_PATH)}):env.AITRACE_TLS_CERT_PATH?Object.freeze({cert:resolve(rootDir,env.AITRACE_TLS_CERT_PATH),key:resolve(rootDir,env.AITRACE_TLS_KEY_PATH)}):null;
  const http = Object.freeze({ requestBodyLimitBytes, allowedHostnames, development: !production, secure: Boolean(tls), loginMaxAttempts:integer('AITRACE_LOGIN_MAX_ATTEMPTS',env.AITRACE_LOGIN_MAX_ATTEMPTS,10,1,100), loginWindowMs:integer('AITRACE_LOGIN_WINDOW_MS',env.AITRACE_LOGIN_WINDOW_MS,900000,1000,86400000) });

  return Object.freeze({
    reminderIntervalMs: integer('AITRACE_REMINDER_INTERVAL_MS', env.AITRACE_REMINDER_INTERVAL_MS, 60000, 1000, 86400000),
    mode: production ? 'production' : 'development',
    production,
    tls,
    certificatesDirectory:resolve(rootDir,env.AITRACE_CERTIFICATES_DIR||'data/certificates'),
    bindHost,
    port,
    publicUrl: `${tls?'https':'http'}://${bindHost}:${port}`,
    paths,
    http
  });
}
