// Demonstration content only. Topic links do not assert framework-prescribed scoring.
export function demoDefinition(category) {
  return {
    id:'sme-demonstration',version:'1',status:'approved',demonstration:true,
    notice:'Synthetic demonstration questionnaire and scoring only. Not legal advice or compliance certification.',
    effectiveFrom:'2026-09-26',approval:{approvedAt:'2026-09-26T00:00:00.000Z',approvedBy:'Software demonstration fixture only'},appliesTo:[category],
    sources:[{id:'demo',reference:'AITrace synthetic demonstration rules v1; not framework-prescribed thresholds.'}],
    questions:[
      {id:'personalData',type:'boolean',required:true,label:'Does this AI use process personal or sensitive information?',topic:'Privacy and data security; candidate NIST MAP / Australian privacy protection topic'},
      {id:'humanOversight',type:'boolean',required:true,label:'Is a responsible person reviewing important AI outputs?',topic:'Human oversight; candidate NIST GOVERN / accountability topic'},
      {id:'tested',type:'boolean',required:true,label:'Has the tool been tested for its intended purpose?',topic:'Reliability and evaluation; candidate NIST MEASURE topic'},
      {id:'disclosed',type:'boolean',required:true,label:'Are affected people informed that AI is being used?',topic:'Transparency; candidate Australian transparency and explainability topic'}
    ],
    outcomes:[{id:'high',label:'High (demo)'},{id:'medium',label:'Medium (demo)'},{id:'low',label:'Low (demo)'}],
    rules:[
      {id:'oversight',priority:1,outcomeId:'high',conditions:[{input:'response',id:'humanOversight',operator:'equals',value:false}],explanation:'Demo rule: important outputs without human review need priority attention.',sourceIds:['demo'],actions:[{id:'oversight',kind:'recommended',label:'Assign a human reviewer for important outputs.'}]},
      {id:'privacy',priority:2,outcomeId:'medium',conditions:[{input:'response',id:'personalData',operator:'equals',value:true}],explanation:'Demo rule: personal or sensitive information needs a documented data review.',sourceIds:['demo'],actions:[{id:'privacy',kind:'recommended',label:'Review the data-handling safeguards.'}]},
      {id:'testing',priority:3,outcomeId:'medium',conditions:[{input:'response',id:'tested',operator:'equals',value:false}],explanation:'Demo rule: suitability testing has not been recorded.',sourceIds:['demo'],actions:[{id:'testing',kind:'recommended',label:'Test the AI tool for its intended purpose.'}]},
      {id:'transparency',priority:4,outcomeId:'medium',conditions:[{input:'response',id:'disclosed',operator:'equals',value:false}],explanation:'Demo rule: explain the AI use to affected people.',sourceIds:['demo'],actions:[{id:'transparency',kind:'recommended',label:'Document how AI use is disclosed.'}]},
      {id:'baseline',priority:100,outcomeId:'low',conditions:[],explanation:'Demo baseline; higher-priority matching rules take precedence. This is not compliance approval.',sourceIds:['demo']}
    ]
  };
}
