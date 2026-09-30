import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReportAnalytics,selectReport} from '../../server/domain/report-analytics.js';
import {createReportCsv,createReportPdf} from '../../server/report-exports.js';

const input={date:'2026-09-30',records:[
  {id:'u1',name:'Fictional assistant',approvalStatus:'Approved',businessArea:'Operations',riskOutcome:{label:'Low (demo)'}},
  {id:'u2',name:'=Fictional helper',approvalStatus:'Not reviewed',businessArea:'Finance'}
],assessments:[{id:'a1',ai_use_id:'u1',state:'Submitted'},{id:'a2',ai_use_id:'u1',state:'Draft'}],actions:[{id:'x1',title:'Fictional follow-up',status:'In Progress'}],policies:[
  {id:'p1',document_id:'d1',version:1,title:'Older fictional policy',review_due:'2026-01-01'},
  {id:'p2',document_id:'d1',version:2,title:'Current fictional policy',review_due:'2026-09-30'},
  {id:'p3',document_id:'d2',version:1,title:'Reviewed but overdue',review_due:'2026-09-29',reviewed_at:'2026-09-01'},
  {id:'p4',document_id:'d3',version:1,title:'Reviewed and current',review_due:'2026-10-01',reviewed_at:'2026-09-01'}
]};

test('report totals reconcile, drafts count separately and only the latest policy version counts',()=>{
  const reports=buildReportAnalytics(input),get=id=>selectReport({reports},id);
  for(const report of reports)assert.equal(report.buckets.reduce((sum,b)=>sum+b.count,0),report.total);
  assert.deepEqual(get('registry').buckets,[{label:'Not reviewed',count:1},{label:'Approved',count:1},{label:'Declined',count:0}]);
  assert.deepEqual(get('assessments').buckets,[{label:'Draft',count:1},{label:'Submitted',count:1}]);
  assert.equal(get('risk').total,2);assert.equal(get('risk').buckets.find(b=>b.label==='Not assessed').count,1);
  assert.equal(get('policies').total,3);assert.equal(get('policies').rows.some(row=>row.id==='p1'),false);
  assert.deepEqual(get('policies').buckets,[{label:'Review pending',count:0},{label:'Due today',count:1},{label:'Overdue',count:1},{label:'Reviewed',count:1}]);
  assert.equal(get('areas').buckets.find(b=>b.label==='Finance').count,1);
});

test('empty reporting retains zero statuses and rejects unknown report selectors',()=>{
  const reports=buildReportAnalytics({date:input.date,records:[],assessments:[],actions:[],policies:[]});
  assert.equal(reports.length,6);for(const report of reports){assert.equal(report.total,0);assert.ok(report.buckets.every(b=>b.count===0))}
  assert.throws(()=>selectReport({reports},'unknown'),{status:400});
});

test('selected report exports include the cutoff, reconciled counts and safe CSV records',async()=>{
  const snapshot={reports:buildReportAnalytics(input),asOfDate:input.date,coverageStart:'2026-09-01T00:00:00.000Z'},report=selectReport(snapshot,'registry');
  const csv=createReportCsv(report,snapshot);
  assert.match(csv,/Registry approvals/);assert.match(csv,/2026-09-30 UTC/);assert.match(csv,/"Approved","1","50"/);assert.match(csv,/'=Fictional helper/);assert.doesNotMatch(csv,/Current fictional policy/);
  const pdf=await createReportPdf(report,snapshot,'Fictional reporting SME');assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.match(pdf.toString('latin1'),/\/ToUnicode/);
});
