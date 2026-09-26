import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccount } from '../../server/auth.js';
import { openDatabase } from '../../server/database.js';
import { createApp } from '../../server/app.js';

const directory=mkdtempSync(join(tmpdir(),'aitrace-api-')),filename=join(directory,'registry.sqlite');
const http={requestBodyLimitBytes:32768,allowedHostnames:['127.0.0.1','localhost']};
let db,server,base,adminCookie,staffCookie,otherCookie;
before(async()=>{db=openDatabase(filename);
 await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'admin@example.test',displayName:'Fictional Admin',role:'administrator',password:'correct horse battery'});
 await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'staff@example.test',displayName:'Fictional Staff',role:'staff_user',password:'correct horse battery'});
 await createAccount(db,{organizationId:'sme-b',organizationName:'Fictional SME B',login:'other@example.test',displayName:'Other Admin',role:'administrator',password:'correct horse battery'});
 server=createServer(createApp(db,http));await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;
 adminCookie=await signIn('admin@example.test');staffCookie=await signIn('staff@example.test');otherCookie=await signIn('other@example.test');
});
after(async()=>{await new Promise(ok=>server.close(ok));db.close();rmSync(directory,{recursive:true,force:true});});
async function api(path,options={}){const response=await fetch(base+path,options);const type=response.headers.get('content-type')||'';return{response,body:type.includes('json')?await response.json():await response.arrayBuffer()};}
async function signIn(login){const result=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password:'correct horse battery'})});assert.equal(result.response.status,200);return result.response.headers.get('set-cookie').split(';')[0];}
const auth=(cookie,method='GET',body)=>({method,headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const valid={name:'Fictional AI helper',owner:'Fictional team',businessArea:'Customer service',purpose:'Demonstrate registry behaviour.',dataDescription:'Synthetic data only.',dataSensitivity:'Public',approvalStatus:'Not reviewed'};

test('health is public while organisation records require authentication',async()=>{assert.equal((await api('/api/health')).response.status,200);assert.equal((await api('/api/registry')).response.status,401);assert.equal((await api('/api/auth/session',{headers:{Cookie:adminCookie}})).body.principal.role,'administrator');});
test('login failures are generic and logout revokes the session',async()=>{for(const login of ['missing@example.test','admin@example.test']){const result=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password:'wrong-password-value'})});assert.equal(result.response.status,401);assert.equal(result.body.error,'Login was not accepted.');}const cookie=await signIn('staff@example.test');assert.equal((await api('/api/auth/logout',auth(cookie,'POST',{}))).response.status,200);assert.equal((await api('/api/registry',{headers:{Cookie:cookie}})).response.status,401);});
test('registry data is scoped by organisation and permissions',async()=>{const made=await api('/api/registry',auth(adminCookie,'POST',valid));assert.equal(made.response.status,201);assert.equal(made.body.businessArea,'Customer service');assert.equal((await api('/api/registry',{headers:{Cookie:otherCookie}})).body.records.length,0);assert.equal((await api(`/api/registry/${made.body.id}`,{headers:{Cookie:otherCookie}})).response.status,404);assert.equal((await api(`/api/registry/${made.body.id}`,auth(staffCookie,'PUT',valid))).response.status,403);});
test('staff can disclose Shadow AI without granting approval',async()=>{const report=await api('/api/shadow-reports',auth(staffCookie,'POST',{name:'Unregistered assistant',businessArea:'Operations',purpose:'Fictional disclosure',dataDescription:'Synthetic data',dataSensitivity:'Internal'}));assert.equal(report.response.status,201);assert.equal(report.body.record.source,'shadow-report');assert.equal(report.body.record.approvalStatus,'Not reviewed');});
test('reports require export permission and produce CSV and PDF',async()=>{assert.equal((await api('/api/reports/compliance.csv',{headers:{Cookie:staffCookie}})).response.status,403);const csv=await api('/api/reports/compliance.csv',{headers:{Cookie:adminCookie}});assert.equal(csv.response.status,200);assert.match(Buffer.from(csv.body).toString(),/Fictional AI helper/);const pdf=await api('/api/reports/compliance.pdf',{headers:{Cookie:adminCookie}});assert.equal(pdf.response.status,200);assert.equal(Buffer.from(pdf.body).subarray(0,4).toString(),'%PDF');});
test('invalid origins and hosts are rejected',async()=>{assert.equal((await api('/api/registry',{headers:{Cookie:adminCookie,Origin:'http://localhost:65535'}})).response.status,403);const status=await new Promise((resolve,reject)=>{const u=new URL('/api/health',base),r=httpRequest({hostname:u.hostname,port:u.port,path:u.pathname,headers:{Host:'example.com'}},x=>{x.resume();x.on('end',()=>resolve(x.statusCode));});r.on('error',reject);r.end();});assert.equal(status,403);});

