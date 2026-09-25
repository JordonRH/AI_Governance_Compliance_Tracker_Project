import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './themes.css';

const blankRecord = { name:'', owner:'', businessArea:'', purpose:'', dataDescription:'', dataSensitivity:'Not classified', approvalStatus:'Not reviewed' };
const blankShadow = { name:'', businessArea:'', purpose:'', dataDescription:'', dataSensitivity:'Not classified' };

async function api(path, options={}) {
  const response=await fetch(`/api${path}`,options);
  const type=response.headers.get('content-type') || '';
  const body=type.includes('application/json') ? await response.json() : await response.blob();
  if(!response.ok) throw Object.assign(new Error(body.error || 'Request failed.'),{fields:body.fields});
  return body;
}
const json = (method, body) => ({ method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });

function Login({onLogin}) {
  const [form,setForm]=useState({login:'',password:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(event){event.preventDefault();setBusy(true);setError('');try{const result=await api('/auth/login',json('POST',form));onLogin(result.principal);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <main className="content"><section className="panel form-panel"><p className="eyebrow">AITrace for Australian SMEs</p><h1>Sign in</h1><p>Use your organisation account to access governance records.</p>
    {error&&<p className="error" role="alert">{error}</p>}<form onSubmit={submit}>
      <label>Login<input autoComplete="username" value={form.login} onChange={e=>setForm({...form,login:e.target.value})} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></label>
      <button className="primary" disabled={busy}>{busy?'Signing in...':'Sign in'}</button>
    </form></section></main>;
}

function RecordForm({initial=blankRecord,onSave,onCancel,canApprove}) {
  const [form,setForm]=useState(initial),[error,setError]=useState('');
  const field=(key,value)=>setForm({...form,[key]:value});
  async function submit(event){event.preventDefault();setError('');try{await onSave(form);}catch(e){setError(e.message);}}
  return <form onSubmit={submit} className="record-form">{error&&<p className="error" role="alert">{error}</p>}
    <label>AI tool or use case<input value={form.name} onChange={e=>field('name',e.target.value)} required maxLength="120"/></label>
    <label>Responsible person or team<input value={form.owner} onChange={e=>field('owner',e.target.value)} required maxLength="120"/></label>
    <label>Business area<input value={form.businessArea} onChange={e=>field('businessArea',e.target.value)} required maxLength="120" placeholder="For example, customer service"/></label>
    <label>Purpose of this AI use<textarea value={form.purpose} onChange={e=>field('purpose',e.target.value)} required maxLength="2000"/></label>
    <label>Data handled<textarea value={form.dataDescription} onChange={e=>field('dataDescription',e.target.value)} required maxLength="1000"/></label>
    <label>Data sensitivity<select value={form.dataSensitivity} onChange={e=>field('dataSensitivity',e.target.value)}><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></label>
    {canApprove&&<label>Approval status<select value={form.approvalStatus} onChange={e=>field('approvalStatus',e.target.value)}><option>Not reviewed</option><option>Approved</option><option>Declined</option></select></label>}
    <div className="actions"><button className="primary">Save record</button>{onCancel&&<button type="button" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

function AccountsPage(){
  const [accounts,setAccounts]=useState([]),[error,setError]=useState('');
  async function load(){try{setAccounts((await api('/accounts')).accounts);setError('');}catch(e){setError(e.message);}}
  useEffect(()=>{load()},[]);
  async function submit(event){event.preventDefault();setError('');const element=event.currentTarget;try{await api('/accounts',json('POST',Object.fromEntries(new FormData(element))));element.reset();await load();}catch(e){setError(e.message);}}
  return <><p className="eyebrow">Organisation administration</p><h1>Accounts</h1>{error&&<p className="error" role="alert">{error}</p>}<section className="panel"><h2>Create account</h2><form onSubmit={submit} className="record-form"><label>Login<input name="login" required maxLength="160"/></label><label>Display name<input name="displayName" required maxLength="120"/></label><label>Role<select name="role"><option value="staff_user">Staff User</option><option value="compliance_officer">Compliance Officer</option><option value="administrator">Administrator</option></select></label><label>Temporary password<input name="password" type="password" required minLength="12" maxLength="200" autoComplete="new-password"/></label><button className="primary">Create account</button></form></section><section className="panel table-wrap"><table><thead><tr><th>Name</th><th>Login</th><th>Role</th><th>Status</th></tr></thead><tbody>{accounts.map(account=><tr key={account.id}><td>{account.displayName}</td><td>{account.login}</td><td>{account.role.replaceAll('_',' ')}</td><td>{account.status}</td></tr>)}</tbody></table></section></>;
}

function App(){
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('aitrace-theme')==='dark'?'dark':'light'}catch{return'light'}});
  const [principal,setPrincipal]=useState(undefined),[page,setPage]=useState('overview'),[records,setRecords]=useState([]),[overview,setOverview]=useState(null),[error,setError]=useState(''),[editing,setEditing]=useState(null);
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('aitrace-theme',theme)}catch{}},[theme]);
  useEffect(()=>{api('/auth/session').then(x=>setPrincipal(x.principal)).catch(()=>setPrincipal(null))},[]);
  const can=permission=>principal?.permissions.includes(permission);
  async function load(){try{const [registry,dashboard]=await Promise.all([api('/registry'),api('/dashboard')]);setRecords(registry.records);setOverview({total:dashboard.registry.total,unassessed:dashboard.registry.notAssessed,byBusinessArea:dashboard.registry.byCategory,actions:dashboard.actions});setError('');}catch(e){if(e.message==='Authentication is required.')setPrincipal(null);else setError(e.message);}}
  useEffect(()=>{if(principal)load()},[principal]);
  async function logout(){await api('/auth/logout',json('POST',{}));setPrincipal(null);}
  async function save(record){if(editing?.id)await api(`/registry/${editing.id}`,json('PUT',record));else await api('/registry',json('POST',record));setEditing(null);await load();}
  async function examples(){await api('/examples',json('POST',{}));await load();}
  async function shadow(event){event.preventDefault();setError('');const element=event.currentTarget,body=Object.fromEntries(new FormData(element));try{await api('/shadow-reports',json('POST',body));element.reset();await load();setPage('registry');}catch(e){setError(e.message);}}
  async function download(format){const blob=await api(`/reports/compliance.${format}`);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aitrace-compliance-summary.${format}`;a.click();URL.revokeObjectURL(url);}
  if(principal===undefined)return <main className="content"><p>Loading...</p></main>;
  if(!principal)return <><header className="topbar"><strong>AITrace</strong><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button></header><Login onLogin={setPrincipal}/></>;
  return <div className="app-shell"><aside className="sidebar"><h1>AITrace</h1><p>{principal.organizationName}</p><nav aria-label="Main navigation">{['overview','registry','report','guide',...(can('account:manage')?['accounts']:[])].map(item=><button key={item} className={page===item?'active':''} onClick={()=>setPage(item)}>{item==='report'?'Disclose AI use':item[0].toUpperCase()+item.slice(1)}</button>)}</nav></aside>
    <div className="workspace"><header className="topbar"><div><strong>{principal.displayName}</strong><span> � {principal.roleLabel}</span></div><div><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button><button onClick={logout}>Sign out</button></div></header>
    <main className="content">{error&&<p className="error" role="alert">{error}</p>}
      {page==='overview'&&<><p className="eyebrow">Organisation governance overview</p><h1>AI use at a glance</h1><div className="stat-grid"><article className="stat-card"><span>Recorded uses</span><strong>{overview?.total??0}</strong></article><article className="stat-card"><span>Not assessed</span><strong>{overview?.unassessed??0}</strong></article>{overview?.actions?.status==="available"&&<article className="stat-card"><span>Outstanding actions</span><strong>{overview.actions.outstanding}</strong><small>{overview.actions.overdue} overdue</small></article>}</div><section className="panel"><h2>Business areas</h2>{Object.entries(overview?.byBusinessArea||{}).map(([area,count])=><p key={area}>{area}: <strong>{count}</strong></p>)}</section></>}
      {page==='registry'&&<><p className="eyebrow">Organisation register</p><h1>AI use registry</h1><div className="actions">{can('registry:create')&&<button className="primary" onClick={()=>setEditing({})}>Add AI use</button>}{can('registry:create')&&<button onClick={examples}>Load fictional examples</button>}{can('report:export')&&<><button onClick={()=>download('csv')}>Export CSV</button><button onClick={()=>download('pdf')}>Export PDF</button></>}</div>
        {editing&&<section className="panel"><h2>{editing.id?'Edit AI use':'Add AI use'}</h2><RecordForm initial={editing.id?editing:blankRecord} onSave={save} onCancel={()=>setEditing(null)} canApprove={can('registry:update')}/></section>}
        <section className="panel table-wrap"><table><thead><tr><th>AI use</th><th>Business area</th><th>Data sensitivity</th><th>Approval</th><th>Assessment</th><th></th></tr></thead><tbody>{records.map(record=><tr key={record.id}><td>{record.name}{record.source==='shadow-report'&&<small> Staff disclosure</small>}</td><td>{record.businessArea}</td><td>{record.dataSensitivity}</td><td>{record.approvalStatus}</td><td>{record.assessmentStatus}</td><td>{can('registry:update')&&<button aria-label={`Edit ${record.name}`} onClick={()=>setEditing(record)}>Edit</button>}</td></tr>)}</tbody></table>{records.length===0&&<p>No AI uses have been recorded.</p>}</section></>}
      {page==='report'&&<><p className="eyebrow">Shadow AI self-reporting</p><h1>Disclose an AI tool</h1><p>Tell your organisation about an AI tool that is not yet formally registered. This does not automatically approve the tool.</p><section className="panel"><form onSubmit={shadow} className="record-form">
        <label>AI tool or use case<input name="name" required maxLength="120"/></label><label>Business area<input name="businessArea" required maxLength="120"/></label><label>Purpose<textarea name="purpose" required maxLength="2000"/></label><label>Data handled<textarea name="dataDescription" required maxLength="1000"/></label><label>Data sensitivity<select name="dataSensitivity"><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></label><button className="primary">Submit disclosure</button>
      </form></section></>}
      {page==='accounts'&&<AccountsPage/>}
      {page==='guide'&&<><p className="eyebrow">Prototype guidance</p><h1>How AITrace works</h1><section className="panel"><p>Register or disclose AI uses, document their purpose and data sensitivity, complete an approved governance assessment, track resulting actions, and export an organisation summary.</p><p>AITrace supports self-assessment. It does not provide legal advice, certification or automatic compliance approval.</p><p>Use fictional or appropriately de-identified information during development and demonstration.</p></section></>}
    </main></div></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
