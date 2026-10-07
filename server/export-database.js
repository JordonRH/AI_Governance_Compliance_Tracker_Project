import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.env.DATABASE_PATH || 'data/aitrace.sqlite');
const destination = resolve(process.argv[2] || ('data/exports/aitrace-' + new Date().toISOString().replaceAll(':', '-') + '.json'));
const db = new DatabaseSync(source, { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
const encode = value => Buffer.isBuffer(value) ? { type: 'base64', value: value.toString('base64') } : value;
const payload = {
  format: 'aitrace-portable-export',
  version: 1,
  exportedAt: new Date().toISOString(),
  schemaVersion: db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version ?? 0,
  tables: Object.fromEntries(tables.map(table => [
    table,
    db.prepare('SELECT * FROM "' + table.replaceAll('"', '""') + '"').all()
      .map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encode(value)])))
  ]))
};
db.close();
writeFileSync(destination, JSON.stringify(payload, null, 2), { encoding: 'utf8', flag: 'wx' });
console.log('Exported ' + tables.length + ' tables to ' + destination + '.');
