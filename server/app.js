import {registerAssessments,assessmentSummary} from './assessments.js';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { manageAccount, createAccount, expiredSessionCookie, hasPermission, login, resolveRequestPrincipal, revokeRequestSession, sessionCookie } from './auth.js';
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
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'${http.development ? " 'unsafe-inline'" : ''}; connect-src 'self'${http.development ? ' ws://127.0.0.1:* ws://localhost:*' : ''}`,
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', (req, res, next) => {
    if (!req.headers.origin) return next();
    try {
      const origin = new URL(req.headers.origin);
      if (origin.protocol === 'http:' && origin.host.toLowerCase() === req.headers.host.toLowerCase() && http.allowedHostnames.includes(origin.hostname.toLowerCase())) return next();
    } catch {}
    res.status(403).json({ error: 'Origin is not allowed.' });
  });
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
  const requirePermission = permission => (req, res, next) => {
    if (!req.principal) return res.status(401).json({ error: 'Authentication is required.' });
    if (!hasPermission(req.principal, permission)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };

  registerAssessments(app,db,requirePermission);
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', mode: 'local-prototype' }); });
  app.get('/api/auth/session', (req, res) => res.json({ principal: req.principal }));
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const result = await login(db, req.body?.login, req.body?.password);
      if (!result) return res.status(401).json({ error: 'Login was not accepted.' });
      res.setHeader('Set-Cookie', sessionCookie(result.token, result.expiresAt));
      res.json({ principal: result.principal });
    } catch (error) { next(error); }
  });
  app.post('/api/auth/logout', (req, res) => {
    revokeRequestSession(db, req);
    res.setHeader('Set-Cookie', expiredSessionCookie());
    res.json({ status: 'signed-out' });
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
  app.get('/api/registry/:id', requirePermission('registry:read'), (req, res) => {
    const row = db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE id=? AND organization_id=?`).get(req.params.id, req.principal.organizationId);
    row ? res.json(map(row)) : res.status(404).json({ error: 'AI use was not found.' });
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
    const row = db.prepare('SELECT created_by_account_id FROM ai_uses WHERE id=? AND organization_id=?').get(req.params.id, req.principal.organizationId);
    if (!row) return res.status(404).json({ error: 'AI use was not found.' });
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    const value = clean(req.body), now = new Date().toISOString();
    db.prepare(`UPDATE ai_uses SET name=?,purpose=?,owner=?,business_area=?,data_description=?,data_sensitivity=?,approval_status=?,updated_at=? WHERE id=? AND organization_id=?`)
      .run(value.name,value.purpose,value.owner,value.businessArea,value.dataDescription,value.dataSensitivity,value.approvalStatus,now,req.params.id,req.principal.organizationId);
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
    const total=db.prepare('SELECT COUNT(*) count FROM ai_uses WHERE organization_id=?').get(req.principal.organizationId).count;
    const byBusinessArea={};for(const row of db.prepare('SELECT business_area,COUNT(*) count FROM ai_uses WHERE organization_id=? GROUP BY business_area').all(req.principal.organizationId))byBusinessArea[row.business_area]=row.count;
    res.json({total,unassessed:total,byBusinessArea});
  });

  const actionFromRow = row => ({ id:row.id, aiUseId:row.ai_use_id, ...(row.assessment_id?{assessmentId:row.assessment_id}:{}), title:row.title, owner:row.owner, dueDate:row.due_date, status:row.status, version:row.version, createdAt:row.created_at, updatedAt:row.updated_at, completedAt:row.completed_at, history:JSON.parse(row.history_json) });

  app.get('/api/actions', requirePermission('registry:read'), (req,res)=>{
    const rows=db.prepare('SELECT * FROM governance_actions WHERE organization_id=? ORDER BY due_date,id').all(req.principal.organizationId);
    res.json({actions:rows.map(actionFromRow)});
  });
  app.post('/api/actions', requirePermission('action:manage'), (req,res)=>{
    if(!db.prepare('SELECT 1 FROM ai_uses WHERE id=? AND organization_id=?').get(req.body?.aiUseId,req.principal.organizationId)) return res.status(400).json({error:'A visible AI use is required.'});
    const result=createGovernanceAction({...req.body,id:randomUUID()},{actorId:req.principal.accountId,timestamp:new Date().toISOString()});
    if(result.status==='invalid') return res.status(400).json({error:'Check the action fields.',findings:result.findings});
    const action=result.action;
    db.prepare(`INSERT INTO governance_actions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(action.id,req.principal.organizationId,action.aiUseId,action.assessmentId??null,action.title,action.owner,action.dueDate,action.status,action.version,action.createdAt,action.updatedAt,action.completedAt,JSON.stringify(action.history));
    res.status(201).json(action);
  });
  app.put('/api/actions/:id', requirePermission('action:manage'), (req,res)=>{
    const row=db.prepare('SELECT * FROM governance_actions WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
    if(!row) return res.status(404).json({error:'Governance action was not found.'});
    const result=updateGovernanceAction(actionFromRow(row),req.body,{actorId:req.principal.accountId,timestamp:new Date().toISOString()});
    if(result.status==='invalid') return res.status(400).json({error:'Check the action update.',findings:result.findings});
    if(result.status==='unchanged') return res.json(result.action);
    const action=result.action;
    db.prepare(`UPDATE governance_actions SET title=?,owner=?,due_date=?,status=?,version=?,updated_at=?,completed_at=?,history_json=? WHERE id=? AND organization_id=?`).run(action.title,action.owner,action.dueDate,action.status,action.version,action.updatedAt,action.completedAt,JSON.stringify(action.history),action.id,req.principal.organizationId);
    res.json(action);
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
    res.status(snapshot.status==='invalid'?400:200).json(snapshot);
  });

  app.get('/api/reports/compliance.csv', requirePermission('report:export'), (req,res)=>{
    const records=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=? ORDER BY name`).all(req.principal.organizationId).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record));
    res.type('text/csv').set('Content-Disposition','attachment; filename="aitrace-compliance-summary.csv"').send(createComplianceCsv(records));
  });
  app.get('/api/reports/compliance.pdf', requirePermission('report:export'), (req,res)=>{
    const records=db.prepare(`SELECT ${selectFields} FROM ai_uses WHERE organization_id=? ORDER BY name`).all(req.principal.organizationId).map(map).map(record=>assessmentSummary(db,req.principal.organizationId,record));
    res.type('application/pdf').set('Content-Disposition','attachment; filename="aitrace-compliance-summary.pdf"').send(createCompliancePdf(records,req.principal.organizationName));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route was not found.' }));
  app.use('/api', (error, _req, res, _next) => { console.error(error.message); res.status(500).json({error:'The request could not be completed. Please try again.'}); });
  return app;
}
