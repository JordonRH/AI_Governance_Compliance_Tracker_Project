import {randomUUID} from 'node:crypto';
import {assessmentDefinition} from './governance-config.js';
import {evaluateAssessment} from './domain/risk-scoring.js';
const map=row=>({...row,definition:JSON.parse(row.definition_json),responses:JSON.parse(row.responses_json),result:row.result_json?JSON.parse(row.result_json):null,definition_json:undefined,responses_json:undefined,result_json:undefined});
export function registerAssessments(app,db,requirePermission){
 app.get('/api/assessments',requirePermission('assessment:submit'),(req,res)=>{
  const rows=db.prepare('SELECT * FROM assessments WHERE organization_id=? ORDER BY updated_at DESC,id').all(req.principal.organizationId);
  res.json({assessments:rows.filter(row=>req.principal.permissions.includes('assessment:review')||row.created_by===req.principal.accountId).map(map)});
 });
 app.post('/api/assessments',requirePermission('assessment:submit'),(req,res)=>{
  const record=db.prepare('SELECT * FROM ai_uses WHERE id=? AND organization_id=?').get(req.body?.aiUseId,req.principal.organizationId);
  if(!record)return res.status(404).json({error:'AI use was not found.'});
  const id=randomUUID(),now=new Date().toISOString();
  db.prepare("INSERT INTO assessments VALUES (?,?,?,?,'Draft',1,?,'{}',NULL,?,?)").run(id,req.principal.organizationId,record.id,req.principal.accountId,JSON.stringify(assessmentDefinition(db,req.principal.organizationId,record.business_area)),now,now);
  res.status(201).json(map(db.prepare('SELECT * FROM assessments WHERE id=?').get(id)));
 });
 app.put('/api/assessments/:id',requirePermission('assessment:submit'),(req,res)=>{
  const row=db.prepare('SELECT * FROM assessments WHERE id=? AND organization_id=?').get(req.params.id,req.principal.organizationId);
  if(!row || (!req.principal.permissions.includes('assessment:review')&&row.created_by!==req.principal.accountId))return res.status(404).json({error:'Assessment was not found.'});
  if(row.state!=='Draft'||row.revision!==req.body?.expectedRevision)return res.status(409).json({error:'This assessment changed or was submitted. Reload before editing.'});
  const responses=req.body?.responses,definition=JSON.parse(row.definition_json);
  if(!responses||typeof responses!=='object'||Array.isArray(responses)||Object.entries(responses).some(([id,value])=>!definition.questions.some(q=>q.id===id)||typeof value!=='boolean'))return res.status(400).json({error:'Choose valid assessment responses.'});
  const now=new Date().toISOString();let result=null;
  if(req.body.submit===true){result=evaluateAssessment(definition,responses,{category:definition.appliesTo[0],evaluatedAt:now});if(result.status!=='complete')return res.status(400).json({error:'Answer every required question before submitting.',findings:result.findings});}
  db.prepare('UPDATE assessments SET responses_json=?,result_json=?,state=?,revision=revision+1,updated_at=? WHERE id=?').run(JSON.stringify(responses),result?JSON.stringify(result):null,result?'Submitted':'Draft',now,row.id);
  res.json(map(db.prepare('SELECT * FROM assessments WHERE id=?').get(row.id)));
 });
}
export function assessmentSummary(db,organizationId,record){
 const row=db.prepare("SELECT id,result_json FROM assessments WHERE organization_id=? AND ai_use_id=? AND state='Submitted' ORDER BY updated_at DESC,id DESC LIMIT 1").get(organizationId,record.id);
 if(!row)return record;const result=JSON.parse(row.result_json);return {...record,assessmentStatus:'Assessed',assessmentId:row.id,riskOutcome:result.outcome};
}
