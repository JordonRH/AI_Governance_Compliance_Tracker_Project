import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
  `);
  const version = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version ?? 0;
  if (version > 1) { db.close(); throw new Error('Database schema is newer than this application.'); }
  if (version === 0) {
    db.exec(`
      BEGIN;
      CREATE TABLE ai_uses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        owner TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('Education', 'Administration', 'Research')),
        data_description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX ai_uses_category ON ai_uses(category);
      INSERT INTO schema_migrations(version) VALUES (1);
      COMMIT;
    `);
  }
  return db;
}
