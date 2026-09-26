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
  if (version > 8) { db.close(); throw new Error('Database schema is newer than this application.'); }
  if (version === 0) {
    db.exec(`
      BEGIN;
      CREATE TABLE organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        login TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrator','compliance_officer','staff_user')),
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_cost INTEGER NOT NULL,
        password_block_size INTEGER NOT NULL,
        password_parallelization INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active','disabled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      ) STRICT;
      CREATE TABLE ai_uses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        created_by_account_id TEXT REFERENCES accounts(id),
        name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        owner TEXT NOT NULL,
        business_area TEXT NOT NULL,
        data_description TEXT NOT NULL,
        data_sensitivity TEXT NOT NULL CHECK(data_sensitivity IN ('Not classified','Public','Internal','Confidential','Sensitive')),
        approval_status TEXT NOT NULL CHECK(approval_status IN ('Not reviewed','Approved','Declined')),
        source TEXT NOT NULL CHECK(source IN ('registry','shadow-report')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX ai_uses_organization ON ai_uses(organization_id);
      CREATE INDEX ai_uses_business_area ON ai_uses(organization_id,business_area);
      CREATE INDEX sessions_account ON sessions(account_id);
      INSERT INTO schema_migrations(version) VALUES (2);
      COMMIT;
    `);
  } else if (version === 1) {
    const now = new Date().toISOString();
    db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
    try {
      db.exec(`
        CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
        CREATE TABLE accounts (
          id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), login TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('administrator','compliance_officer','staff_user')), password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
          password_cost INTEGER NOT NULL, password_block_size INTEGER NOT NULL, password_parallelization INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('active','disabled')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL, last_used_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
        ) STRICT;
        ALTER TABLE ai_uses RENAME TO ai_uses_legacy;
        CREATE TABLE ai_uses (
          id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), created_by_account_id TEXT REFERENCES accounts(id),
          name TEXT NOT NULL, purpose TEXT NOT NULL, owner TEXT NOT NULL, business_area TEXT NOT NULL, data_description TEXT NOT NULL,
          data_sensitivity TEXT NOT NULL CHECK(data_sensitivity IN ('Not classified','Public','Internal','Confidential','Sensitive')), approval_status TEXT NOT NULL CHECK(approval_status IN ('Not reviewed','Approved','Declined')), source TEXT NOT NULL CHECK(source IN ('registry','shadow-report')),
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        ) STRICT;
      `);
      db.prepare('INSERT INTO organizations VALUES (?, ?, ?, ?)').run('legacy-local', 'Migrated local organisation', now, now);
      db.exec(`INSERT INTO ai_uses SELECT id, 'legacy-local', NULL, name, purpose, owner, category, data_description, 'Not classified', 'Not reviewed', 'registry', created_at, updated_at FROM ai_uses_legacy;
        DROP TABLE ai_uses_legacy;
        CREATE INDEX ai_uses_organization ON ai_uses(organization_id);
        CREATE INDEX ai_uses_business_area ON ai_uses(organization_id,business_area);
        CREATE INDEX sessions_account ON sessions(account_id);
        INSERT INTO schema_migrations(version) VALUES (2);
        COMMIT;
        PRAGMA foreign_keys = ON;`);
    } catch (error) {
      try { db.exec('ROLLBACK; PRAGMA foreign_keys = ON;'); } catch {}
      throw error;
    }
  }
  const currentVersion = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version ?? 0;
  if (currentVersion < 3) {
    db.exec(`
      BEGIN;
      CREATE TABLE governance_actions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        ai_use_id TEXT NOT NULL REFERENCES ai_uses(id),
        assessment_id TEXT,
        title TEXT NOT NULL,
        owner TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Not Started','In Progress','Complete')),
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        history_json TEXT NOT NULL
      ) STRICT;
      CREATE INDEX governance_actions_organization ON governance_actions(organization_id, ai_use_id);
      INSERT INTO schema_migrations(version) VALUES (3);
      COMMIT;
    `);
  }
  if (db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version < 4) {
    db.exec(`BEGIN;
      CREATE TABLE organization_settings (
        organization_id TEXT PRIMARY KEY REFERENCES organizations(id),
        appearance TEXT NOT NULL CHECK(appearance IN ('srec','slate')),
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE account_audit (
        id INTEGER PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        actor_id TEXT NOT NULL REFERENCES accounts(id),
        account_id TEXT NOT NULL REFERENCES accounts(id),
        action TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO schema_migrations(version) VALUES (4);
      COMMIT;`);
  }
  if (db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version < 5) {
    db.exec(`BEGIN;
      CREATE TABLE assessments (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
        ai_use_id TEXT NOT NULL REFERENCES ai_uses(id), created_by TEXT NOT NULL REFERENCES accounts(id),
        state TEXT NOT NULL CHECK(state IN ('Draft','Submitted')), revision INTEGER NOT NULL,
        definition_json TEXT NOT NULL, responses_json TEXT NOT NULL, result_json TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX assessments_scope ON assessments(organization_id,ai_use_id,updated_at);
      INSERT INTO schema_migrations VALUES (5); COMMIT;`);
  }
  if (db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version < 6) {
    db.exec(`BEGIN;
      ALTER TABLE governance_actions ADD COLUMN owner_account_id TEXT REFERENCES accounts(id);
      INSERT INTO schema_migrations VALUES (6); COMMIT;`);
  }
  if (db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version < 7) {
    db.exec(`BEGIN;
      CREATE TABLE policies (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
        document_id TEXT NOT NULL, version INTEGER NOT NULL, title TEXT NOT NULL,
        filename TEXT NOT NULL, media_type TEXT NOT NULL, content BLOB NOT NULL, sha256 TEXT NOT NULL,
        checklist_json TEXT NOT NULL, reviewer_id TEXT NOT NULL REFERENCES accounts(id),
        review_due TEXT NOT NULL, reviewed_at TEXT, created_by TEXT NOT NULL REFERENCES accounts(id),
        created_at TEXT NOT NULL, UNIQUE(organization_id,document_id,version)
      ) STRICT;
      INSERT INTO schema_migrations VALUES (7); COMMIT;`);
  }
  if (db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version < 8) {
    db.exec(`BEGIN;
      CREATE TABLE reminder_settings (organization_id TEXT PRIMARY KEY REFERENCES organizations(id), enabled INTEGER NOT NULL, upcoming_days INTEGER NOT NULL, repeat_days INTEGER NOT NULL) STRICT;
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
        account_id TEXT NOT NULL REFERENCES accounts(id), dedupe_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL, item_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
        delivered_at TEXT NOT NULL, read_at TEXT
      ) STRICT;
      CREATE TABLE reminder_runs (id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, status TEXT NOT NULL, delivered INTEGER NOT NULL, error TEXT) STRICT;
      INSERT INTO schema_migrations VALUES (8); COMMIT;`);
  }
  return db;
}
