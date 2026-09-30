import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../../server/database.js';
import {createAccount,login} from '../../server/auth.js';
import {defaults} from '../../server/governance-config.js';

const run=promisify(execFile),command=resolve('server/seed-testing.js');
async function fixture(){
  const directory=mkdtempSync(join(tmpdir(),'aitrace-seed-')),filename=join(directory,'fixture.sqlite'),output=join(directory,'testing'),password='fictional-'+randomUUID();
  const db=openDatabase(filename),id=await createAccount(db,{organizationId:'seed-sme',organizationName:'Fictional seed SME',login:'existing.admin',displayName:'Existing fictional administrator',role:'administrator',password});
  db.prepare('INSERT INTO governance_configurations VALUES (?,?,?,?,?)').run('seed-sme',1,JSON.stringify(defaults()),id,new Date().toISOString());
  db.prepare('INSERT INTO configuration_events(organization_id,version,action,actor_id,reference,created_at) VALUES(?,?,?,?,?,?)').run('seed-sme',1,'activated',id,'Fictional baseline',new Date().toISOString());
  return {directory,filename,output,password,db,id};
}
function seed(f,extra={}){return run(process.execPath,[command,'--organization-id','seed-sme','--output-dir',f.output],{env:{...process.env,DATABASE_PATH:f.filename,AITRACE_ACCOUNT_PASSWORD:f.password,...extra},timeout:60000})}

test('test seed creates audited scenarios and accounts, verifies access and repeats without overwriting',async()=>{
  const f=await fixture();
  try{
    const original=f.db.prepare('SELECT * FROM accounts WHERE id=?').get(f.id);
    await login(f.db,'existing.admin',f.password);
    const first=JSON.parse((await seed(f)).stdout);
    assert.equal(first.accounts,18);assert.equal(first.configurations.length,8);assert.equal(first.activeVersion,1);assert.ok(existsSync(first.backup));
    assert.deepEqual(f.db.prepare('SELECT * FROM accounts WHERE id=?').get(f.id),original);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,19);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM governance_configurations').get().n,9);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM configuration_events').get().n,1);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM policies').get().n,1);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM account_audit WHERE action='test-account-created:operator-authorized'").get().n,18);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE a.login LIKE 'test.%' AND s.revoked_at IS NULL").get().n,0);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM sessions WHERE account_id=? AND revoked_at IS NULL').get(f.id).n,1);
    const backup=new DatabaseSync(first.backup,{readOnly:true});assert.equal(backup.prepare('SELECT COUNT(*) n FROM accounts').get().n,1);backup.close();
    const rowsBefore=f.db.prepare('SELECT * FROM accounts ORDER BY id').all(),auditBefore=f.db.prepare('SELECT COUNT(*) n FROM account_audit').get().n;
    const second=JSON.parse((await seed(f)).stdout);
    assert.deepEqual(second.configurations,first.configurations);assert.notEqual(second.backup,first.backup);
    assert.deepEqual(f.db.prepare('SELECT * FROM accounts ORDER BY id').all(),rowsBefore);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM account_audit').get().n,auditBefore);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM policies').get().n,1);
    for(const name of ['catalogue.md','manifest.json'])assert.equal(readFileSync(join(f.output,name),'utf8').includes(f.password),false);
    await assert.rejects(seed(f,{AITRACE_ACCOUNT_PASSWORD:'different-fictional-password'}),/does not match existing test account/);
    assert.deepEqual(f.db.prepare('SELECT * FROM accounts ORDER BY id').all(),rowsBefore);
  }finally{f.db.close();rmSync(f.directory,{recursive:true,force:true})}
});

test('test seed rejects reserved-login collisions before creating accounts or versions',async()=>{
  const f=await fixture();
  try{
    await createAccount(f.db,{organizationId:'other-sme',organizationName:'Other fictional SME',login:'test.admin',displayName:'Unrelated administrator',role:'administrator',password:f.password});
    await assert.rejects(seed(f),/differs from the test profile/);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,2);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM governance_configurations').get().n,1);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM policies').get().n,0);
    assert.equal(existsSync(f.output),false);
  }finally{f.db.close();rmSync(f.directory,{recursive:true,force:true})}
});

test('test seed requires an explicit organisation and a valid environment password',async()=>{
  await assert.rejects(run(process.execPath,[command],{env:{...process.env,AITRACE_ACCOUNT_PASSWORD:''}}),/Choose an existing test organisation/);
  await assert.rejects(run(process.execPath,[command,'--organization-id','seed-sme'],{env:{...process.env,AITRACE_ACCOUNT_PASSWORD:'short'}}),/12 to 200 characters/);
});
