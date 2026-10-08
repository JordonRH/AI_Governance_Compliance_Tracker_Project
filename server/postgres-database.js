import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

const jsonColumns = new Set(['capabilities_json','custom_role_json','history_json','definition_json','responses_json','result_json','checklist_json','changes_json','configuration_json','record_json']);
const booleanColumns = new Set(['must_change_password','enabled','deleted']);
const dateOnlyColumns = new Set(['due_date','review_due']);
const parameterize = sql => {
  let index = 0;
  const ignore = /^\s*INSERT OR IGNORE\s+/i.test(sql);
  let result = sql.replace(/^\s*INSERT OR IGNORE\s+/i, 'INSERT ').replace(/\?/g, () => `$${++index}`);
  if (ignore) result = result.replace(/;\s*$/, '') + ' ON CONFLICT DO NOTHING';
  return result;
};
const sqliteShape = row => row && Object.fromEntries(Object.entries(row).map(([key,value]) => [key,
  value instanceof Date ? dateOnlyColumns.has(key) ? value.toISOString().slice(0, 10) : value.toISOString() :
  jsonColumns.has(key) && value !== null && typeof value !== 'string' ? JSON.stringify(value) :
  booleanColumns.has(key) && typeof value === 'boolean' ? Number(value) : value
]));

export class PostgresDatabase {
  constructor(url) { this.pool = new Pool({ connectionString: url, max: 10 }); this.transactions = new AsyncLocalStorage(); }
  client() { return this.transactions.getStore() || this.pool; }
  async get(sql, ...values) { return sqliteShape((await this.client().query(parameterize(sql), values)).rows[0]); }
  async all(sql, ...values) { return (await this.client().query(parameterize(sql), values)).rows.map(sqliteShape); }
  async run(sql, ...values) { const result = await this.client().query(parameterize(sql), values); return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id }; }
  async exec(sql) {
    const command=sql.trim().replace(/;$/, '').toUpperCase();
    if (command==='BEGIN' || command==='BEGIN IMMEDIATE') {
      const client=await this.pool.connect();
      await client.query('BEGIN');
      this.transactions.enterWith(client);
      return;
    }
    const client=this.client();
    const result=await client.query(sql);
    if (command==='COMMIT' || command==='ROLLBACK') { if (client!==this.pool) client.release(); this.transactions.enterWith(null); }
    return result;
  }
  async transaction(callback) {
    const client = await this.pool.connect();
    const db = {
      get: async (sql, ...values) => sqliteShape((await client.query(parameterize(sql), values)).rows[0]),
      all: async (sql, ...values) => (await client.query(parameterize(sql), values)).rows.map(sqliteShape),
      run: async (sql, ...values) => { const result = await client.query(parameterize(sql), values); return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id }; },
      exec: sql => client.query(sql)
    };
    try { await client.query('BEGIN'); const value = await callback(db); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async migrate() {
    for (const name of ['001_initial.sql', '002_history_triggers.sql', '003_harden_history_functions.sql']) await this.exec(await readFile(new URL(`./migrations/postgres/${name}`, import.meta.url), 'utf8'));
  }
  async close() { await this.pool.end(); }
}

export async function openPostgresDatabase(url) { const db = new PostgresDatabase(url); await db.migrate(); return db; }
