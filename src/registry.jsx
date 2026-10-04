import React,{useState} from 'react';

import {api,json} from './api.js';

import {Field,FormNote} from './forms.jsx';

const blankRecord={name:'',owner:'',businessArea:'',purpose:'',dataDescription:'',dataSensitivity:'Not classified',approvalStatus:'Not reviewed'};

function RecordForm({initial=blankRecord,onSave,onCancel,canApprove}) {

  const [form,setForm]=useState(initial),[error,setError]=useState(''),[errors,setErrors]=useState({}),[busy,setBusy]=useState(false);

  const field=(key,value)=>setForm({...form,[key]:value});

  async function submit(event){event.preventDefault();setError('');setErrors({});setBusy(true);try{await onSave(form);}catch(e){setError(e.message);setErrors(e.fields||{});}finally{setBusy(false)}}

  return <form onSubmit={submit} className="record-form"><FormNote/>{error&&<p className="error" role="alert">{error}</p>}

    <Field error={errors.name}>AI tool or use case<input value={form.name} onChange={e=>field('name',e.target.value)} required maxLength="120"/></Field>

    <Field error={errors.owner}>Responsible person or team<input value={form.owner} onChange={e=>field('owner',e.target.value)} required maxLength="120"/></Field>

    <Field error={errors.businessArea}>Business area<input value={form.businessArea} onChange={e=>field('businessArea',e.target.value)} required maxLength="120" placeholder="For example, customer service"/></Field>

    <Field error={errors.purpose}>Purpose of this AI use<textarea value={form.purpose} onChange={e=>field('purpose',e.target.value)} required maxLength="2000"/></Field>

    <Field error={errors.dataDescription}>Data handled<textarea value={form.dataDescription} onChange={e=>field('dataDescription',e.target.value)} required maxLength="1000"/></Field>

    <Field error={errors.dataSensitivity}>Data sensitivity<select required value={form.dataSensitivity} onChange={e=>field('dataSensitivity',e.target.value)}><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></Field>

    {canApprove&&<Field error={errors.approvalStatus}>Approval status<select required value={form.approvalStatus} onChange={e=>field('approvalStatus',e.target.value)}><option>Not reviewed</option><option>Approved</option><option>Declined</option></select></Field>}

    <div className="actions"><button className="primary" disabled={busy}>Save record</button>{onCancel&&<button type="button" onClick={onCancel}>Cancel</button>}</div>

  </form>;

}



function DisclosureForm({onSubmit,fields,busy}){
 return <details className="panel accordion"><summary>Disclose an unregistered AI tool</summary><p className="form-note">Tell your organisation about an AI tool that is not yet formally registered. This does not automatically approve the tool.</p><form onSubmit={onSubmit} className="record-form"><FormNote/><Field error={fields.name}>AI tool or use case<input name="name" required maxLength="120"/></Field><Field error={fields.businessArea}>Business area<input name="businessArea" required maxLength="120"/></Field><Field error={fields.purpose}>Purpose<textarea name="purpose" required maxLength="2000"/></Field><Field error={fields.dataDescription}>Data handled<textarea name="dataDescription" required maxLength="1000"/></Field><Field error={fields.dataSensitivity}>Data sensitivity<select name="dataSensitivity" required><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></Field><button className="primary" disabled={busy}>Submit disclosure</button></form></details>;
}

