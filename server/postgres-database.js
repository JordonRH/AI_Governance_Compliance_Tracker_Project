import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const jsonColumns = new Set(['capabilities_json','custom_role_json','history_json','definition_json','responses_json','result_json','checklist_json','changes_json','configuration_json','record_json']);
const booleanColumns = new Set(['must_change_password','enabled','deleted']);
const parameterize = sql => {
  let index = 0;
  return sql.replace(/INSERT OR IGNORE/gi, 'INSERT').replace(/\?/g, () => `$${++index}`);
};
const sqliteShape = row => row && Object.fromEntries(Object.entries(row).map(([key,value]) => [key, jsonColumns.has(key) && value !== null && typeof value !== 'string' ? JSON.stringify(value) : booleanColumns.has(key) && typeof value === 'boolean' ? Number(value) : value]));

export class PostgresDatabase {
  constructor(url) { this.pool = new Pool({ connectionString: url, max: 10 }); }
  async get(sql, ...values) { return sqliteShape((await this.pool.query(parameterize(sql), values)).rows[0]); }
  async all(sql, ...values) { return (await this.pool.query(parameterize(sql), values)).rows.map(sqliteShape); }
  async run(sql, ...values) { const result = await this.pool.query(parameterize(sql), values); return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id }; }
  async exec(sql) { return this.pool.query(sql); }
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
  async migrate() { await this.exec(await readFile(new URL('./migrations/postgres/001_initial.sql', import.meta.url), 'utf8')); }
  async close() { await this.pool.end(); }
}

export async function openPostgresDatabase(url) { const db = new PostgresDatabase(url); await db.migrate(); return db; }