test('demo-scale registry and report queries complete within the documented one-second target',async()=>{
  const insert=db.prepare("INSERT INTO ai_uses VALUES (?, 'sme-a', NULL, ?, 'Synthetic performance record.', 'Fictional performance team', 'Operations', 'Synthetic data only.', 'Public', 'Not reviewed', 'registry', ?, ?)");
  const now=new Date().toISOString();
  db.exec('BEGIN');try{for(let index=0;index<500;index++)insert.run(`performance-${index}`,`Performance record ${index}`,now,now);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  const started=performance.now();const registry=await api('/api/registry',{headers:{Cookie:adminCookie}});const report=await api('/api/reports/compliance.csv',{headers:{Cookie:adminCookie}});const elapsed=performance.now()-started;
  assert.equal(registry.response.status,200);assert.equal(report.response.status,200);assert.ok(registry.body.records.length>=500);assert.ok(elapsed<1000,`Demo-scale queries took ${elapsed.toFixed(1)}ms.`);
});
test('persisted actions feed reminder planning and the organisation dashboard',async()=>{
  const aiUseId=db.prepare("SELECT id FROM ai_uses WHERE organization_id='sme-a' ORDER BY created_at LIMIT 1").get().id;
  const created=await api('/api/actions',auth(adminCookie,'POST',{aiUseId,title:'Review fictional AI use',owner:'Fictional compliance officer',dueDate:'2026-10-01'}));
  assert.equal(created.response.status,201);assert.equal(created.body.status,'Not Started');
  const plan=await api('/api/reminders/plan',auth(adminCookie,'POST',{policy:{id:'demo-policy',version:'1',status:'approved',upcomingDays:[1],includeDueToday:true,includeOverdue:true,overdueRepeatDays:7},context:{asOfDate:'2026-09-30'}}));
  assert.equal(plan.response.status,200);assert.equal(plan.body.reminders.length,1);assert.equal(plan.body.reminders[0].itemId,created.body.id);
  const dashboard=await api('/api/dashboard?asOfDate=2026-10-02',{headers:{Cookie:adminCookie}});
  assert.equal(dashboard.response.status,200);assert.equal(dashboard.body.actions.total,1);assert.equal(dashboard.body.actions.overdue,1);
  const other=await api('/api/actions',{headers:{Cookie:otherCookie}});assert.deepEqual(other.body.actions,[]);
});
test('Staff User cannot create a formal registry record',async()=>{const result=await api('/api/registry',auth(staffCookie,'POST',{...valid,approvalStatus:'Approved'}));assert.equal(result.response.status,403);});

test('Administrator can register an organisation account without exposing password material',async()=>{
  const input={login:'compliance@example.test',displayName:'Fictional Compliance Officer',role:'compliance_officer',password:'another correct password'};
  const created=await api('/api/accounts',auth(adminCookie,'POST',input));assert.equal(created.response.status,201);assert.equal(created.body.role,'compliance_officer');assert.equal('password' in created.body,false);assert.equal('passwordHash' in created.body,false);
  assert.equal((await api('/api/accounts',auth(staffCookie,'POST',{...input,login:'blocked@example.test'}))).response.status,403);
  const signedIn=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:input.login,password:input.password})});assert.equal(signedIn.response.status,200);
});
test('appearance is persisted, organisation-scoped, and administrator-only',async()=>{
  assert.equal((await api('/api/settings')).response.status,401);
  assert.equal((await api('/api/settings',auth(staffCookie,'PUT',{appearance:'slate'}))).response.status,403);
  assert.equal((await api('/api/settings',auth(adminCookie,'PUT',{appearance:'invalid'}))).response.status,400);
  assert.equal((await api('/api/settings',auth(adminCookie,'PUT',{appearance:'slate'}))).response.status,200);
  assert.equal((await api('/api/settings',auth(staffCookie))).body.appearance,'slate');
  assert.equal((await api('/api/settings',auth(otherCookie))).body.appearance,'srec');
  const reopened=openDatabase(filename);
  assert.equal(reopened.prepare("SELECT appearance FROM organization_settings WHERE organization_id='sme-a'").get().appearance,'slate');reopened.close();
});

