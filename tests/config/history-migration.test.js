import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../../server/database.js';
import {createAccount} from '../../server/auth.js';
import {demoDefinition} from '../../server/assessment-definition.js';
import {defaults,activeConfiguration} from '../../server/governance-config.js';

test('version 11 upgrade preserves snapshots and seeds reporting only from capture time',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'aitrace-history-migration-')),filename=join(directory,'legacy.sqlite');
  let db=openDatabase(filename);
  try{
    const accountId=await createAccount(db,{organizationId:'fictional-migration',organizationName:'Fictional migration SME',login:'migration@example.test',displayName:'Fictional migration admin',role:'administrator',password:'fictional migration password'});
    const old='2026-01-01T00:00:00.000Z',definition=JSON.stringify(demoDefinition('Operations'));
    db.prepare("INSERT INTO ai_uses VALUES ('legacy-use','fictional-migration',?,'Fictional legacy tool','Synthetic purpose','Fictional owner','Operations','Synthetic data','Public','Not reviewed','registry',?,?)").run(accountId,old,old);
    db.prepare("INSERT INTO assessments VALUES ('legacy-assessment','fictional-migration','legacy-use',?,'Draft',1,?,'{}',NULL,?,?)").run(accountId,definition,old,old);
    db.prepare('INSERT INTO governance_configurations VALUES (?,?,?,?,?)').run('fictional-migration',1,JSON.stringify(defaults()),accountId,old);
    // Restore the pre-upgrade schema to exercise the actual migration path.
    for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'reporting_%'").all())db.exec(`DROP TRIGGER ${name}`);
    db.exec('DROP TABLE reporting_history; DROP TABLE reporting_coverage; DROP TABLE policy_acknowledgements; DROP TABLE configuration_events; DELETE FROM schema_migrations WHERE version=12;');
    db.close();db=openDatabase(filename);
    assert.equal(db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version,12);
    assert.equal(db.prepare("SELECT definition_json FROM assessments WHERE id='legacy-assessment'").get().definition_json,definition);
    assert.equal((await activeConfiguration(db,'fictional-migration')).version,1);
    const history=db.prepare('SELECT * FROM reporting_history ORDER BY id').all();assert.equal(history.length,2);
    assert.ok(history.every(row=>row.recorded_at>old));
    assert.equal(db.prepare("SELECT reference FROM configuration_events WHERE organization_id='fictional-migration'").get().reference,'Previously active demonstration configuration');
    db.close();db=openDatabase(filename);assert.equal(db.prepare('SELECT COUNT(*) n FROM reporting_history').get().n,2);
  }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
