import {demoDefinition} from '../assessment-definition.js';
import {approvalStatuses} from '../registry-model.js';

function report(id,title,description,unit,rows,statuses=[]) {
  const labels=[...new Set([...statuses,...rows.map(row=>row.status)])];
  const buckets=labels.map(label=>({label,count:rows.filter(row=>row.status===label).length}));
  return {id,title,description,unit,total:rows.length,buckets,rows};
}

// Inputs must already be reconstructed at the same organisation-scoped cutoff.
export function buildReportAnalytics({records,assessments,actions,policies,date}) {
  const useById=new Map(records.map(row=>[row.id,row]));
  const assessmentRows=assessments.map(row=>({id:row.id,name:useById.get(row.ai_use_id)?.name||'AI use',status:row.state,area:useById.get(row.ai_use_id)?.businessArea||'',owner:row.created_by,updatedAt:row.updated_at}));
  const latestPolicies=new Map();
  for(const row of policies){const prior=latestPolicies.get(row.document_id);if(!prior||row.version>prior.version)latestPolicies.set(row.document_id,row)}
  const policyRows=[...latestPolicies.values()].map(row=>({id:row.id,name:row.title,status:row.review_due<date?'Overdue':row.review_due===date?'Due today':row.reviewed_at?'Reviewed':'Review pending',owner:row.reviewer_id,dueDate:row.review_due,version:row.version}));
  const registryRows=records.map(row=>({id:row.id,name:row.name,status:row.approvalStatus,area:row.businessArea,owner:row.owner,updatedAt:row.updatedAt}));
  return [
    report('registry','Registry approvals','All recorded AI uses, grouped by their recorded approval decision. Disclosure does not imply approval.','AI uses',registryRows,approvalStatuses),
    report('assessments','Assessments','All assessment records, including drafts and repeat assessments of the same AI use.','assessments',assessmentRows,['Draft','Submitted']),
    report('actions','Actions','All follow-up actions, grouped by progress. Overdue work remains in its recorded progress status.','actions',actions.map(row=>({...row,name:row.title})),['Not Started','In Progress','Complete']),
    report('policies','Policy reviews','The latest captured version of each policy document. Due and overdue reviews take precedence over an earlier review receipt. Older versions remain in the full governance export.','policy documents',policyRows,['Review pending','Due today','Overdue','Reviewed']),
    report('risk','Risk outcomes','One result per AI use, using its latest submitted assessment. Drafts do not replace a submitted result. Outcomes use synthetic demonstration scoring.','AI uses',registryRows.map((row,index)=>({...row,status:records[index].riskOutcome?.label||'Not assessed'})),['Not assessed',...demoDefinition('report').outcomes.map(outcome=>outcome.label)]),
    report('areas','Business areas','All recorded AI uses, grouped by business area. Shares use the total number of recorded AI uses.','AI uses',registryRows.map(row=>({...row,status:row.area||'Unspecified'})))
  ];
}

export function selectReport(snapshot,id) {
  const report=snapshot.reports.find(row=>row.id===id);
  if(!report)throw Object.assign(new Error('Choose a valid report: registry, assessments, actions, policies, risk or areas.'),{status:400});
  return report;
}
