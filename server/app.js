import {registerNotifications} from './notifications.js';
import {registerPolicies} from './policies.js';
import {registerAssessments,assessmentSummary} from './assessments.js';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { changeOwnPassword, manageAccount, createAccount, expiredSessionCookie, hasPermission, login, resolveRequestPrincipal, revokeRequestSession, sessionCookie } from './auth.js';
import { isAllowedHostHeader } from './config.js';
import { approvalStatuses, dataSensitivities } from './registry-model.js';
import { createComplianceCsv, createCompliancePdf } from './reporting.js';
import { buildDashboardSnapshot } from './domain/dashboard-summary.js';
import { createGovernanceAction, updateGovernanceAction } from './domain/governance-action.js';
import { planReminders } from './domain/reminder-planning.js';


const limits = { name: 120, owner: 120, businessArea: 120, purpose: 2000, dataDescription: 1000, dataSensitivity: 80, approvalStatus: 80 };
const samples = [
  ['Fictional customer enquiry assistant','Fictional service team','Customer service','Demonstrate an AI-assisted customer enquiry use case.','Synthetic questions and fictional product information only.','Public'],
  ['Fictional invoice helper','Fictional finance team','Finance','Demonstrate assistance with fictional invoice classification.','Synthetic invoice records only.','Confidential'],
  ['Fictional product research helper','Fictional product team','Product development','Demonstrate exploration of fictional market topics.','Public sample material and synthetic prompts only.','Public']
];
const selectFields = `id, organization_id, created_by_account_id, name, purpose, owner, business_area, data_description, data_sensitivity, approval_status, source, created_at, updated_at`;
const map = row => ({ id: row.id, organizationId: row.organization_id, name: row.name, purpose: row.purpose, owner: row.owner,
  businessArea: row.business_area, dataDescription: row.data_description, dataSensitivity: row.data_sensitivity,
  approvalStatus: row.approval_status, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at, assessmentStatus: 'Not assessed' });

