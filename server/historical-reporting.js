import {buildReportAnalytics} from './domain/report-analytics.js';
import {isDateOnly} from './domain/validation.js';

export function historicalReport(db,organizationId,date){
  const fail=(message)=>{throw Object.assign(new Error(message),{status:400})};
  if(!isDateOnly(date))fail('Choose a valid report date.');
  const coverage=db.prepare('SELECT started_at FROM reporting_coverage WHERE organization_id=?').get(organizationId)?.started_at;
  if(!coverage||date<coverage.slice(0,10))fail(`Historical reporting is available from ${coverage?.slice(0,10)||'the organisation capture start'}; earlier states were not captured.`);
  if(date>new Date().toISOString().slice(0,10))fail('Historical report dates cannot be in the future.');
  const cutoff=`${date}T23:59:59.999Z`;
  const rows=db.prepare(`SELECT entity,record_json,deleted FROM (
    SELECT *,ROW_NUMBER() OVER(PARTITION BY entity,record_id ORDER BY recorded_at DESC,id DESC) position
    FROM reporting_history WHERE organization_id=? AND recorded_at<=?
  ) WHERE position=1`).all(organizationId,cutoff).filter(row=>!row.deleted);
  const entities=entity=>rows.filter(row=>row.entity===entity).map(row=>JSON.parse(row.record_json));
  const uses=entities('ai_uses'),assessments=entities('assessments').filter(row=>row.state==='Submitted').sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||b.id.localeCompare(a.id));
  const name=id=>uses.find(row=>row.id===id)?.name||'AI use';
  const records=uses.map(row=>{
    const assessment=assessments.find(a=>a.ai_use_id===row.id),result=assessment?JSON.parse(assessment.result_json):null;
    return {id:row.id,name:row.name,purpose:row.purpose,owner:row.owner,businessArea:row.business_area,dataSensitivity:row.data_sensitivity,approvalStatus:row.approval_status,source:row.source,updatedAt:row.updated_at,assessmentStatus:assessment?'Assessed':'Not assessed',riskOutcome:result?.outcome};
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const actions=entities('governance_actions').map(row=>({id:row.id,title:row.title,aiUseName:name(row.ai_use_id),owner:row.owner,dueDate:row.due_date,status:row.status,version:row.version,updatedAt:row.updated_at}));
  const details={asOfDate:date,coverageStart:coverage,assessments:assessments.map(row=>{
    const result=JSON.parse(row.result_json),definition=JSON.parse(row.definition_json);
    return {aiUseName:name(row.ai_use_id),author:row.created_by,state:row.state,risk:result.outcome.label,definitionVersion:`${definition.id}/${definition.version}`,explanations:result.triggeredRules.map(rule=>rule.explanation).join(' '),updatedAt:row.updated_at};
  }),actions,policies:entities('policies').map(row=>({title:row.title,reviewer:row.reviewer_id,reviewDue:row.review_due,reviewedAt:row.reviewed_at,filename:row.filename,version:row.version,checklist:JSON.parse(row.checklist_json).join(', '),createdAt:row.created_at}))};
  const reports=buildReportAnalytics({records,assessments:entities('assessments'),actions,policies:entities('policies'),date});
  return {asOfDate:date,coverageStart:coverage,records,details,reports,registry:{total:records.length,notAssessed:records.filter(row=>row.assessmentStatus==='Not assessed').length},actions:{status:'available',outstanding:actions.filter(row=>row.status!=='Complete').length,overdue:actions.filter(row=>row.status!=='Complete'&&row.dueDate<date).length}};
}

export function historicalPeriodReport(db,organizationId,fromDate,toDate){
  const fail=message=>{throw Object.assign(new Error(message),{status:400})};
  if(!isDateOnly(fromDate)||!isDateOnly(toDate))fail('Choose valid report start and end dates.');
  if(fromDate>toDate)fail('The report start date must be on or before the end date.');
  const start=historicalReport(db,organizationId,fromDate),end=historicalReport(db,organizationId,toDate);
  const period={fromDate,toDate,reports:end.reports.map(report=>{const initial=start.reports.find(item=>item.id===report.id);return {id:report.id,title:report.title,totalAtStart:initial?.total??0,totalAtEnd:report.total,change:report.total-(initial?.total??0),buckets:report.buckets.map(bucket=>{const before=initial?.buckets.find(item=>item.label===bucket.label)?.count??0;return {label:bucket.label,countAtStart:before,countAtEnd:bucket.count,change:bucket.count-before}})}})};
  return {...end,period};
}