export function RegistryPage({principal,records,onChanged,onDisclosure,disclosureFields,disclosureBusy}){
 const can=p=>principal.permissions.includes(p),[editing,setEditing]=useState(null),[detail,setDetail]=useState(null),[history,setHistory]=useState([]),[query,setQuery]=useState(''),[area,setArea]=useState(''),[queue,setQueue]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(1);
 const filtered=records.filter(r=>(!query||`${r.name} ${r.owner} ${r.purpose}`.toLowerCase().includes(query.toLowerCase()))&&(!area||r.businessArea===area)&&(queue!=='disclosures'||r.source==='shadow-report'&&r.approvalStatus==='Not reviewed'));
 const pages=Math.max(1,Math.ceil(filtered.length/20)),current=Math.min(page,pages),visible=filtered.slice((current-1)*20,current*20);
 async function save(record){await api(editing?.id?`/registry/${editing.id}`:'/registry',json(editing?.id?'PUT':'POST',record));setEditing(null);setDetail(null);await onChanged()}
 async function open(record){setError('');try{const result=await api(`/registry/${record.id}/history`);setHistory(result.events);setDetail(record)}catch(e){setError(e.message)}}
 async function examples(){setBusy(true);setError('');try{await api('/examples',json('POST',{}));await onChanged()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function download(format){setBusy(true);setError('');try{const blob=await api(`/reports/compliance.${format}`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aitrace-compliance-summary.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><p className="eyebrow">Organisation register</p><h1>AI use registry</h1><p className="subtitle">Find registered tools, review disclosures, and understand who is responsible.</p>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}<div className="actions">{can('registry:create')&&<><button className="primary" onClick={()=>setEditing({})}>Add AI use</button><button disabled={busy} onClick={examples}>Load fictional examples</button></>}{can('report:export')&&<><button disabled={busy} onClick={()=>download('csv')}>Export CSV</button><button disabled={busy} onClick={()=>download('pdf')}>Export PDF</button></>}</div>
 {can('shadow:create')&&<DisclosureForm onSubmit={onDisclosure} fields={disclosureFields} busy={disclosureBusy}/>}
 <details className="panel accordion" open><summary>Find and filter AI uses</summary><div className="filters-grid"><Field>Search AI uses<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Tool, owner, or purpose"/></Field><Field>Business area filter<select value={area} onChange={e=>{setArea(e.target.value);setPage(1)}}><option value="">All areas</option>{[...new Set(records.map(r=>r.businessArea))].sort().map(a=><option key={a}>{a}</option>)}</select></Field><Field>Review queue<select value={queue} onChange={e=>{setQueue(e.target.value);setPage(1)}}><option value="all">All AI uses</option><option value="disclosures">Unreviewed staff disclosures</option></select></Field></div></details>
 {editing&&<section className="panel"><h2>{editing.id?'Edit AI use':'Add AI use'}</h2><RecordForm key={editing.id||'new'} initial={editing.id?editing:blankRecord} onSave={save} onCancel={()=>setEditing(null)} canApprove={can('registry:update')}/></section>}
 {detail&&<section className="panel"><div className="section-heading"><h2>AI use details</h2><button onClick={()=>setDetail(null)}>Close details</button></div><h3>{detail.name}</h3><dl className="record-details">{[['Responsible person',detail.owner],['Business area',detail.businessArea],['Purpose',detail.purpose],['Data handled',detail.dataDescription],['Sensitivity',detail.dataSensitivity],['Approval',detail.approvalStatus],['Risk result',detail.riskOutcome?.label||'Not assessed'],['Source',detail.source==='shadow-report'?'Staff disclosure':'Formal registry']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Decision and change history</h3>{history.length?history.map(e=><p className="history-entry" key={e.id}>{e.created_at} · {e.actor}: {e.changes.map(c=>`${c.field}: ${c.from ?? "—"} → ${c.to}`).join('; ')}</p>):<p>No changes recorded since history tracking was enabled.</p>}</section>}
 <section className="panel table-wrap" role="region" aria-label="Records" tabIndex="0"><table><thead><tr><th>AI use</th><th>Business area</th><th>Data sensitivity</th><th>Approval</th><th>Assessment</th><th>Actions</th></tr></thead><tbody>{visible.map(record=><tr key={record.id}><td>{record.name}{record.source==='shadow-report'&&<small>Staff disclosure</small>}</td><td>{record.businessArea}</td><td>{record.dataSensitivity}</td><td><span className="status">{record.approvalStatus}</span></td><td>{record.riskOutcome?.label||record.assessmentStatus}</td><td><button aria-label={`View ${record.name}`} onClick={()=>open(record)}>View</button>{can('registry:update')&&<button aria-label={`Edit ${record.name}`} onClick={()=>setEditing(record)}>Edit</button>}</td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><h3>No matching AI uses</h3><p>Add a record or adjust your filters.</p></div>}</section><div className="actions"><span>{filtered.length} records · Page {current} of {pages}</span><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous page</button><button disabled={current===pages} onClick={()=>setPage(current+1)}>Next page</button></div></>;
}
