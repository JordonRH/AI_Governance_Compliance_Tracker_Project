import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { openDatabase } from './database.js';
import { createApp } from './app.js';
import { createAccount } from './auth.js';
import { loadConfig } from './config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = loadConfig({ rootDir: root });
if (config.production && !existsSync(resolve(config.paths.distribution, 'index.html'))) throw new Error('Run npm run build before npm run start.');
const db = openDatabase(config.paths.database);
if (process.env.AITRACE_BOOTSTRAP_LOGIN && !db.prepare('SELECT 1 FROM accounts WHERE login=?').get(process.env.AITRACE_BOOTSTRAP_LOGIN.toLowerCase())) {
  await createAccount(db, { organizationId: process.env.AITRACE_BOOTSTRAP_ORGANIZATION_ID || 'local-demo-sme', organizationName: process.env.AITRACE_BOOTSTRAP_ORGANIZATION_NAME || 'Local demonstration SME', login: process.env.AITRACE_BOOTSTRAP_LOGIN, displayName: process.env.AITRACE_BOOTSTRAP_DISPLAY_NAME || 'Local Administrator', role: 'administrator', password: process.env.AITRACE_BOOTSTRAP_PASSWORD });
}
delete process.env.AITRACE_BOOTSTRAP_PASSWORD;
const app = createApp(db, config.http);
const server = createServer(app);
let vite;
if (config.production) {
  app.use(express.static(config.paths.distribution));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(config.paths.distribution, 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  app.use(vite.middlewares);
}
server.on('error', error => { console.error(error.message); process.exitCode = 1; vite?.close(); db.close(); });
server.listen(config.port, config.bindHost, () => console.log(`AITrace local prototype: ${config.publicUrl}`));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await vite?.close();
  server.close(() => { db.close(); process.exit(0); });
  server.closeAllConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