function validate(body, { shadow = false } = {}) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { _request: 'A JSON object is required.' };
  const required = shadow ? ['name', 'businessArea', 'purpose', 'dataDescription', 'dataSensitivity'] : Object.keys(limits);
  for (const key of required) {
    const max = limits[key];
    if (typeof body[key] !== 'string' || !body[key].trim()) errors[key] = 'This field is required.';
    else if (body[key].trim().length > max) errors[key] = `Must be ${max} characters or fewer.`;
  }
  if (body?.dataSensitivity !== undefined && !dataSensitivities.includes(body.dataSensitivity)) errors.dataSensitivity = 'Choose a valid data sensitivity.';
  if (!shadow && body?.approvalStatus !== undefined && !approvalStatuses.includes(body.approvalStatus)) errors.approvalStatus = 'Choose a valid approval status.';
  return errors;
}
const clean = (body, defaults = {}) => Object.fromEntries(Object.keys(limits).map(key => [key, typeof body[key] === 'string' ? body[key].trim() : defaults[key]]));
export function createApp(db, http) {
  if (!db || !http?.allowedHostnames || !http?.requestBodyLimitBytes) throw new Error('Database and HTTP configuration are required.');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!isAllowedHostHeader(req.headers.host, http.allowedHostnames)) return res.status(403).json({ error: 'Host is not allowed.' });
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'${http.development ? " 'unsafe-inline'" : ''}; connect-src 'self'${http.development ? (http.secure ? ' wss://127.0.0.1:* wss://localhost:*' : ' ws://127.0.0.1:* ws://localhost:*') : ''}`,
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', (req, res, next) => {
    if (!req.headers.origin) return next();
    try {
      const origin = new URL(req.headers.origin);
      if (origin.protocol === (http.secure?'https:':'http:') && origin.host.toLowerCase() === req.headers.host.toLowerCase() && http.allowedHostnames.includes(origin.hostname.toLowerCase())) return next();
    } catch {}
    res.status(403).json({ error: 'Origin is not allowed.' });
  });
  app.use('/api/policies', express.json({limit:'1500kb',strict:true}));
  app.use('/api', express.json({ limit: http.requestBodyLimitBytes, strict: true, type: 'application/json' }));
  app.use('/api', (error, _req, res, next) => {
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Request body must contain valid JSON.' });
    next(error);
  });
  app.use('/api', (req, res, next) => {
    if (['POST','PUT','PATCH'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json.' });
    next();
  });
  app.use('/api', (req, _res, next) => { req.principal = resolveRequestPrincipal(db, req); next(); });
  app.use('/api',(req,res,next)=>{
    if(req.principal?.mustChangePassword&&!['/auth/session','/auth/logout','/auth/password','/auth/login','/health'].includes(req.path))return res.status(403).json({error:'Change your password before continuing.'});
    next();
  });
  const attempts=new Map();
  const throttle=(req,res,next)=>{
    const key=`${req.socket.remoteAddress}:${String(req.body?.login||req.principal?.accountId||'').trim().toLowerCase()}`,now=Date.now();
    for(const [k,v] of attempts)if(v.expires<=now)attempts.delete(k);
    if(attempts.size>=10000&&!attempts.has(key))return res.status(429).json({error:'Too many attempts. Try again later.'});
    const record=attempts.get(key)||{count:0,expires:now+(http.loginWindowMs||900000)};
    if(record.count>=(http.loginMaxAttempts||10))return res.status(429).set('Retry-After',String(Math.ceil((record.expires-now)/1000))).json({error:'Too many attempts. Try again later.'});
    record.count++;attempts.set(key,record);req.loginAttemptKey=key;next();
  };
  const requirePermission = permission => (req, res, next) => {
    if (!req.principal) return res.status(401).json({ error: 'Authentication is required.' });
    if (!hasPermission(req.principal, permission)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };

  registerAssessments(app,db,requirePermission);
  registerPolicies(app,db,requirePermission);
  registerNotifications(app,db,requirePermission);
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', mode: 'local-prototype' }); });
  app.get('/api/auth/session', (req, res) => res.json({ principal: req.principal }));
  app.post('/api/auth/login', throttle, async (req, res, next) => {
    try {
      const result = await login(db, req.body?.login, req.body?.password);
      if (!result) return res.status(401).json({ error: 'Login was not accepted.' });
      attempts.delete(req.loginAttemptKey);
      res.setHeader('Set-Cookie', sessionCookie(result.token, result.expiresAt,http.secure));
      res.json({ principal: result.principal });
    } catch (error) { next(error); }
  });
  app.post('/api/auth/logout', (req, res) => {
    revokeRequestSession(db, req);
    res.setHeader('Set-Cookie', expiredSessionCookie(http.secure));
    res.json({ status: 'signed-out' });
  });

  app.post('/api/auth/password',requirePermission('registry:read'),throttle,async(req,res,next)=>{
    try{await changeOwnPassword(db,req.principal,req.body?.currentPassword,req.body?.newPassword);attempts.delete(req.loginAttemptKey);res.setHeader('Set-Cookie',expiredSessionCookie(http.secure));res.json({status:'password-changed'});}catch(error){if(error.status)return res.status(error.status).json({error:error.message});next(error);}
  });
  app.get('/api/accounts/audit',requirePermission('account:manage'),(req,res)=>{
    res.json({events:db.prepare('SELECT e.id,e.action,e.created_at,a.display_name actor,t.display_name target FROM account_audit e JOIN accounts a ON a.id=e.actor_id JOIN accounts t ON t.id=e.account_id WHERE e.organization_id=? ORDER BY e.id DESC LIMIT 200').all(req.principal.organizationId)});
  });
  app.get('/api/accounts', requirePermission('account:manage'), (req,res)=>{
    const accounts=db.prepare('SELECT id,login,display_name,role,status,created_at,updated_at FROM accounts WHERE organization_id=? ORDER BY display_name,login').all(req.principal.organizationId).map(row=>({id:row.id,login:row.login,displayName:row.display_name,role:row.role,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}));
    res.json({accounts});
  });
  app.post('/api/accounts', requirePermission('account:manage'), async (req,res,next)=>{
    try{
      const id=await createAccount(db,{organizationId:req.principal.organizationId,organizationName:req.principal.organizationName,login:req.body?.login,displayName:req.body?.displayName,role:req.body?.role,password:req.body?.password});
      const row=db.prepare('SELECT id,login,display_name,role,status,created_at,updated_at FROM accounts WHERE id=?').get(id);
      res.status(201).json({id:row.id,login:row.login,displayName:row.display_name,role:row.role,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at});
    }catch(error){if(String(error.message).includes('UNIQUE constraint'))return res.status(409).json({error:'An account with that login already exists.'});if(error instanceof Error)return res.status(400).json({error:error.message});next(error);}
  });
  app.get('/api/settings', requirePermission('registry:read'), (req,res)=>{
    const row=db.prepare('SELECT appearance FROM organization_settings WHERE organization_id=?').get(req.principal.organizationId);
    res.json({appearance:row?.appearance || 'srec'});
  });
  app.put('/api/settings', requirePermission('account:manage'), (req,res)=>{
    if (!['srec','slate'].includes(req.body?.appearance)) return res.status(400).json({error:'Choose a valid appearance.'});
    db.prepare('INSERT INTO organization_settings (organization_id,appearance,updated_at) VALUES (?,?,?) ON CONFLICT(organization_id) DO UPDATE SET appearance=excluded.appearance,updated_at=excluded.updated_at')
      .run(req.principal.organizationId,req.body.appearance,new Date().toISOString());
    res.json({appearance:req.body.appearance});
  });
  app.post('/api/accounts/:id/password', requirePermission('account:manage'), async(req,res,next)=>{
    try { await manageAccount(db,req.principal,req.params.id,{kind:'password',password:req.body?.password}); res.json({status:'password-reset'}); }
    catch(error){ if(error.status) return res.status(error.status).json({error:error.message}); next(error); }
  });
  app.patch('/api/accounts/:id', requirePermission('account:manage'), async(req,res,next)=>{
    try { await manageAccount(db,req.principal,req.params.id,{kind:'access',role:req.body?.role,status:req.body?.status}); res.json({status:'updated'}); }
    catch(error){ if(error.status) return res.status(error.status).json({error:error.message}); next(error); }
  });
  app.get('/api/registry', requirePermission('registry:read'), (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const businessArea = typeof req.query.businessArea === 'string' ? req.query.businessArea.trim() : '';
    const conditions = ['organization_id = ?'], values = [req.principal.organizationId];
    if (q) { conditions.push('(name LIKE ? OR owner LIKE ? OR purpose LIKE ?)'); values.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (businessArea) { conditions.push('business_area = ?'); values.push(businessArea); }
    res.json({ records: db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC, id DESC`).all(...values).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record)) });
  });
  app.get('/api/registry/:id/history',requirePermission('registry:read'),(req,res)=>{
    if(!db.prepare('SELECT 1 FROM ai_uses WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId))return res.status(404).json({error:'AI use was not found.'});
    res.json({events:db.prepare('SELECT e.id,e.changes_json,e.created_at,a.display_name actor FROM registry_events e JOIN accounts a ON a.id=e.actor_id WHERE e.ai_use_id=? AND e.organization_id=? ORDER BY e.id DESC').all(req.params.id,req.principal.organizationId).map(e=>({...e,changes:JSON.parse(e.changes_json),changes_json:undefined}))});
  });
  app.get('/api/registry/:id', requirePermission('registry:read'), (req, res) => {
    const row = db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE id=? AND organization_id=?`).get(req.params.id, req.principal.organizationId);
    row ? res.json(assessmentSummary(db,req.principal.organizationId,map(row))) : res.status(404).json({ error: 'AI use was not found.' });
  });
  app.post('/api/registry', requirePermission('registry:create'), (req, res) => {
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body), id = randomUUID(), now = new Date().toISOString();
    db.prepare(`INSERT INTO ai_uses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registry', ?, ?)`)
      .run(id,req.principal.organizationId,req.principal.accountId,value.name,value.purpose,value.owner,value.businessArea,value.dataDescription,value.dataSensitivity,value.approvalStatus,now,now);
    res.status(201).json(map(db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE id=?`).get(id)));
  });
  app.put('/api/registry/:id', requirePermission('registry:update'), (req, res) => {
    const row = db.prepare('SELECT * FROM ai_uses WHERE id=? AND organization_id=?').get(req.params.id, req.principal.organizationId);
    if (!row) return res.status(404).json({ error: 'AI use was not found.' });
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body), now = new Date().toISOString();
    db.exec('BEGIN');try {
    db.prepare(`UPDATE ai_uses SET name=?,purpose=?,owner=?,business_area=?,data_description=?,data_sensitivity=?,approval_status=?,updated_at=? WHERE id=? AND organization_id=?`)
      .run(value.name,value.purpose,value.owner,value.businessArea,value.dataDescription,value.dataSensitivity,value.approvalStatus,now,req.params.id,req.principal.organizationId);
    const before=map(row),changes=Object.keys(limits).filter(key=>before[key]!==value[key]).map(key=>({field:key,from:before[key],to:value[key]}));
    if(changes.length)db.prepare('INSERT INTO registry_events (organization_id,ai_use_id,actor_id,changes_json,created_at) VALUES (?,?,?,?,?)').run(req.principal.organizationId,req.params.id,req.principal.accountId,JSON.stringify(changes),now);
    db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
    res.json(map(db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE id=?`).get(req.params.id)));
  });
  app.post('/api/shadow-reports', requirePermission('shadow:create'), (req, res) => {
    const errors = validate(req.body, { shadow: true });
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body, { owner: req.principal.displayName, approvalStatus: 'Not reviewed' }), id=randomUUID(), now=new Date().toISOString();
    db.prepare(`INSERT INTO ai_uses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'shadow-report', ?, ?)`)
      .run(id,req.principal.organizationId,req.principal.accountId,value.name,value.purpose,value.owner,value.businessArea,value.dataDescription,value.dataSensitivity,'Not reviewed',now,now);
    res.status(201).json({ status: 'reported', record: map(db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE id=?`).get(id)) });
  });
  app.post('/api/examples', requirePermission('registry:create'), (_req, res) => {
    const exists = db.prepare('SELECT 1 FROM ai_uses WHERE organization_id=? AND name=?'), insert = db.prepare(`INSERT INTO ai_uses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registry', ?, ?)`);
    let added=0;
    db.exec('BEGIN');
    try { for(const [name,owner,area,purpose,data,sensitivity] of samples) if(!exists.get(_req.principal.organizationId,name)){
      const now=new Date().toISOString();insert.run(randomUUID(),_req.principal.organizationId,_req.principal.accountId,name,purpose,owner,area,data,sensitivity,'Not reviewed',now,now);added++;
    }
    db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; }
    res.json({added});
  });
  app.get('/api/overview', requirePermission('registry:read'), (req, res) => {
    const records=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=?`).all(req.principal.organizationId).map(map).map(r=>assessmentSummary(db,req.principal.organizationId,r));
    const byBusinessArea={};for(const r of records)byBusinessArea[r.businessArea]=(byBusinessArea[r.businessArea]||0)+1;
    res.json({total:records.length,unassessed:records.filter(r=>r.assessmentStatus==='Not assessed').length,byBusinessArea});
  });

  const actionFromRow = row => ({ id:row.id, ownerAccountId:row.owner_account_id, aiUseId:row.ai_use_id, ...(row.assessment_id?{assessmentId:row.assessment_id}:{}), title:row.title, owner:row.owner, dueDate:row.due_date, status:row.status, version:row.version, createdAt:row.created_at, updatedAt:row.updated_at, completedAt:row.completed_at, history:JSON.parse(row.history_json) });

  app.get('/api/actions', requirePermission('registry:read'), (req,res)=>{
    const rows=db.prepare('SELECT * FROM governance_actions WHERE organization_id=? ORDER BY due_date,id').all(req.principal.organizationId);
    res.json({actions:rows.filter(row=>req.principal.role!=='staff_user'||row.owner_account_id===req.principal.accountId).map(actionFromRow)});
  });
  app.get('/api/action-owners', requirePermission('action:manage'), (req,res)=>{
    res.json({accounts:db.prepare("SELECT id,display_name displayName,role FROM accounts WHERE organization_id=? AND status='active' ORDER BY display_name").all(req.principal.organizationId)});
  });
  app.post('/api/actions', requirePermission('action:manage'), (req,res)=>{
    if(!db.prepare('SELECT 1 FROM ai_uses WHERE id=? AND organization_id=?').get(req.body?.aiUseId,req.principal.organizationId)) return res.status(400).json({error:'A visible AI use is required.'});
    const owner=req.body?.ownerAccountId?db.prepare("SELECT id,display_name FROM accounts WHERE id=? AND organization_id=? AND status='active'").get(req.body.ownerAccountId,req.principal.organizationId):null;
    if(req.body?.ownerAccountId&&!owner)return res.status(400).json({error:'Choose an active owner in your organisation.'});
    if(req.body?.assessmentId&&!db.prepare("SELECT 1 FROM assessments WHERE id=? AND ai_use_id=? AND organization_id=? AND state='Submitted'").get(req.body.assessmentId,req.body.aiUseId,req.principal.organizationId))return res.status(400).json({error:'Choose a submitted assessment for this AI use.'});
    const result=createGovernanceAction({...req.body,...(owner?{owner:owner.display_name}:{}),id:randomUUID()},{actorId:req.principal.accountId,timestamp:new Date().toISOString()});
    if(result.status==='invalid') return res.status(400).json({error:'Check the action fields.',findings:result.findings});
    const action=result.action;
    db.prepare(`INSERT INTO governance_actions (id,organization_id,ai_use_id,assessment_id,title,owner,due_date,status,version,created_at,updated_at,completed_at,history_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(action.id,req.principal.organizationId,action.aiUseId,action.assessmentId??null,action.title,action.owner,action.dueDate,action.status,action.version,action.createdAt,action.updatedAt,action.completedAt,JSON.stringify(action.history));
    if(owner)db.prepare('UPDATE governance_actions SET owner_account_id=? WHERE id=?').run(owner.id,action.id);
    res.status(201).json({...action,ownerAccountId:owner?.id||null});
  });
  app.put('/api/actions/:id', requirePermission('action:manage'), (req,res)=>{
    const row=db.prepare('SELECT * FROM governance_actions WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
    if(!row) return res.status(404).json({error:'Governance action was not found.'});
    const patch={...req.body};
    let ownerId=row.owner_account_id;
    if(patch.ownerAccountId!==undefined){const owner=db.prepare("SELECT id,display_name FROM accounts WHERE id=? AND organization_id=? AND status='active'").get(patch.ownerAccountId,req.principal.organizationId);if(!owner)return res.status(400).json({error:'Choose an active owner in your organisation.'});ownerId=owner.id;patch.owner=owner.display_name;delete patch.ownerAccountId;}
    const result=updateGovernanceAction(actionFromRow(row),patch,{actorId:req.principal.accountId,timestamp:new Date().toISOString()});
    if(result.status==='invalid') return res.status(400).json({error:'Check the action update.',findings:result.findings});
    if(result.status==='unchanged'&&ownerId===row.owner_account_id)return res.json(result.action);
    let action={...result.action};
    if(ownerId!==row.owner_account_id){
      const ownershipChange={field:'ownerAccountId',from:row.owner_account_id,to:ownerId};
      if(result.status==='unchanged'){
        action.version++;action.updatedAt=new Date().toISOString();action.history=[...action.history,{version:action.version,changedAt:action.updatedAt,changedBy:req.principal.accountId,changes:[ownershipChange]}];
      }else{action.history=action.history.map((h,i)=>i===action.history.length-1?{...h,changes:[...h.changes,ownershipChange]}:h);}
    }
    db.prepare(`UPDATE governance_actions SET title=?,owner=?,due_date=?,status=?,version=?,updated_at=?,completed_at=?,history_json=?,owner_account_id=? WHERE id=? AND organization_id=?`).run(action.title,action.owner,action.dueDate,action.status,action.version,action.updatedAt,action.completedAt,JSON.stringify(action.history),ownerId,action.id,req.principal.organizationId);
    res.json({...action,ownerAccountId:ownerId});
  });
  app.post('/api/reminders/plan', requirePermission('action:manage'), (req,res)=>{
    const items=db.prepare('SELECT id,due_date,status FROM governance_actions WHERE organization_id=?').all(req.principal.organizationId).map(row=>({id:row.id,kind:'action',dueDate:row.due_date,isClosed:row.status==='Complete'}));
    const result=planReminders(req.body?.policy,items,req.body?.context);
    res.status(result.status==='invalid'?400:200).json(result);
  });
  app.get('/api/dashboard', requirePermission('registry:read'), (req,res)=>{
    const registry=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=?`).all(req.principal.organizationId).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record));
    const areas=[...new Set(registry.map(record=>record.businessArea))].sort();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(req.query.asOfDate || new Date().toISOString().slice(0,10)) || Number.isNaN(Date.parse(req.query.asOfDate || new Date().toISOString()))) return res.status(400).json({error:'A valid date is required.'});
    if(areas.length===0) areas.push('No records');
    const records=registry.map(record=>({id:record.id,institutionId:record.organizationId,category:record.businessArea,assessmentStatus:record.assessmentStatus,...(record.riskOutcome?{riskOutcome:record.riskOutcome}:{})}));
    const actions=db.prepare('SELECT * FROM governance_actions WHERE organization_id=?').all(req.principal.organizationId).map(actionFromRow);
    const snapshot=buildDashboardSnapshot({id:req.principal.organizationId,institutionIds:[req.principal.organizationId],categories:areas,includeRiskSummary:hasPermission(req.principal,'assessment:review'),includeActionSummary:hasPermission(req.principal,'action:manage')},records,actions,{asOfDate:req.query.asOfDate||new Date().toISOString().slice(0,10)});
    const policySummary=hasPermission(req.principal,'action:manage')?{status:'available',...db.prepare("SELECT COUNT(*) total,SUM(CASE WHEN review_due < ? THEN 1 ELSE 0 END) overdue FROM policies p WHERE organization_id=? AND version=(SELECT MAX(version) FROM policies q WHERE q.document_id=p.document_id AND q.organization_id=p.organization_id)").get(req.query.asOfDate||new Date().toISOString().slice(0,10),req.principal.organizationId)}:{status:'restricted'};
    res.status(snapshot.status==='invalid'?400:200).json({...snapshot,policies:policySummary});
  });

  function reportDetails(org){
    const assessments=db.prepare("SELECT a.*,u.name ai_use_name,c.display_name author FROM assessments a JOIN ai_uses u ON u.id=a.ai_use_id JOIN accounts c ON c.id=a.created_by WHERE a.organization_id=? AND a.state='Submitted' ORDER BY a.updated_at DESC").all(org).map(a=>{const r=JSON.parse(a.result_json),d=JSON.parse(a.definition_json);return {aiUseName:a.ai_use_name,author:a.author,state:a.state,risk:r.outcome.label,definitionVersion:`${d.id}/${d.version}`,explanations:r.triggeredRules.map(x=>x.explanation).join(' '),updatedAt:a.updated_at}});
    const actions=db.prepare('SELECT a.*,u.name ai_use_name FROM governance_actions a JOIN ai_uses u ON u.id=a.ai_use_id WHERE a.organization_id=? ORDER BY due_date').all(org).map(a=>({...actionFromRow(a),aiUseName:a.ai_use_name}));
    const policies=db.prepare('SELECT p.title,p.review_due,p.reviewed_at,p.filename,p.version,p.checklist_json,p.created_at,a.display_name reviewer FROM policies p JOIN accounts a ON a.id=p.reviewer_id WHERE p.organization_id=? ORDER BY title,version DESC').all(org).map(p=>({title:p.title,reviewer:p.reviewer,reviewDue:p.review_due,reviewedAt:p.reviewed_at,filename:p.filename,version:p.version,checklist:JSON.parse(p.checklist_json).join(', '),createdAt:p.created_at}));
    return {assessments,actions,policies};
  }
  app.get('/api/reports/compliance.csv', requirePermission('report:export'), async (req,res)=>{
    const records=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=? ORDER BY name`).all(req.principal.organizationId).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record));
    res.type('text/csv').set('Content-Disposition','attachment; filename="aitrace-compliance-summary.csv"').send(createComplianceCsv(records,reportDetails(req.principal.organizationId)));
  });
  app.get('/api/reports/compliance.pdf', requirePermission('report:export'), async (req,res)=>{
    const records=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=? ORDER BY name`).all(req.principal.organizationId).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record));
    res.type('application/pdf').set('Content-Disposition','attachment; filename="aitrace-compliance-summary.pdf"').send(await createCompliancePdf(records,req.principal.organizationName,new Date().toISOString(),reportDetails(req.principal.organizationId)));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route was not found.' }));
  app.use('/api', (error, _req, res, _next) => { console.error(error.message); res.status(500).json({error:'The request could not be completed. Please try again.'}); });
  return app;
}
