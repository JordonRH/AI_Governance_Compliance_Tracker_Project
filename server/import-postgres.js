import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const filename = process.argv[2] || 'data/exports/aitrace-portable.json';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const payload = JSON.parse(await readFile(filename, 'utf8'));
if (payload.format !== 'aitrace-portable-export' || payload.version !== 1) {
  throw new Error('Unsupported AITrace portable export.');
}

const tables = [
  'schema_migrations', 'organizations', 'accounts', 'sessions', 'ai_uses',
  'assessments', 'governance_actions', 'organization_settings', 'account_audit',
  'policies', 'reminder_settings', 'notifications', 'reminder_runs',
  'registry_events', 'governance_configurations', 'configuration_events',
  'policy_acknowledgements', 'reporting_coverage', 'reporting_history'
];
const jsonColumns = new Set([
  'capabilities_json', 'custom_role_json', 'history_json', 'definition_json',
  'responses_json', 'result_json', 'checklist_json', 'changes_json',
  'configuration_json', 'record_json'
]);
const booleanColumns = new Set(['must_change_password', 'enabled', 'deleted']);
const binaryColumns = new Set(['content']);

function valueFor(column, value) {
  if (value === null || value === undefined) return null;
  if (jsonColumns.has(column)) return typeof value === 'string' ? JSON.parse(value) : value;
  if (booleanColumns.has(column)) return Boolean(value);
  if (binaryColumns.has(column) && value?.type === 'base64') return Buffer.from(value.value, 'base64');
  return value;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  for (const table of tables) {
    const rows = payload.tables[table] || [];
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map(column => valueFor(column, row[column]));
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ');
      await client.query(
        'INSERT INTO "' + table + '" ("' + columns.join('", "') + '") VALUES (' + placeholders + ') ON CONFLICT DO NOTHING',
        values
      );
    }
    console.log(table + ': ' + rows.length);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
