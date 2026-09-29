import {demoDefinition} from './assessment-definition.js';

export const capabilities = ['registry:create','registry:update','assessment:review','action:manage','report:export'];
export const defaults = () => ({questions:demoDefinition('All').questions.map(({id,label})=>({id,label})),customRoles:[],workflow:{allowLinkedActions:true,mandatoryPolicyReading:false}});
export function currentConfiguration(db,organizationId){
  const row=db.prepare('SELECT * FROM governance_configurations WHERE organization_id=? ORDER BY version DESC LIMIT 1').get(organizationId);
  return row?{version:row.version,...JSON.parse(row.configuration_json)}:{version:0,...defaults()};
}
export function assessmentDefinition(db,organizationId,category){
  const config=currentConfiguration(db,organizationId),definition=config.assessmentDefinition||demoDefinition(category);
  definition.appliesTo=[category];
  definition.version=String(config.version+1);
  definition.configurationVersion=config.version;
  definition.questions=definition.questions.map(q=>({...q,label:config.questions.find(x=>x.id===q.id).label}));
  return definition;
}
export function registerGovernanceConfiguration(app,db,requirePermission){
  app.get('/api/governance-configuration',requirePermission('account:manage'),(req,res)=>res.json({...currentConfiguration(db,req.principal.organizationId),history:db.prepare('SELECT version,actor_id,created_at,configuration_json FROM governance_configurations WHERE organization_id=? ORDER BY version DESC').all(req.principal.organizationId)}));
  app.put('/api/governance-configuration',requirePermission('account:manage'),(req,res)=>{
    const input=req.body,base=defaults();
    const invalid=()=>res.status(400).json({error:'Use the fixed questions, at most 12 named capability roles, and supported workflow settings. Scoring and mandatory reading are locked.'});
    if(!input||Object.keys(input).some(k=>!['expectedVersion','questions','customRoles','workflow'].includes(k)))return invalid();
    if(!Array.isArray(input.questions)||input.questions.length!==base.questions.length||base.questions.some(q=>input.questions.filter(x=>x?.id===q.id).length!==1)||input.questions.some(q=>!q||Object.keys(q).some(k=>!['id','label'].includes(k))||typeof q.label!=='string'||!q.label.trim()||q.label.length>240))return invalid();
    if(!Array.isArray(input.customRoles)||input.customRoles.length>12||input.customRoles.some(r=>!r||Object.keys(r).some(k=>!['id','name','permissions'].includes(k))||typeof r.id!=='string'||!/^custom-[a-z0-9-]{1,40}$/.test(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!Array.isArray(r.permissions)||r.permissions.some(p=>!capabilities.includes(p))||new Set(r.permissions).size!==r.permissions.length)||new Set(input.customRoles.map(r=>r.id)).size!==input.customRoles.length)return invalid();
    if(!input.workflow||Object.keys(input.workflow).some(k=>!['allowLinkedActions','mandatoryPolicyReading'].includes(k))||typeof input.workflow.allowLinkedActions!=='boolean'||input.workflow.mandatoryPolicyReading!==false)return invalid();
    db.exec('BEGIN IMMEDIATE');
    try{
      const previous=currentConfiguration(db,req.principal.organizationId);
      if(input.expectedVersion!==previous.version){db.exec('ROLLBACK');return res.status(409).json({error:'Configuration changed. Reload before saving.'});}
      const definition=demoDefinition('All');
      definition.version=String(previous.version+2);
      definition.configurationVersion=previous.version+1;
      definition.questions=definition.questions.map(q=>({...q,label:input.questions.find(x=>x.id===q.id).label.trim()}));
      const configuration={questions:input.questions,customRoles:input.customRoles,workflow:input.workflow,assessmentDefinition:definition},now=new Date().toISOString();
      db.prepare('INSERT INTO governance_configurations VALUES (?,?,?,?,?)').run(req.principal.organizationId,previous.version+1,JSON.stringify(configuration),req.principal.accountId,now);
      // Assignments pin their capability snapshot; changing a template never silently changes access.
      db.exec('COMMIT');res.json({version:previous.version+1,...configuration});
    }catch(error){db.exec('ROLLBACK');throw error;}
  });
}
