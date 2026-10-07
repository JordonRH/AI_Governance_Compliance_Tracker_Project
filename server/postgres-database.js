import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const parameterize = sql => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

export class PostgresDatabase {
  constructor(url) { this.pool = new Pool({ connectionString: url, max: 10 }); }
  async get(sql, ...values) { return (await this.pool.query(parameterize(sql), values)).rows[0]; }
  async all(sql, ...values) { return (await this.pool.query(parameterize(sql), values)).rows; }
  async run(sql, ...values) { const result = await this.pool.query(parameterize(sql), values); return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id }; }
  async exec(sql) { return this.pool.query(sql); }
  async transaction(callback) {
    const client = await this.pool.connect();
    const db = {
      get: async (sql, ...values) => (await client.query(parameterize(sql), values)).rows[0],
      all: async (sql, ...values) => (await client.query(parameterize(sql), values)).rows,
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
