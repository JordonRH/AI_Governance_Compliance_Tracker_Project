import {randomUUID} from 'node:crypto';
import {assessmentDefinition} from './governance-config.js';
import {evaluateAssessment} from './domain/risk-scoring.js';
const map=row=>({...row,definition:JSON.parse(row.definition_json),responses:JSON.parse(row.responses_json),result:row.result_json?JSON.parse(row.result_json):null,definition_json:undefined,responses_json:undefined,result_json:undefined});
export function registerAssessments(app,db,requirePermission){
 const present=(row,principal)=>({...map(row),acknowledgedPolicyIds:db.prepare('SELECT policy_id FROM policy_acknowledgements WHERE assessment_id=? AND account_id=?').all(row.id,principal.accountId).map(a=>a.policy_id)});
 app.get('/api/assessments',requirePermission('assessment:submit'),(req,res)=>{
  const rows=db.prepare('SELECT * FROM assessments WHERE organization_id=? ORDER BY updated_at DESC,id').all(req.principal.organizationId);
  res.json({assessments:rows.filter(row=>req.principal.permissions.includes('assessment:review')||row.created_by===req.principal.accountId).map(row=>present(row,req.principal))});
 });
 app.post('/api/assessments',requirePermission('assessment:submit'),(req,res)=>{
  const record=db.prepare('SELECT * FROM ai_uses WHERE id=? AND organization_id=?').get(req.body?.aiUseId,req.principal.organizationId);
  if(!record)return res.status(404).json({error:'AI use was not found.'});
  let definition;try{definition=assessmentDefinition(db,req.principal.organizationId,record.business_area)}catch(error){if(error.status)return res.status(error.status).json({error:error.message});throw error;}
  const id=randomUUID(),now=new Date().toISOString();
  db.prepare("INSERT INTO assessments VALUES (?,?,?,?,'Draft',1,?,'{}',NULL,?,?)").run(id,req.principal.organizationId,record.id,req.principal.accountId,JSON.stringify(definition),now,now);
  res.status(201).json(present(db.prepare('SELECT * FROM assessments WHERE id=?').get(id),req.principal));
 });
 app.post('/api/assessments/:id/acknowledgements',requirePermission('assessment:submit'),(req,res)=>{
  const row=db.prepare('SELECT * FROM assessments WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
  if(!row||(!req.principal.permissions.includes('assessment:review')&&row.created_by!==req.principal.accountId))return res.status(404).json({error:'Assessment was not found.'});
  if(row.state!=='Draft')return res.status(409).json({error:'Submitted acknowledgement evidence cannot be changed.'});
  const policy=JSON.parse(row.definition_json).requiredPolicies?.find(p=>p.id===req.body?.policyId);
  if(!policy||req.body?.acknowledge!==true)return res.status(400).json({error:'Explicitly acknowledge a policy version required by this assessment.'});
  db.prepare(`INSERT OR IGNORE INTO policy_acknowledgements(organization_id,assessment_id,policy_id,account_id,sha256,acknowledged_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM assessments WHERE id=? AND state='Draft')`).run(req.principal.organizationId,row.id,policy.id,req.principal.accountId,policy.sha256,new Date().toISOString(),row.id);
  if(db.prepare('SELECT state FROM assessments WHERE id=?').get(row.id).state!=='Draft')return res.status(409).json({error:'Submitted acknowledgement evidence cannot be changed.'});
  res.json(present(row,req.principal));
 });
 app.put('/api/assessments/:id',requirePermission('assessment:submit'),(req,res)=>{
  const row=db.prepare('SELECT * FROM assessments WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
  if(!row || (!req.principal.permissions.includes('assessment:review')&&row.created_by!==req.principal.accountId))return res.status(404).json({error:'Assessment was not found.'});
  if(row.state!=='Draft'||row.revision!==req.body?.expectedRevision)return res.status(409).json({error:'This assessment changed or was submitted. Reload before editing.'});
  const responses=req.body?.responses,definition=JSON.parse(row.definition_json);
  if(!responses||typeof responses!=='object'||Array.isArray(responses)||Object.entries(responses).some(([id,value])=>!definition.questions.some(q=>q.id===id)||typeof value!=='boolean'))return res.status(400).json({error:'Choose valid assessment responses.'});
  const now=new Date().toISOString();let result=null;
  if(req.body.submit===true){
   const acknowledgements=db.prepare('SELECT policy_id policyId,account_id accountId,sha256,acknowledged_at acknowledgedAt FROM policy_acknowledgements WHERE assessment_id=? AND account_id=?').all(row.id,req.principal.accountId);
   if((definition.requiredPolicies||[]).some(policy=>!acknowledgements.some(a=>a.policyId===policy.id&&a.sha256===policy.sha256)))return res.status(400).json({error:'Acknowledge each required policy version before submitting.'});
   result=evaluateAssessment(definition,responses,{category:definition.appliesTo[0],evaluatedAt:now});if(result.status!=='complete')return res.status(400).json({error:'Answer every required question before submitting.',findings:result.findings});result={...result,policyAcknowledgements:acknowledgements};}
  const updated=db.prepare("UPDATE assessments SET responses_json=?,result_json=?,state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state='Draft'").run(JSON.stringify(responses),result?JSON.stringify(result):null,result?'Submitted':'Draft',now,row.id,row.revision);
  if(!updated.changes)return res.status(409).json({error:'This assessment changed or was submitted. Reload before editing.'});
  res.json(present(db.prepare('SELECT * FROM assessments WHERE id=?').get(row.id),req.principal));
 });
}
export function assessmentSummary(db,organizationId,record){
 const row=db.prepare("SELECT id,result_json FROM assessments WHERE organization_id=? AND ai_use_id=? AND state='Submitted' ORDER BY updated_at DESC,id DESC LIMIT 1").get(organizationId,record.id);
 if(!row)return record;const result=JSON.parse(row.result_json);return {...record,assessmentStatus:'Assessed',assessmentId:row.id,riskOutcome:result.outcome};
}
