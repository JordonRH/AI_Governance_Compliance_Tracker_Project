import {createCertificateStore,readTlsBundle} from '../../server/certificates.js';
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
 server=createServer(createApp(db,http,{certificates:createCertificateStore(join(directory,'certificates'))}));await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;
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
  assert.equal(dashboard.response.status,200);assert.equal(dashboard.body.actions.total,1);assert.equal(dashboard.body.actions.overdue,1);assert.equal(dashboard.body.drafts.total,0);assert.equal(dashboard.body.dueActions[0].id,created.body.id);assert.equal(dashboard.body.dueActions[0].aiUseName,'Fictional AI helper');
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
 const first=await deliverReminders(db,new Date('2026-09-26T12:00:00Z'),'sme-a');assert.ok(first.delivered>0);
 assert.equal((await deliverReminders(db,new Date('2026-09-26T12:01:00Z'),'sme-a')).delivered,0);
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


test('certificate administration is scoped, validates replacements and never returns private keys',async()=>{
 assert.equal((await api('/api/certificates')).response.status,401);
 assert.equal((await api('/api/certificates',auth(staffCookie))).response.status,403);
 assert.equal((await api('/api/certificates/generate',auth(staffCookie,'POST',{}))).response.status,403);
 const cookie=await signIn('admin@example.test');
 const made=await api('/api/certificates/generate',auth(cookie,'POST',{}));
 assert.equal(made.response.status,200);assert.equal(made.body.staged.kind,'temporary');assert.equal(made.body.staged.selfSigned,true);
 assert.equal(JSON.stringify(made.body).includes('PRIVATE KEY'),false);
 assert.equal((await api('/api/certificates',auth(otherCookie))).body.staged,null);
 const pair=readTlsBundle(made.body.bundlePath);
 const rejected=await api('/api/certificates/replace',auth(cookie,'POST',{...pair,key:'invalid'}));
 assert.equal(rejected.response.status,400);
 assert.equal((await api('/api/certificates',auth(cookie))).body.staged.fingerprint,made.body.staged.fingerprint);
 const updated=await api('/api/certificates/replace',auth(cookie,'POST',pair));assert.equal(updated.response.status,200);assert.equal(updated.body.staged.kind,'uploaded');
});