test('password resets enforce scope and policy and invalidate old credentials and sessions',async()=>{
  const id=await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'reset@example.test',displayName:'Reset target',role:'staff_user',password:'correct horse battery'});
  const cookie=await signIn('reset@example.test'), path=`/api/accounts/${id}/password`;
  assert.equal((await api(path,auth(staffCookie,'POST',{password:'a new strong password'}))).response.status,403);
  assert.equal((await api(path,auth(otherCookie,'POST',{password:'a new strong password'}))).response.status,404);
  assert.equal((await api(path,auth(adminCookie,'POST',{password:'short'}))).response.status,400);
  assert.equal((await api('/api/registry',auth(cookie))).response.status,200);
  assert.equal((await api(path,auth(adminCookie,'POST',{password:'a new strong password'}))).response.status,200);
  assert.equal((await api('/api/registry',auth(cookie))).response.status,401);
  for(const [password,status] of [['correct horse battery',401],['a new strong password',200]]){
    assert.equal((await api('/api/auth/login',auth('', 'POST',{login:'reset@example.test',password}))).response.status,status);
  }
  const audit=db.prepare('SELECT action FROM account_audit WHERE account_id=?').all(id);assert.deepEqual(audit.map(x=>x.action),['password-reset']);
  const directory=await api('/api/accounts',auth(adminCookie));
  assert.equal(JSON.stringify(directory.body).includes('password'),false);
  assert.equal((await api('/api/accounts',auth(otherCookie))).body.accounts.some(x=>x.id===id),false);
});

test('administrators can disable, reactivate, and change roles without self-lockout',async()=>{
  const id=await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'access@example.test',displayName:'Access target',role:'staff_user',password:'correct horse battery'});
  const cookie=await signIn('access@example.test'), path=`/api/accounts/${id}`;
  assert.equal((await api(path,auth(staffCookie,'PATCH',{role:'administrator',status:'active'}))).response.status,403);
  assert.equal((await api(path,auth(otherCookie,'PATCH',{role:'administrator',status:'active'}))).response.status,404);
  assert.equal((await api(path,auth(adminCookie,'PATCH',{role:'invalid',status:'active'}))).response.status,400);
  assert.equal((await api(path,auth(adminCookie,'PATCH',{role:'staff_user',status:'disabled'}))).response.status,200);
  assert.equal((await api('/api/registry',auth(cookie))).response.status,401);
  assert.equal((await api('/api/auth/login',auth('','POST',{login:'access@example.test',password:'correct horse battery'}))).response.status,401);
  assert.equal((await api(path,auth(adminCookie,'PATCH',{role:'compliance_officer',status:'active'}))).response.status,200);
  const newCookie=await signIn('access@example.test');
  assert.equal((await api('/api/auth/session',auth(newCookie))).body.principal.role,'compliance_officer');
  const self=db.prepare("SELECT id FROM accounts WHERE login='admin@example.test'").get().id;
  assert.equal((await api(`/api/accounts/${self}`,auth(adminCookie,'PATCH',{role:'staff_user',status:'active'}))).response.status,400);
  assert.equal((await api(`/api/accounts/${self}`,auth(adminCookie,'PATCH',{role:'administrator',status:'disabled'}))).response.status,400);
  assert.equal((await api('/api/accounts',auth(adminCookie))).response.status,200);
});

test('fictional examples load transactionally and can be loaded twice',async()=>{
  const first=await api('/api/examples',auth(adminCookie,'POST',{}));assert.equal(first.response.status,200);assert.equal(first.body.added,3);
  assert.equal((await api('/api/examples',auth(adminCookie,'POST',{}))).body.added,0);
});
test('empty dashboard still enforces role summaries and validates dates',async()=>{
  const id=await createAccount(db,{organizationId:'empty',organizationName:'Empty',login:'empty',displayName:'Empty Staff',role:'staff_user',password:'correct horse battery'});
  const cookie=await signIn('empty');const dashboard=await api('/api/dashboard',auth(cookie));
  assert.equal(dashboard.body.risk.status,'restricted');assert.equal(dashboard.body.actions.status,'restricted');
  assert.equal((await api('/api/dashboard?asOfDate=2026-02-31',auth(cookie))).response.status,400);
});

