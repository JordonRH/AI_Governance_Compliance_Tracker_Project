// Fictional scenarios for explicit local test seeding. No passwords or account records.
export const testingAccounts=[
 ['test.admin','administrator','Fictional Test Administrator',[]],
 ['test.admin2','administrator','Fictional Backup Administrator',[]],
 ['test.compliance','compliance_officer','Fictional Compliance Reviewer',[]],
 ['test.finance','compliance_officer','Fictional Finance Reviewer',[]],
 ['test.policy','compliance_officer','Fictional Policy Reviewer',[]],
 ['test.education','compliance_officer','Fictional Education Reviewer',[]],
 ['test.staff1','staff_user','Fictional Staff One',[]],
 ['test.staff2','staff_user','Fictional Staff Two',[]],
 ['test.staff3','staff_user','Fictional Staff Three',[]],
 ['test.research','staff_user','Fictional Research Staff',[]],
 ['test.service','staff_user','Fictional Service Staff',[]],
 ['test.disclosure','staff_user','Fictional Disclosure Reporter',[]],
 ['test.actions','staff_user','Fictional Action Manager',['action:manage']],
 ['test.assessments','staff_user','Fictional Assessment Reviewer',['assessment:review']],
 ['test.reports','staff_user','Fictional Reporting Analyst',['report:export']],
 ['test.intake','staff_user','Fictional Registry Intake',['registry:create']],
 ['test.registry','staff_user','Fictional Registry Maintainer',['registry:update']],
 ['test.manager','staff_user','Fictional Governance Manager',['registry:create','registry:update','assessment:review','action:manage','report:export']]
];

export const customRoles=[
  {id:'custom-test-action-manager',name:'TEST - Action manager',permissions:['action:manage']},
  {id:'custom-test-assessment-reviewer',name:'TEST - Assessment reviewer',permissions:['assessment:review']},
  {id:'custom-test-report-analyst',name:'TEST - Reporting analyst',permissions:['report:export']},
  {id:'custom-test-registry-editor',name:'TEST - Registry editor',permissions:['registry:create','registry:update']},
  {id:'custom-test-governance-manager',name:'TEST - Governance manager',permissions:['registry:create','registry:update','assessment:review','action:manage','report:export']}
 ];

export const scenarios=[
  {name:'Everyday quick intake',key:'quick',areas:[],reading:false,progress:false,reopen:true,questions:[['Has the fictional team recorded the intended benefit?',false]]},
  {name:'Evidence-first review',key:'evidence',areas:[],reading:false,progress:true,reopen:true,questions:[['Has a fictional test plan been recorded?',true],['Has a fictional evidence owner been assigned?',true],['Has the fictional review date been agreed?',true]]},
  {name:'Policy-gated assessment',key:'policy',areas:[],reading:true,progress:true,reopen:true,questions:[['Has the fictional policy contact been identified?',true]]},
  {name:'Finance safeguards',key:'finance',areas:['Finance'],reading:true,progress:true,reopen:false,questions:[['Has a fictional financial reconciliation check been planned?',true],['Has a fictional human approval point been recorded?',true],['Has a fictional retention decision been documented?',true]]},
  {name:'Research sandbox',key:'research',areas:['Research','Product development'],reading:false,progress:false,reopen:true,questions:[['Is the fictional experiment using synthetic data only?',true],['Has a fictional experiment note been recorded?',false]]},
  {name:'Education oversight',key:'education',areas:['Education'],reading:true,progress:true,reopen:true,questions:[['Has a fictional educator reviewed the proposed use?',true],['Has the fictional learner-facing explanation been prepared?',true]]},
  {name:'Customer service handoff',key:'service',areas:['Customer service'],reading:false,progress:true,reopen:true,questions:[['Has a fictional escalation contact been named?',true],['Has the fictional handoff to a person been tested?',true]]},
  {name:'Controlled standalone completion',key:'controlled',areas:[],reading:true,progress:true,reopen:false,linked:false,questions:[['Has fictional closure evidence been prepared?',true],['Has a fictional accountable reviewer been named?',true]]}
 ];