test('configuration versions preserve definitions, enforce scope and lock scoring and reject malformed workflow settings',async()=>{
  const path='/api/governance-configuration';
  assert.equal((await api(path,auth(staffCookie))).response.status,403);
  const baseline=(await api(path,auth(adminCookie))).body;
  const aiUseId=(await api('/api/registry',auth(adminCookie))).body.records[0].id;
  const old=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;
  const input={expectedVersion:baseline.version,questions:baseline.questions.map(q=>({...q,label:`Fictional wording: ${q.label}`})),customRoles:[{id:'custom-manager',name:'Fictional manager',permissions:['action:manage','assessment:review']}],workflow:{allowLinkedActions:false,mandatoryPolicyReading:false}};
  const canvas=baseline.workflowCanvas;
  for(const body of [{...input,rules:[]},{...input,workflow:{...input.workflow,mandatoryPolicyReading:"true"}},{...input,customRoles:[{id:'custom-admin',name:'Invalid',permissions:['account:manage']}]},{...input,questions:[null,...input.questions.slice(1)]},{...input,workflowCanvas:{...canvas,edges:[...canvas.edges,{id:'edge-extra',from:canvas.nodes.at(-1).id,to:canvas.nodes[0].id,label:'Cycle'}]}}])assert.equal((await api(path,auth(adminCookie,'PUT',body))).response.status,400);
  assert.equal((await api(path,auth(staffCookie,'PUT',input))).response.status,403);
  assert.equal((await api(path,auth(adminCookie,'PUT',input))).response.status,200);
  const saved=(await api(path,auth(adminCookie))).body;assert.equal(saved.workflowCanvas.nodes.length,baseline.workflowCanvas.nodes.length);assert.equal(saved.workflowCanvas.edges.length,saved.workflowCanvas.nodes.length-1);
  assert.equal((await api(path,auth(adminCookie,'PUT',input))).response.status,409);
  assert.equal((await api(path,auth(otherCookie))).body.version,0);
  const fresh=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;
  assert.equal(fresh.definition.configurationVersion,1);assert.deepEqual(fresh.definition.rules,old.definition.rules);
  assert.match(fresh.definition.questions[0].label,/Fictional wording/);
  const oldAgain=(await api('/api/assessments',auth(adminCookie))).body.assessments.find(x=>x.id===old.id);assert.deepEqual(oldAgain.definition,old.definition);
  const submitted=(await api(`/api/assessments/${fresh.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:{personalData:false,humanOversight:true,tested:true,disclosed:true}}))).body;
  assert.equal((await api('/api/actions',auth(adminCookie,'POST',{aiUseId,assessmentId:submitted.id,title:'Fictional follow-up',owner:'Fictional manager',dueDate:'2026-10-01'}))).response.status,409);
  const config=(await api(path,auth(adminCookie))).body;
  assert.equal(config.history.length,1);assert.ok(JSON.parse(config.history[0].configuration_json).assessmentDefinition.rules.length);
  assert.equal((await api(path,auth(adminCookie,'PUT',{...input,expectedVersion:1,workflow:{...input.workflow,allowLinkedActions:true}}))).response.status,200);
  const action=await api('/api/actions',auth(adminCookie,'POST',{aiUseId,assessmentId:submitted.id,title:'Fictional follow-up',owner:'Fictional manager',dueDate:'2026-10-01'}));assert.equal(action.response.status,201);assert.equal(action.body.history[0].workflowConfigurationVersion,2);
  const reopened=openDatabase(filename);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM governance_configurations').get().n,2);reopened.close();
});

test('user capabilities and version-pinned custom roles enforce access, audit changes and revoke sessions',async()=>{
  const id=await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'manager-capability@example.test',displayName:'Fictional capability manager',role:'staff_user',password:'correct horse battery'});
  let cookie=await signIn('manager-capability@example.test');const path=`/api/accounts/${id}`;
  const access={role:'staff_user',status:'active',capabilities:['report:export'],customRoleId:'custom-manager'};
  assert.equal((await api(path,auth(otherCookie,'PATCH',access))).response.status,404);
  assert.equal((await api(path,auth(staffCookie,'PATCH',access))).response.status,403);
  assert.equal((await api(path,auth(adminCookie,'PATCH',{...access,capabilities:['account:manage']}))).response.status,400);
  assert.equal((await api(path,auth(adminCookie,'PATCH',access))).response.status,200);
  assert.equal((await api('/api/registry',auth(cookie))).response.status,401);
  cookie=await signIn('manager-capability@example.test');
  const principal=(await api('/api/auth/session',auth(cookie))).body.principal;
  assert.ok(principal.permissions.includes('action:manage'));assert.ok(principal.permissions.includes('report:export'));assert.ok(!principal.permissions.includes('account:manage'));
  assert.equal((await api('/api/reports/compliance.csv',auth(cookie))).response.status,200);
  assert.equal((await api('/api/accounts',auth(cookie))).response.status,403);
  assert.ok((await api('/api/actions',auth(cookie))).body.actions.length>0);
  const config=(await api('/api/governance-configuration',auth(adminCookie))).body;
  await api('/api/governance-configuration',auth(adminCookie,'PUT',{expectedVersion:config.version,questions:config.questions,customRoles:[],workflow:config.workflow}));
  assert.ok((await api('/api/auth/session',auth(cookie))).body.principal.permissions.includes('action:manage'));
  const account=(await api('/api/accounts',auth(adminCookie))).body.accounts.find(x=>x.id===id);assert.equal(account.customRole.configurationVersion,2);assert.deepEqual(account.permissions,principal.permissions);
  assert.equal((await api(path,auth(adminCookie,'PATCH',{...access,capabilities:[],customRoleId:''}))).response.status,200);
  assert.equal((await api('/api/registry',auth(cookie))).response.status,401);cookie=await signIn('manager-capability@example.test');assert.equal((await api('/api/reports/compliance.csv',auth(cookie))).response.status,403);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM account_audit WHERE account_id=? AND action LIKE 'capabilities:%'").get(id).n,2);
});


test('staff overview counts all assigned open actions while limiting the due list',async()=>{
  const id=await createAccount(db,{organizationId:'sme-a',organizationName:'Fictional SME A',login:'overview-staff@example.test',displayName:'Fictional overview staff',role:'staff_user',password:'correct horse battery'});
  const aiUseId=(await api('/api/registry',auth(adminCookie))).body.records[0].id;
  for(let i=0;i<7;i++)assert.equal((await api('/api/actions',auth(adminCookie,'POST',{aiUseId,title:`Fictional assigned action ${i}`,ownerAccountId:id,dueDate:'2026-10-01'}))).response.status,201);
  const cookie=await signIn('overview-staff@example.test'),overview=(await api('/api/dashboard',auth(cookie))).body;
  assert.equal(overview.openActions.total,7);assert.equal(overview.dueActions.length,5);assert.ok(overview.dueActions.every(action=>action.ownerAccountId===id));
});

async function configure(change={}){
  const current=(await api('/api/governance-configuration',auth(adminCookie))).body;
  const result=await api('/api/governance-configuration',auth(adminCookie,'PUT',{expectedVersion:current.version,questions:current.questions,businessAreas:current.businessAreas||[],customRoles:current.customRoles,workflow:current.workflow,...change}));
  assert.equal(result.response.status,200,JSON.stringify(result.body));return result.body;
}
async function transitionConfiguration(version,action,cookie=adminCookie){
  const current=(await api('/api/governance-configuration',auth(adminCookie))).body;
  return api(`/api/governance-configuration/${version}/lifecycle`,auth(cookie,'POST',{action,reference:'User-directed sponsor approval assumption; fictional test.',expectedLifecycleRevision:current.lifecycleRevision}));
}
const completeResponses={personalData:false,humanOversight:true,tested:true,disclosed:true};

test('draft activation, retirement, applicability and additional requirements preserve old assessments',async()=>{
  const baseline=(await api('/api/governance-configuration',auth(adminCookie))).body;
  const aiUseId=(await api('/api/registry',auth(adminCookie,'POST',{...valid,name:'Fictional lifecycle use'}))).body.id;
  const old=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;
  try{
    const draft=await configure({activate:false,businessAreas:['Customer service'],questions:[...baseline.questions,{id:'additional-evidence',label:'Has fictional evidence been recorded?',topic:'Evidence review',required:true}],customRoles:[{id:'custom-unpublished',name:'Unpublished role',permissions:['action:manage']}]});
    assert.equal((await api('/api/governance-configuration',auth(adminCookie))).body.activeVersion,baseline.activeVersion);
    const stillOld=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;assert.equal(stillOld.definition.configurationVersion,old.definition.configurationVersion);
    const account=(await api('/api/accounts',auth(adminCookie))).body.accounts.find(a=>a.login==='overview-staff@example.test');
    assert.equal((await api(`/api/accounts/${account.id}`,auth(adminCookie,'PATCH',{role:'staff_user',status:'active',customRoleId:'custom-unpublished'}))).response.status,400);
    assert.equal((await transitionConfiguration(draft.version,'activated',staffCookie)).response.status,403);
    assert.equal((await transitionConfiguration(draft.version,'activated',otherCookie)).response.status,404);
    const before=(await api('/api/governance-configuration',auth(adminCookie))).body;
    assert.equal((await transitionConfiguration(draft.version,'activated')).response.status,200);
    assert.equal((await api(`/api/governance-configuration/${draft.version}/lifecycle`,auth(adminCookie,'POST',{action:'retired',reference:'Stale update',expectedLifecycleRevision:before.lifecycleRevision}))).response.status,409);
    assert.equal((await api('/api/governance-configuration',auth(adminCookie,'PUT',{expectedVersion:draft.version,expectedLifecycleRevision:before.lifecycleRevision,questions:draft.questions,businessAreas:draft.businessAreas,customRoles:draft.customRoles,workflow:draft.workflow,activate:true}))).response.status,409);
    const wrong=(await api('/api/registry',auth(adminCookie,'POST',{...valid,name:'Fictional excluded use',businessArea:'Finance'}))).body.id;
    assert.equal((await api('/api/assessments',auth(adminCookie,'POST',{aiUseId:wrong}))).response.status,409);
    const fresh=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;
    assert.equal(fresh.definition.questions.length,5);
    assert.equal((await api(`/api/assessments/${fresh.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,400);
    assert.equal((await api(`/api/assessments/${fresh.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:{...completeResponses,'additional-evidence':true}}))).response.status,200);
    assert.equal((await transitionConfiguration(draft.version,'retired')).response.status,200);
    assert.equal((await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).response.status,409);
    assert.equal((await api('/api/actions',auth(adminCookie,'POST',{aiUseId,title:'Paused creation',owner:'Fictional owner',dueDate:'2026-10-01'}))).response.status,409);
    assert.equal((await api(`/api/assessments/${old.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,200);
    const stored=(await api('/api/assessments',auth(adminCookie))).body.assessments.find(a=>a.id===old.id);assert.deepEqual(stored.definition,old.definition);
    assert.equal((await transitionConfiguration(draft.version,'activated')).response.status,200);
    assert.ok((await api('/api/governance-configuration',auth(adminCookie))).body.events.some(e=>e.action==='retired'&&e.reference.includes('assumption')));
  }finally{await configure({questions:baseline.questions,businessAreas:baseline.businessAreas||[],customRoles:baseline.customRoles,workflow:baseline.workflow});}
});

test('bounded submission automation creates one version-pinned follow-up action',async()=>{
 const baseline=(await api('/api/governance-configuration',auth(adminCookie))).body,aiUseId=(await api('/api/registry',auth(adminCookie,'POST',{...valid,name:'Fictional automation use'}))).body.id;
 try{
  const rule={id:'automation-test-submit',name:'Test submitted high result',event:'assessment.submitted',outcome:'',title:'Fictional automated review action',dueDays:14};
  const configured=await configure({automationRules:[rule]});
  const check=(await api('/api/governance-configuration',auth(adminCookie))).body;assert.equal(check.automationRules.length,1);const assessment=(await api('/api/assessments',auth(adminCookie,'POST',{aiUseId}))).body;
  assert.equal((await api(`/api/assessments/${assessment.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,200);
  const actions=(await api('/api/actions',auth(adminCookie))).body.actions.filter(action=>action.assessmentId===assessment.id);assert.equal(actions.length,1);assert.equal(actions[0].title,rule.title);assert.equal(actions[0].history[0].automationRuleId,rule.id);assert.equal(actions[0].workflowConfigurationVersion,configured.version);
 }finally{await configure({automationRules:baseline.automationRules||[]});}
});

test('mandatory policy receipts bind the submitting user to exact draft policy versions',async()=>{
  const baseline=(await api('/api/governance-configuration',auth(adminCookie))).body;
  const aiUseId=(await api('/api/registry',auth(adminCookie,'POST',{...valid,name:'Fictional acknowledgement use'}))).body.id;
  const legacy=(await api('/api/assessments',auth(staffCookie,'POST',{aiUseId}))).body;
  const reviewerId=(await api('/api/accounts',auth(adminCookie))).body.accounts.find(a=>a.role==='administrator').id;
  const policyBody={title:'Fictional required reading',filename:'reading.txt',mediaType:'text/plain',content:Buffer.from('Fictional policy version one.').toString('base64'),reviewerId,reviewDue:'2027-01-01',checklist:['personalData']};
  const first=(await api('/api/policies',auth(adminCookie,'POST',policyBody))).body;
  try{
    await configure({workflow:{...baseline.workflow,mandatoryPolicyReading:true}});
    const draft=(await api('/api/assessments',auth(staffCookie,'POST',{aiUseId}))).body;
    assert.ok(draft.definition.requiredPolicies.some(p=>p.id===first.id&&p.version===1));
    const second=(await api('/api/policies',auth(adminCookie,'POST',{...policyBody,documentId:first.documentId,content:Buffer.from('Fictional policy version two.').toString('base64')}))).body;
    const fresh=(await api('/api/assessments',auth(staffCookie,'POST',{aiUseId}))).body;
    assert.ok(fresh.definition.requiredPolicies.some(p=>p.id===second.id&&p.version===2));
    assert.equal((await api(`/api/assessments/${draft.id}/acknowledgements`,auth(otherCookie,'POST',{policyId:first.id,acknowledge:true}))).response.status,404);
    assert.equal((await api(`/api/assessments/${draft.id}/acknowledgements`,auth(staffCookie,'POST',{policyId:second.id,acknowledge:true}))).response.status,400);
    assert.equal((await api(`/api/assessments/${draft.id}`,auth(staffCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,400);
    for(const policy of draft.definition.requiredPolicies){
      assert.equal((await api(`/api/assessments/${draft.id}/acknowledgements`,auth(staffCookie,'POST',{policyId:policy.id,acknowledge:true}))).response.status,200);
      assert.equal((await api(`/api/assessments/${draft.id}/acknowledgements`,auth(staffCookie,'POST',{policyId:policy.id,acknowledge:true}))).response.status,200);
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM policy_acknowledgements WHERE assessment_id=?').get(draft.id).n,draft.definition.requiredPolicies.length);
    assert.equal((await api(`/api/assessments/${draft.id}`,auth(adminCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,400);
    const submitted=await api(`/api/assessments/${draft.id}`,auth(staffCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}));assert.equal(submitted.response.status,200);
    assert.equal(submitted.body.result.policyAcknowledgements.length,draft.definition.requiredPolicies.length);assert.equal(submitted.body.result.policyAcknowledgements.find(a=>a.policyId===first.id).sha256,draft.definition.requiredPolicies.find(p=>p.id===first.id).sha256);
    assert.equal((await api(`/api/assessments/${draft.id}/acknowledgements`,auth(staffCookie,'POST',{policyId:first.id,acknowledge:true}))).response.status,409);
    assert.equal((await api(`/api/assessments/${legacy.id}`,auth(staffCookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,200);
  }finally{await configure({workflow:baseline.workflow});}
});

test('action transition settings are enforced from creation snapshots after later configuration changes',async()=>{
  const baseline=(await api('/api/governance-configuration',auth(adminCookie))).body;
  const aiUseId=(await api('/api/registry',auth(adminCookie))).body.records[0].id;
  const body={aiUseId,title:'Fictional workflow action',owner:'Fictional owner',dueDate:'2026-10-01'};
  const legacy=(await api('/api/actions',auth(adminCookie,'POST',body))).body;
  try{
    await configure({workflow:{...baseline.workflow,requireInProgressBeforeCompletion:true,allowReopen:false}});
    const strict=(await api('/api/actions',auth(adminCookie,'POST',body))).body;
    await configure({workflow:baseline.workflow});
    assert.equal((await api(`/api/actions/${strict.id}`,auth(adminCookie,'PUT',{expectedVersion:1,status:'Complete'}))).response.status,400);
    assert.equal((await api(`/api/actions/${strict.id}`,auth(adminCookie,'PUT',{expectedVersion:1,status:'In Progress'}))).response.status,200);
    assert.equal((await api(`/api/actions/${strict.id}`,auth(adminCookie,'PUT',{expectedVersion:2,status:'Complete'}))).response.status,200);
    assert.equal((await api(`/api/actions/${strict.id}`,auth(adminCookie,'PUT',{expectedVersion:3,status:'In Progress'}))).response.status,400);
    assert.equal((await api(`/api/actions/${legacy.id}`,auth(adminCookie,'PUT',{expectedVersion:1,status:'Complete'}))).response.status,200);
    assert.equal((await api(`/api/actions/${legacy.id}`,auth(adminCookie,'PUT',{expectedVersion:2,status:'In Progress'}))).response.status,200);
  }finally{await configure({workflow:baseline.workflow});}
});

test('historical report and exports reconstruct captured edits, submissions and policy reviews by date',async()=>{
  await createAccount(db,{organizationId:'history-sme',organizationName:'Fictional history SME',login:'history@example.test',displayName:'Fictional historian',role:'administrator',password:'correct horse battery'});
  const cookie=await signIn('history@example.test'),reviewerId=db.prepare("SELECT id FROM accounts WHERE login='history@example.test'").get().id;
  // Controlled capture timestamps belong only to this isolated test organisation.
  db.prepare('UPDATE reporting_coverage SET started_at=? WHERE organization_id=?').run('2026-01-01T00:00:00.000Z','history-sme');
  const stamp=(entity,id,date)=>db.prepare('UPDATE reporting_history SET recorded_at=? WHERE id=(SELECT MAX(id) FROM reporting_history WHERE organization_id=? AND entity=? AND record_id=?)').run(`${date}T12:00:00.000Z`,'history-sme',entity,id);
  const record=(await api('/api/registry',auth(cookie,'POST',{...valid,name:'Fictional original name'}))).body;stamp('ai_uses',record.id,'2026-01-10');
  const assessment=(await api('/api/assessments',auth(cookie,'POST',{aiUseId:record.id}))).body;stamp('assessments',assessment.id,'2026-01-10');
  const action=(await api('/api/actions',auth(cookie,'POST',{aiUseId:record.id,title:'Fictional historic action',owner:'Fictional owner',dueDate:'2026-01-09'}))).body;stamp('governance_actions',action.id,'2026-01-10');
  const policy=(await api('/api/policies',auth(cookie,'POST',{title:'Fictional historical policy',filename:'history.txt',mediaType:'text/plain',content:Buffer.from('Fictional policy.').toString('base64'),reviewerId,reviewDue:'2026-01-10',checklist:['personalData']}))).body;stamp('policies',policy.id,'2026-01-10');
  assert.equal((await api(`/api/registry/${record.id}`,auth(cookie,'PUT',{...valid,name:'Fictional revised name'}))).response.status,200);stamp('ai_uses',record.id,'2026-01-11');
  assert.equal((await api(`/api/assessments/${assessment.id}`,auth(cookie,'PUT',{expectedRevision:1,submit:true,responses:completeResponses}))).response.status,200);stamp('assessments',assessment.id,'2026-01-11');
  assert.equal((await api(`/api/actions/${action.id}`,auth(cookie,'PUT',{expectedVersion:1,status:'Complete'}))).response.status,200);stamp('governance_actions',action.id,'2026-01-11');
  assert.equal((await api(`/api/policies/${policy.id}/review`,auth(cookie,'POST',{reviewDue:'2027-01-01'}))).response.status,200);stamp('policies',policy.id,'2026-01-11');
  const historical=(await api('/api/reports/snapshot?asOfDate=2026-01-10',auth(cookie))).body;
  assert.equal(historical.records[0].name,'Fictional original name');assert.equal(historical.registry.notAssessed,1);assert.equal(historical.actions.outstanding,1);assert.equal(historical.actions.overdue,1);assert.equal(historical.details.policies[0].reviewedAt,null);assert.equal(historical.details.policies[0].reviewDue,'2026-01-10');
  assert.equal(historical.reports.find(r=>r.id==='assessments').buckets.find(b=>b.label==='Draft').count,1);
  assert.equal(historical.reports.find(r=>r.id==='policies').buckets.find(b=>b.label==='Due today').count,1);
  const period=(await api('/api/reports/snapshot?fromDate=2026-01-10&toDate=2026-01-11',auth(cookie))).body;assert.equal(period.period.fromDate,'2026-01-10');assert.equal(period.period.toDate,'2026-01-11');assert.equal(period.period.reports.find(r=>r.id==='actions').change,0);assert.equal((await api('/api/reports/snapshot?fromDate=2026-01-11&toDate=2026-01-10',auth(cookie))).response.status,400);
  const newer=(await api('/api/reports/snapshot?asOfDate=2026-01-11',auth(cookie))).body;
  assert.equal(newer.records[0].name,'Fictional revised name');assert.equal(newer.registry.notAssessed,0);assert.equal(newer.actions.outstanding,0);assert.equal(newer.details.policies[0].reviewDue,'2027-01-01');
  assert.equal(newer.reports.find(r=>r.id==='assessments').buckets.find(b=>b.label==='Submitted').count,1);
  assert.equal(newer.reports.find(r=>r.id==='actions').buckets.find(b=>b.label==='Complete').count,1);
  const csv=await api('/api/reports/compliance.csv?asOfDate=2026-01-10',auth(cookie));assert.equal(csv.response.status,200);const text=Buffer.from(csv.body).toString();assert.match(text,/As at 2026-01-10 UTC/);assert.match(text,/Fictional original name/);assert.doesNotMatch(text,/Fictional revised name/);assert.match(text,/Not Started/);
  const pdf=await api('/api/reports/compliance.pdf?asOfDate=2026-01-10',auth(cookie));assert.equal(pdf.response.status,200);assert.equal(Buffer.from(pdf.body).subarray(0,4).toString(),'%PDF');
  assert.equal((await api('/api/reports/snapshot?asOfDate=2025-12-31',auth(cookie))).response.status,400);
  assert.equal((await api('/api/reports/compliance.csv?asOfDate=2026-02-30',auth(cookie))).response.status,400);
  assert.equal((await api('/api/reports/snapshot?asOfDate=2099-01-01',auth(cookie))).response.status,400);
  assert.equal((await api('/api/reports/snapshot',auth(staffCookie))).response.status,403);
  assert.equal((await api('/api/reports/snapshot',auth(otherCookie))).body.records.some(r=>r.id===record.id),false);
  const reopen=openDatabase(filename);assert.equal(reopen.prepare('SELECT COUNT(*) n FROM reporting_history WHERE organization_id=?').get('history-sme').n,8);reopen.close();
});

test('mandatory acknowledgement blocks new drafts when no policy is linked',async()=>{
  await createAccount(db,{organizationId:'no-policy-sme',organizationName:'Fictional no-policy SME',login:'no-policy@example.test',displayName:'Fictional policy administrator',role:'administrator',password:'correct horse battery'});
  const cookie=await signIn('no-policy@example.test'),config=(await api('/api/governance-configuration',auth(cookie))).body;
  const record=(await api('/api/registry',auth(cookie,'POST',{...valid,name:'Fictional no-policy use'}))).body;
  assert.equal((await api('/api/governance-configuration',auth(cookie,'PUT',{expectedVersion:config.version,questions:config.questions,customRoles:config.customRoles,workflow:{...config.workflow,mandatoryPolicyReading:true}}))).response.status,200);
  const draft=await api('/api/assessments',auth(cookie,'POST',{aiUseId:record.id}));assert.equal(draft.response.status,409);assert.match(draft.body.error,/no current policy is linked/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM assessments WHERE organization_id=?').get('no-policy-sme').n,0);
});
test('selected report exports validate the view and use scoped historical counts',async()=>{
  const cookie=await signIn('history@example.test');
  for(const id of ['registry','assessments','actions','policies','risk','areas']){
    const csv=await api(`/api/reports/compliance.csv?asOfDate=2026-01-10&report=${id}`,auth(cookie));assert.equal(csv.response.status,200);assert.match(Buffer.from(csv.body).toString(),/2026-01-10 UTC/);
    const pdf=await api(`/api/reports/compliance.pdf?asOfDate=2026-01-10&report=${id}`,auth(cookie));assert.equal(pdf.response.status,200);assert.equal(Buffer.from(pdf.body).subarray(0,5).toString(),'%PDF-');
  }
  const csv=await api('/api/reports/compliance.csv?asOfDate=2026-01-10&report=assessments',auth(cookie));assert.match(Buffer.from(csv.body).toString(),/"Draft","1","100"/);assert.doesNotMatch(Buffer.from(csv.body).toString(),/Fictional historic action/);
  assert.equal((await api('/api/reports/compliance.csv?report=unknown',auth(cookie))).response.status,400);
  assert.equal((await api('/api/reports/compliance.pdf?report=registry&report=actions',auth(cookie))).response.status,400);
  assert.equal((await api('/api/reports/compliance.csv?report=registry',auth(staffCookie))).response.status,403);
  const other=await api('/api/reports/compliance.csv?report=registry',auth(otherCookie));assert.equal(other.response.status,200);assert.doesNotMatch(Buffer.from(other.body).toString(),/Fictional original name|Fictional revised name/);
});