test('assessment drafts enforce scope and revision, submit immutable explainable results',async()=>{
 const record=(await api('/api/registry',auth(adminCookie,'POST',valid))).body;
 const made=await api('/api/assessments',auth(adminCookie,'POST',{aiUseId:record.id}));assert.equal(made.response.status,201);const id=made.body.id;
 assert.equal((await api(`/api/assessments/${id}`,auth(otherCookie,'PUT',{expectedRevision:1,responses:{}}))).response.status,404);
 assert.equal((await api(`/api/assessments/${id}`,auth(staffCookie,'PUT',{expectedRevision:1,responses:{}}))).response.status,404);
 assert.equal((await api(`/api/assessments/${id}`,auth(adminCookie,'PUT',{expectedRevision:1,responses:{},submit:true}))).response.status,400);
 const responses={personalData:true,humanOversight:false,tested:true,disclosed:true};
 const saved=await api(`/api/assessments/${id}`,auth(adminCookie,'PUT',{expectedRevision:1,responses}));assert.equal(saved.body.revision,2);
 assert.equal((await api(`/api/assessments/${id}`,auth(adminCookie,'PUT',{expectedRevision:1,responses}))).response.status,409);
 const submitted=await api(`/api/assessments/${id}`,auth(adminCookie,'PUT',{expectedRevision:2,responses,submit:true}));assert.equal(submitted.body.result.outcome.id,'high');assert.ok(submitted.body.result.triggeredRules.length);
 assert.equal((await api(`/api/assessments/${id}`,auth(adminCookie,'PUT',{expectedRevision:3,responses}))).response.status,409);
 assert.equal((await api('/api/registry',auth(adminCookie))).body.records.find(r=>r.id===record.id).assessmentStatus,'Assessed');
});

test('action owners and assessment links cannot cross organisations',async()=>{
 const record=(await api('/api/registry',auth(adminCookie,'POST',valid))).body;
 const staff=db.prepare("SELECT id FROM accounts WHERE login='staff@example.test'").get();const foreign=db.prepare("SELECT id FROM accounts WHERE login='other@example.test'").get();
 const input={aiUseId:record.id,title:'Assigned review',ownerAccountId:staff.id,dueDate:'2026-10-01'};
 assert.equal((await api('/api/actions',auth(adminCookie,'POST',{...input,ownerAccountId:foreign.id}))).response.status,400);
 const made=await api('/api/actions',auth(adminCookie,'POST',input));assert.equal(made.response.status,201);assert.equal(made.body.ownerAccountId,staff.id);
 assert.ok((await api('/api/actions',auth(staffCookie))).body.actions.some(a=>a.id===made.body.id));
 assert.equal((await api('/api/actions',auth(otherCookie))).body.actions.length,0);
 assert.equal((await api('/api/actions',auth(adminCookie,'POST',{...input,assessmentId:'missing'}))).response.status,400);
});

test('policy uploads are validated, scoped, versioned and downloadable',async()=>{
 const reviewerId=db.prepare("SELECT id FROM accounts WHERE login='admin@example.test'").get().id;
 const body={title:'Fictional policy',filename:'policy.txt',mediaType:'text/plain',content:Buffer.from('Fictional usage guidance.').toString('base64'),checklist:['humanOversight'],reviewerId,reviewDue:'2026-12-01'};
 assert.equal((await api('/api/policies',auth(staffCookie,'POST',body))).response.status,403);
 assert.equal((await api('/api/policies',auth(adminCookie,'POST',{...body,filename:'../policy.txt'}))).response.status,400);
 assert.equal((await api('/api/policies',auth(adminCookie,'POST',{...body,filename:'fake.pdf',mediaType:'application/pdf'}))).response.status,400);
 const made=await api('/api/policies',auth(adminCookie,'POST',body));assert.equal(made.response.status,201);
 assert.equal((await api(`/api/policies/${made.body.id}/download`,auth(otherCookie))).response.status,404);
 const download=await api(`/api/policies/${made.body.id}/download`,auth(staffCookie));assert.equal(Buffer.from(download.body).toString(),'Fictional usage guidance.');
 const revised=await api('/api/policies',auth(adminCookie,'POST',{...body,documentId:made.body.documentId}));assert.equal(revised.body.version,2);
});

