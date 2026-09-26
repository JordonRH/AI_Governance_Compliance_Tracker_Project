import React, { useEffect, useState, useId } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './themes.css';

const blankRecord = { name:'', owner:'', businessArea:'', purpose:'', dataDescription:'', dataSensitivity:'Not classified', approvalStatus:'Not reviewed' };
function Field({children}) {
  const id = useId();
  const control = React.Children.toArray(children).find(child => React.isValidElement(child));
  const label = React.Children.toArray(children).filter(child => !React.isValidElement(child));
  const required = Boolean(control?.props.required);
  return <div className={`field ${control?.type === 'textarea' ? 'field-wide' : ''}`}>
    <label htmlFor={id}>{label}{required && <span className="required-mark" aria-hidden="true"> *</span>}</label>
    {React.cloneElement(control, {id, 'aria-describedby': control.props.minLength ? `${id}-hint` : undefined})}
    {control.props.minLength && <small id={`${id}-hint`}>Use {control.props.minLength} to {control.props.maxLength} characters.</small>}
  </div>;
}
function FormNote(){return <p className="form-note">Fields marked <span className="required-mark">*</span> are required.</p>}
function Brand(){return <div className="brand"><span className="brand-mark" aria-hidden="true">A</span><span>AITrace<small>AI governance workspace</small></span></div>}


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
  return <main className="login-layout"><section className="login-intro"><p className="eyebrow">Clarity. Accountability. Confidence.</p><h2>Know where AI fits<br/>in your business.</h2><p>One place to understand your AI tools, document their use, and keep your team accountable.</p><div className="login-points"><span>01 / Register your AI tools</span><span>02 / Understand your exposure</span><span>03 / Build responsible habits</span></div></section><section className="panel form-panel"><p className="eyebrow">AITrace for Australian SMEs</p><h1>Sign in</h1><p className="subtitle">Use your organisation account to access governance records.</p>
    {error&&<p className="error" role="alert">{error}</p>}<form onSubmit={submit}><FormNote/>
      <Field>Login<input autoComplete="username" value={form.login} onChange={e=>setForm({...form,login:e.target.value})} required /></Field>
      <Field>Password<input type="password" autoComplete="current-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></Field>
      <button className="primary" disabled={busy}>{busy?'Signing in...':'Sign in'}</button>
    </form></section></main>;
}

