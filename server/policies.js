import {randomUUID,createHash} from 'node:crypto';
import {isDateOnly} from './domain/validation.js';
import {demoDefinition} from './assessment-definition.js';
const columns='id,document_id,version,title,filename,media_type,sha256,checklist_json,reviewer_id,review_due,reviewed_at,created_at';
export function registerPolicies(app,db,requirePermission){
 app.get('/api/policies',requirePermission('registry:read'),(req,res)=>{
  const policies=db.prepare(`SELECT ${columns} FROM policies WHERE organization_id=? ORDER BY title,version DESC`).all(req.principal.organizationId).map(r=>({...r,checklist:JSON.parse(r.checklist_json),checklist_json:undefined}));
  res.json({policies,questions:demoDefinition('demo').questions.map(q=>({id:q.id,label:q.label})),maxBytes:1048576});
 });
 app.post('/api/policies',requirePermission('action:manage'),(req,res)=>{
  const b=req.body;
  if(!b||typeof b.title!=='string'||!b.title.trim()||b.title.length>160||typeof b.filename!=='string'||!/^[\w .()-]{1,120}$/.test(b.filename)||typeof b.content!=='string'||!isDateOnly(b.reviewDue))return res.status(400).json({error:'Supply a title, safe filename, file and valid review date.'});
  const content=Buffer.from(b.content,'base64');
  if(content.length===0||content.length>1048576||content.toString('base64')!==b.content)return res.status(400).json({error:'Choose a file between 1 byte and 1 MiB.'});
  const pdf=b.mediaType==='application/pdf'&&b.filename.toLowerCase().endsWith('.pdf')&&content.subarray(0,5).toString()==='%PDF-';
  let plain=false;try{plain=b.mediaType==='text/plain'&&b.filename.toLowerCase().endsWith('.txt')&&!new TextDecoder('utf-8',{fatal:true}).decode(content).includes('\0')}catch{}
  if(!pdf&&!plain)return res.status(400).json({error:'Only PDF files with a PDF signature or UTF-8 text files are supported.'});
  const questions=demoDefinition('demo').questions;
  if(!Array.isArray(b.checklist)||b.checklist.some(id=>!questions.some(q=>q.id===id))||new Set(b.checklist).size!==b.checklist.length)return res.status(400).json({error:'Choose valid checklist links.'});
  if(!db.prepare("SELECT 1 FROM accounts WHERE id=? AND organization_id=? AND status='active'").get(b.reviewerId,req.principal.organizationId))return res.status(400).json({error:'Choose an active reviewer in your organisation.'});
  const previous=b.documentId?db.prepare('SELECT version FROM policies WHERE document_id=? AND organization_id=? ORDER BY version DESC LIMIT 1').get(b.documentId,req.principal.organizationId):null;
  if(b.documentId&&!previous)return res.status(404).json({error:'Policy document was not found.'});
  const id=randomUUID(),documentId=b.documentId||id,version=(previous?.version||0)+1;
  db.prepare('INSERT INTO policies VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?)').run(id,req.principal.organizationId,documentId,version,b.title.trim(),b.filename,b.mediaType,content,createHash('sha256').update(content).digest('hex'),JSON.stringify(b.checklist),b.reviewerId,b.reviewDue,req.principal.accountId,new Date().toISOString());
  res.status(201).json({id,documentId,version});
 });
 app.get('/api/policies/:id/download',requirePermission('registry:read'),(req,res)=>{
  const row=db.prepare('SELECT filename,media_type,content FROM policies WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
  if(!row)return res.status(404).json({error:'Policy was not found.'});
  res.type(row.media_type).set('Content-Disposition',`attachment; filename="${row.filename}"`).send(Buffer.from(row.content));
 });
 app.post('/api/policies/:id/review',requirePermission('action:manage'),(req,res)=>{
  if(!isDateOnly(req.body?.reviewDue)||req.body.reviewDue<=new Date().toISOString().slice(0,10))return res.status(400).json({error:'Choose a future next-review date.'});
  const row=db.prepare('SELECT * FROM policies WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
  if(!row)return res.status(404).json({error:'Policy was not found.'});
  db.prepare('UPDATE policies SET reviewed_at=?,review_due=? WHERE id=?').run(new Date().toISOString(),req.body.reviewDue,row.id);
  res.json({status:'reviewed'});
 });
}