test('reminders deliver once to recipients and enforce inbox isolation',async()=>{
 const {deliverReminders}=await import('../../server/notifications.js');
 const staff=db.prepare("SELECT id FROM accounts WHERE login='staff@example.test'").get();
 const record=(await api('/api/registry',auth(adminCookie,'POST',valid))).body;
 await api('/api/actions',auth(adminCookie,'POST',{aiUseId:record.id,title:'Reminder fixture',ownerAccountId:staff.id,dueDate:'2026-09-26'}));
 const first=deliverReminders(db,new Date('2026-09-26T12:00:00Z'),'sme-a');assert.ok(first.delivered>0);
 assert.equal(deliverReminders(db,new Date('2026-09-26T12:01:00Z'),'sme-a').delivered,0);
 const inbox=(await api('/api/notifications',auth(staffCookie))).body.notifications;assert.ok(inbox.some(n=>n.title==='Reminder fixture'));
 assert.equal((await api(`/api/notifications/${inbox[0].id}/read`,auth(otherCookie,'POST',{}))).response.status,404);
 assert.equal((await api(`/api/notifications/${inbox[0].id}/read`,auth(staffCookie,'POST',{}))).response.status,200);
 assert.equal((await api('/api/reminders/settings',auth(staffCookie,'PUT',{enabled:true,upcomingDays:1,repeatDays:1}))).response.status,403);
});

test('registry decisions retain scoped change history',async()=>{
 const made=(await api('/api/registry',auth(adminCookie,'POST',valid))).body;
 assert.equal((await api(`/api/registry/${made.id}`,auth(adminCookie,'PUT',{...valid,approvalStatus:'Approved'}))).response.status,200);
 const history=(await api(`/api/registry/${made.id}/history`,auth(staffCookie))).body.events;
 assert.ok(history[0].changes.some(c=>c.field==='approvalStatus'&&c.to==='Approved'));
 assert.equal((await api(`/api/registry/${made.id}/history`,auth(otherCookie))).response.status,404);
});

test('reset accounts must change their password and old sessions are revoked',async()=>{
 const id=await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'change@example.test',displayName:'Password change',role:'staff_user',password:'correct horse battery'});
 await api(`/api/accounts/${id}/password`,auth(adminCookie,'POST',{password:'temporary long password'}));
 const signed=await api('/api/auth/login',auth('','POST',{login:'change@example.test',password:'temporary long password'}));assert.equal(signed.body.principal.mustChangePassword,true);const cookie=signed.response.headers.get('set-cookie').split(';')[0];
 assert.equal((await api('/api/registry',auth(cookie))).response.status,403);
 assert.equal((await api('/api/auth/password',auth(cookie,'POST',{currentPassword:'wrong',newPassword:'a new personal password'}))).response.status,400);
 assert.equal((await api('/api/auth/password',auth(cookie,'POST',{currentPassword:'temporary long password',newPassword:'a new personal password'}))).response.status,200);
 assert.equal((await api('/api/registry',auth(cookie))).response.status,401);
 const again=await api('/api/auth/login',auth('','POST',{login:'change@example.test',password:'a new personal password'}));assert.equal(again.body.principal.mustChangePassword,false);
});
test('sign-in throttling rejects repeated failures with a retry interval',async()=>{
 const local=createServer(createApp(db,{...http,loginMaxAttempts:2}));await new Promise(ok=>local.listen(0,'127.0.0.1',ok));
 try{for(let i=0;i<3;i++){const response=await fetch(`http://127.0.0.1:${local.address().port}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:'rate-test',password:'wrong'})});assert.equal(response.status,i<2?401:429);if(i===2)assert.ok(response.headers.get('retry-after'));await response.text();}}finally{await new Promise(ok=>local.close(ok))}
});

test('reassigning between identically named owners increments version and records account ids',async()=>{
 const ids=[];for(let i=0;i<2;i++)ids.push(await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:`same-name-${i}`,displayName:'Same name',role:'staff_user',password:'correct horse battery'}));
 const record=(await api('/api/registry',auth(adminCookie,'POST',valid))).body;
 const made=(await api('/api/actions',auth(adminCookie,'POST',{aiUseId:record.id,title:'Ownership review',ownerAccountId:ids[0],dueDate:'2026-10-01'}))).body;
 const updated=await api(`/api/actions/${made.id}`,auth(adminCookie,'PUT',{expectedVersion:1,ownerAccountId:ids[1]}));assert.equal(updated.response.status,200);assert.equal(updated.body.version,2);assert.equal(updated.body.history.at(-1).changes.at(-1).to,ids[1]);
 assert.equal((await api(`/api/actions/${made.id}`,auth(adminCookie,'PUT',{expectedVersion:1,ownerAccountId:ids[0]}))).response.status,400);
});