function RecordForm({initial=blankRecord,onSave,onCancel,canApprove}) {
  const [form,setForm]=useState(initial),[error,setError]=useState('');
  const field=(key,value)=>setForm({...form,[key]:value});
  async function submit(event){event.preventDefault();setError('');try{await onSave(form);}catch(e){setError(e.message);}}
  return <form onSubmit={submit} className="record-form"><FormNote/>{error&&<p className="error" role="alert">{error}</p>}
    <Field>AI tool or use case<input value={form.name} onChange={e=>field('name',e.target.value)} required maxLength="120"/></Field>
    <Field>Responsible person or team<input value={form.owner} onChange={e=>field('owner',e.target.value)} required maxLength="120"/></Field>
    <Field>Business area<input value={form.businessArea} onChange={e=>field('businessArea',e.target.value)} required maxLength="120" placeholder="For example, customer service"/></Field>
    <Field>Purpose of this AI use<textarea value={form.purpose} onChange={e=>field('purpose',e.target.value)} required maxLength="2000"/></Field>
    <Field>Data handled<textarea value={form.dataDescription} onChange={e=>field('dataDescription',e.target.value)} required maxLength="1000"/></Field>
    <Field>Data sensitivity<select value={form.dataSensitivity} onChange={e=>field('dataSensitivity',e.target.value)}><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></Field>
    {canApprove&&<Field>Approval status<select value={form.approvalStatus} onChange={e=>field('approvalStatus',e.target.value)}><option>Not reviewed</option><option>Approved</option><option>Declined</option></select></Field>}
    <div className="actions"><button className="primary">Save record</button>{onCancel&&<button type="button" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

function AccountsPage({principal,onSessionEnded}) {
  const [accounts,setAccounts]=useState([]), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [selected,setSelected]=useState(null), [busy,setBusy]=useState(false), [query,setQuery]=useState('');
  async function load(){const result=await api('/accounts');setAccounts(result.accounts);}
  useEffect(()=>{load().catch(e=>setError(e.message))},[]);
  async function create(event){
    event.preventDefault();const form=event.currentTarget;setBusy(true);setError('');setNotice('');
    try {await api('/accounts',json('POST',Object.fromEntries(new FormData(form))));form.reset();await load();setNotice('Account created.');}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function update(event,kind){
    event.preventDefault();const form=event.currentTarget, values=Object.fromEntries(new FormData(form));setError('');setNotice('');
    if(kind==='password' && values.password!==values.confirmPassword){setError('The new passwords must match.');return;}
    setBusy(true);
    try {
      await api(`/accounts/${selected.id}${kind==='password'?'/password':''}`,json(kind==='password'?'POST':'PATCH',kind==='password'?{password:values.password}:{role:values.role,status:values.status}));
      form.reset();setSelected(null);
      if(selected.id===principal.accountId){onSessionEnded();return;}
      await load();setNotice(kind==='password'?'Password reset. Existing sessions have been signed out.':'Account access updated. Existing sessions have been signed out.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const visible=accounts.filter(account=>`${account.displayName} ${account.login} ${account.role}`.toLowerCase().includes(query.toLowerCase()));
  return <><p className="eyebrow">Organisation administration</p><h1>Accounts</h1><p className="subtitle">Manage accounts, passwords, and access for your organisation.</p>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    <section className="panel"><div className="section-heading"><div><h2>Account directory</h2><p className="form-note">{accounts.length} accounts in your organisation</p></div><div className="directory-search"><Field>Search accounts<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, login, or role"/></Field></div></div>
    <div className="table-wrap" role="region" aria-label="Account directory" tabIndex="0"><table><thead><tr><th>Name</th><th>Login</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(account=><tr key={account.id}><td>{account.displayName}{account.id===principal.accountId&&<small>Your account</small>}</td><td>{account.login}</td><td>{account.role.replaceAll('_',' ')}</td><td><span className={`status ${account.status==='active'?'status-success':''}`}>{account.status}</span></td><td><button disabled={busy} aria-label={`Manage ${account.login}`} onClick={()=>{setSelected(account);setError('');setNotice('')}}>Manage</button></td></tr>)}</tbody></table>{!visible.length&&<p className="empty">No accounts match your search.</p>}</div></section>
    {selected&&<section className="panel" key={selected.id}><div className="section-heading"><div><p className="eyebrow">Manage account</p><h2>{selected.displayName}</h2><p className="form-note">{selected.login}</p></div><button disabled={busy} onClick={()=>setSelected(null)}>Close account controls</button></div>
      <div className="admin-grid"><section><h3>Reset password</h3><p className="form-note">This signs the account out on all devices. Share the new password securely.</p><form onSubmit={e=>update(e,'password')} className="admin-form"><FormNote/><Field>New password<input name="password" type="password" minLength="12" maxLength="200" autoComplete="new-password" required/></Field><Field>Confirm new password<input name="confirmPassword" type="password" minLength="12" maxLength="200" autoComplete="new-password" required/></Field><button className="primary" disabled={busy}>{busy?'Saving...':'Reset password'}</button></form></section>
      <section><h3>Role and access</h3><p className="form-note">Disabled accounts cannot sign in. Access changes end existing sessions.</p><form onSubmit={e=>update(e,'access')} className="admin-form"><FormNote/><Field>Account role<select name="role" defaultValue={selected.role} required disabled={selected.id===principal.accountId}><option value="staff_user">Staff User</option><option value="compliance_officer">Compliance Officer</option><option value="administrator">Administrator</option></select></Field><Field>Account status<select name="status" defaultValue={selected.status} required disabled={selected.id===principal.accountId}><option value="active">Active</option><option value="disabled">Disabled</option></select></Field>{selected.id===principal.accountId?<p className="form-note">You cannot remove your own administrator access.</p>:<button className="primary" disabled={busy}>{busy?'Saving...':'Save access'}</button>}</form></section></div>
    </section>}
    <section className="panel"><h2>Create account</h2><form onSubmit={create} className="record-form"><FormNote/><Field>Login<input name="login" required maxLength="160" autoComplete="off"/></Field><Field>Display name<input name="displayName" required maxLength="120"/></Field><Field>Role<select name="role" required><option value="staff_user">Staff User</option><option value="compliance_officer">Compliance Officer</option><option value="administrator">Administrator</option></select></Field><Field>Initial password<input name="password" type="password" required minLength="12" maxLength="200" autoComplete="new-password"/></Field><button className="primary" disabled={busy}>{busy?'Saving...':'Create account'}</button></form></section>
  </>;
}

function SettingsPage({appearance,onAppearance}) {
  const [choice,setChoice]=useState(appearance),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>setChoice(appearance),[appearance]);
  async function save(event){event.preventDefault();setBusy(true);setError('');setNotice('');try{const settings=await api('/settings',json('PUT',{appearance:choice}));onAppearance(settings.appearance);setNotice('Appearance saved for your organisation.');}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <><p className="eyebrow">Organisation administration</p><h1>Appearance</h1><p className="subtitle">Choose a consistent style for everyone in your organisation. Each person can still switch between light and dark mode.</p><section className="panel"><h2>Workspace style</h2>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}<form onSubmit={save}><fieldset className="style-options"><legend>Choose a style</legend>{[{id:'srec',name:'SREC blue',description:'Inspired by the sponsor institution: blue, deep navy, and white.'},{id:'slate',name:'Slate',description:'A neutral graphite workspace with understated blue accents.'}].map(style=><label className="style-option" key={style.id}><input type="radio" name="appearance" value={style.id} checked={choice===style.id} onChange={()=>setChoice(style.id)}/><span className={`style-swatch swatch-${style.id}`} aria-hidden="true"/><strong>{style.name}</strong><span>{style.description}</span></label>)}</fieldset><button className="primary" disabled={busy}>{busy?'Saving...':'Save appearance'}</button></form></section></>;
}

function App(){
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('aitrace-theme')==='dark'?'dark':'light'}catch{return'light'}});
  const [appearance,setAppearance]=useState('srec');
  useEffect(()=>{document.documentElement.dataset.appearance=appearance},[appearance]);
  const [principal,setPrincipal]=useState(undefined),[page,setPage]=useState('overview'),[records,setRecords]=useState([]),[overview,setOverview]=useState(null),[error,setError]=useState(''),[editing,setEditing]=useState(null);
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('aitrace-theme',theme)}catch{}},[theme]);
  useEffect(()=>{api('/auth/session').then(x=>setPrincipal(x.principal)).catch(()=>setPrincipal(null))},[]);
  const can=permission=>principal?.permissions.includes(permission);
  async function load(){try{const [registry,dashboard,settings]=await Promise.all([api('/registry'),api('/dashboard'),api('/settings')]);setAppearance(settings.appearance);setRecords(registry.records);setOverview({total:dashboard.registry.total,unassessed:dashboard.registry.notAssessed,byBusinessArea:dashboard.registry.byCategory,actions:dashboard.actions});setError('');}catch(e){if(e.message==='Authentication is required.')setPrincipal(null);else setError(e.message);}}
  useEffect(()=>{if(principal)load()},[principal]);
  async function logout(){await api('/auth/logout',json('POST',{}));setPrincipal(null);setPage('overview');setAppearance('srec');setRecords([]);setOverview(null);setError('');}
  async function save(record){if(editing?.id)await api(`/registry/${editing.id}`,json('PUT',record));else await api('/registry',json('POST',record));setEditing(null);await load();}
  async function examples(){await api('/examples',json('POST',{}));await load();}
  async function shadow(event){event.preventDefault();setError('');const element=event.currentTarget,body=Object.fromEntries(new FormData(element));try{await api('/shadow-reports',json('POST',body));element.reset();await load();setPage('registry');}catch(e){setError(e.message);}}
  async function download(format){const blob=await api(`/reports/compliance.${format}`);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aitrace-compliance-summary.${format}`;a.click();URL.revokeObjectURL(url);}
  if(principal===undefined)return <main className="content"><p>Loading...</p></main>;
  if(!principal)return <><header className="topbar"><Brand/><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button></header><Login onLogin={setPrincipal}/></>;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar"><Brand/><p className="workspace-label">WORKSPACE</p><p className="organisation-name">{principal.organizationName}</p><nav aria-label="Main navigation">{['overview','registry','report','guide',...(can('account:manage')?['accounts','settings']:[])].map(item=><button key={item} aria-current={page===item?'page':undefined} onClick={()=>setPage(item)}>{item==='settings'?'Appearance':item==='report'?'Disclose AI use':item[0].toUpperCase()+item.slice(1)}</button>)}</nav><div className="sidebar-footer"><span className="sidebar-tag">SME GOVERNANCE</span><p>Responsible AI starts<br/>with visibility.</p></div></aside>
    <div className="workspace"><header className="topbar"><div><strong>{principal.displayName}</strong><span className="role-label">{principal.roleLabel}</span></div><div><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button><button onClick={logout}>Sign out</button></div></header>
    <main id="main-content" tabIndex="-1" className="content">{error&&<p className="error" role="alert">{error}</p>}
      {page==='overview'&&<><p className="eyebrow">Organisation governance overview</p><h1>AI use at a glance</h1><p className="subtitle">A clearer view of the tools, responsibilities, and next steps across your organisation.</p><div className="stat-grid"><article className="stat-card"><span>Recorded uses</span><strong>{overview?.total??0}</strong></article><article className="stat-card"><span>Not assessed</span><strong>{overview?.unassessed??0}</strong></article>{overview?.actions?.status==="available"&&<article className="stat-card"><span>Outstanding actions</span><strong>{overview.actions.outstanding}</strong><small>{overview.actions.overdue} overdue</small></article>}</div><div className="overview-grid"><section className="panel"><p className="eyebrow">Across your organisation</p><h2>AI use by business area</h2>{Object.entries(overview?.byBusinessArea||{}).map(([area,count])=><div className="area" key={area}><div><span>{area}</span><strong>{count} {count===1?'use':'uses'}</strong></div><div className="bar"><span style={{width:`${count / Math.max(overview.total,1) * 100}%`}}/></div></div>)}{!records.length&&<div className="empty"><h3>Your overview starts here</h3><p>Add your first AI use to see which parts of your business are using AI.</p></div>}</section><section className="panel next-step"><p className="eyebrow">Your next step</p><h2>Make AI use visible</h2><p>A useful register starts with the basics: the tool, the person responsible, and the data it handles.</p><button className="primary" onClick={()=>setPage('registry')}>Open the registry</button><button className="text-button" onClick={()=>setPage('guide')}>Read the getting started guide</button></section></div></>}
      {page==='registry'&&<><p className="eyebrow">Organisation register</p><h1>AI use registry</h1><p className="subtitle">Keep an up-to-date record of how your organisation uses AI.</p><div className="actions">{can('registry:create')&&<button className="primary" onClick={()=>setEditing({})}>Add AI use</button>}{can('registry:create')&&<button onClick={examples}>Load fictional examples</button>}{can('report:export')&&<><button onClick={()=>download('csv')}>Export CSV</button><button onClick={()=>download('pdf')}>Export PDF</button></>}</div>
        {editing&&<section className="panel"><h2>{editing.id?'Edit AI use':'Add AI use'}</h2><RecordForm initial={editing.id?editing:blankRecord} onSave={save} onCancel={()=>setEditing(null)} canApprove={can('registry:update')}/></section>}
        <section className="panel table-wrap" role="region" aria-label="Records" tabIndex="0"><table><thead><tr><th>AI use</th><th>Business area</th><th>Data sensitivity</th><th>Approval</th><th>Assessment</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map(record=><tr key={record.id}><td>{record.name}{record.source==='shadow-report'&&<small> Staff disclosure</small>}</td><td>{record.businessArea}</td><td>{record.dataSensitivity}</td><td><span className={`status ${record.approvalStatus==='Approved'?'status-success':''}`}>{record.approvalStatus}</span></td><td><span className="status">{record.assessmentStatus}</span></td><td>{can('registry:update')&&<button aria-label={`Edit ${record.name}`} onClick={()=>setEditing(record)}>Edit</button>}</td></tr>)}</tbody></table>{records.length===0&&<div className="empty"><h3>No AI uses have been recorded.</h3><p>Add an AI tool to start building your organisationâ€™s register, or load fictional examples to explore.</p></div>}</section></>}
      {page==='report'&&<><p className="eyebrow">Shadow AI self-reporting</p><h1>Disclose an AI tool</h1><p className="subtitle">Tell your organisation about an AI tool that is not yet formally registered. This does not automatically approve the tool.</p><section className="panel"><form onSubmit={shadow} className="record-form"><FormNote/>
        <Field>AI tool or use case<input name="name" required maxLength="120"/></Field><Field>Business area<input name="businessArea" required maxLength="120"/></Field><Field>Purpose<textarea name="purpose" required maxLength="2000"/></Field><Field>Data handled<textarea name="dataDescription" required maxLength="1000"/></Field><Field>Data sensitivity<select name="dataSensitivity"><option>Not classified</option><option>Public</option><option>Internal</option><option>Confidential</option><option>Sensitive</option></select></Field><button className="primary">Submit disclosure</button>
      </form></section></>}
      {page==='accounts'&&<AccountsPage principal={principal} onSessionEnded={()=>{setPrincipal(null);setPage('overview')}}/>}
      {page==='settings'&&can('account:manage')&&<SettingsPage appearance={appearance} onAppearance={setAppearance}/>}
      {page==='guide'&&<><p className="eyebrow">Prototype guidance</p><h1>How AITrace works</h1><p className="subtitle">A practical starting point for responsible AI use in your business.</p><section className="panel prose"><h2>A simple governance workflow</h2><ol><li><strong>Record the tools you use.</strong> Capture the purpose, owner, and business area.</li><li><strong>Understand the data.</strong> Describe what information each tool handles.</li><li><strong>Review and follow up.</strong> Check approval status and export a summary for your team.</li></ol><p>Register or disclose AI uses, document their purpose and data sensitivity, complete an approved governance assessment, track resulting actions, and export an organisation summary.</p><p>AITrace supports self-assessment. It does not provide legal advice, certification or automatic compliance approval.</p><p>Use fictional or appropriately de-identified information during development and demonstration.</p></section></>}
    </main></div></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
