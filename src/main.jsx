import {GovernanceConfiguration,capabilities} from './governance-config.jsx';
import {CertificatesPage} from './certificates.jsx';
import {RegistryPage} from './registry.jsx';
import React, { useEffect, useState, useId } from 'react';
import { createRoot } from 'react-dom/client';
import {Field,FormNote} from './forms.jsx';
import {api,json} from './api.js';
import {AssessmentsPage,ActionsPage,PoliciesPage,NotificationsPage,SecurityPage} from './workflows.jsx';
import {OverviewPage} from './overview.jsx';
import {ReportsPage} from './reports.jsx';
import './styles.css';
import './themes.css';

const blankRecord = { name:'', owner:'', businessArea:'', purpose:'', dataDescription:'', dataSensitivity:'Not classified', approvalStatus:'Not reviewed' };
function UatBanner(){return <div className="uat-banner"><strong>UAT environment</strong><strong>For testing and demonstration</strong></div>}
function Brand(){return <div className="brand"><span className="brand-mark" aria-hidden="true">A</span><span>AITrace<small>AI governance workspace</small></span></div>}



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

function AccountsPage({principal,onSessionEnded}) {
  const [accounts,setAccounts]=useState([]), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [selected,setSelected]=useState(null), [busy,setBusy]=useState(false), [query,setQuery]=useState(''),[audit,setAudit]=useState([]),[customRoles,setCustomRoles]=useState([]);
  async function load(){const result=await api('/accounts');setAccounts(result.accounts);setCustomRoles((await api('/governance-configuration')).activeCustomRoles);setAudit((await api('/accounts/audit')).events);}
  useEffect(()=>{load().catch(e=>setError(e.message))},[]);
  async function create(event){
    event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
    if(values.password!==values.confirmPassword){setError('The initial passwords must match.');return;}
    setBusy(true);setError('');setNotice('');
    try {await api('/accounts',json('POST',Object.fromEntries(new FormData(form))));form.reset();await load();setNotice('Account created.');}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function update(event,kind){
    event.preventDefault();const form=event.currentTarget, values=Object.fromEntries(new FormData(form));setError('');setNotice('');
    if(kind==='password' && values.password!==values.confirmPassword){setError('The new passwords must match.');return;}
    setBusy(true);
    try {
      await api(`/accounts/${selected.id}${kind==='password'?'/password':''}`,json(kind==='password'?'POST':'PATCH',kind==='password'?{password:values.password}:{role:values.role,status:values.status,capabilities:new FormData(form).getAll('capabilities'),...(values.customRoleId==='__keep'?{}:{customRoleId:values.customRoleId})}));
      form.reset();setSelected(null);
      if(selected.id===principal.accountId){onSessionEnded();return;}
      await load();setNotice(kind==='password'?'Password reset. Existing sessions have been signed out.':'Account access updated. Existing sessions have been signed out.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const visible=accounts.filter(account=>`${account.displayName} ${account.login} ${account.role}`.toLowerCase().includes(query.toLowerCase()));
  return <><p className="eyebrow">Organisation administration</p><h1>Accounts</h1><p className="subtitle">Manage accounts, passwords, and access for your organisation.</p>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    {selected&&<section className="panel" key={selected.id}><div className="section-heading"><div><p className="eyebrow">Manage account</p><h2>{selected.displayName}</h2><p className="form-note">{selected.login}</p></div><button disabled={busy} onClick={()=>setSelected(null)}>Close account controls</button></div>
      <div className="admin-grid"><section><h3>Reset password</h3><p className="form-note">This signs the account out on all devices. Share the new password securely.</p><form onSubmit={e=>update(e,'password')} className="admin-form"><FormNote/><Field>New password<input name="password" type="password" minLength="12" maxLength="200" autoComplete="new-password" required/></Field><Field>Confirm new password<input name="confirmPassword" type="password" minLength="12" maxLength="200" autoComplete="new-password" required/></Field><button className="primary" disabled={busy}>{busy?'Saving...':'Reset password'}</button></form></section>
      <section><h3>Role and access</h3><p>Effective permissions: {selected.permissions.join(", ")}</p>{selected.customRole&&<p>Assigned template: {selected.customRole.name} / version {selected.customRole.configurationVersion}</p>}<p className="form-note">Disabled accounts cannot sign in. Access changes end existing sessions.</p><form onSubmit={e=>update(e,'access')} className="admin-form"><FormNote/><Field>Account role<select name="role" defaultValue={selected.role} required disabled={selected.id===principal.accountId}><option value="staff_user">Staff User</option><option value="compliance_officer">Compliance Officer</option><option value="administrator">Administrator</option></select></Field><Field>Account status<select name="status" defaultValue={selected.status} required disabled={selected.id===principal.accountId}><option value="active">Active</option><option value="disabled">Disabled</option></select></Field><fieldset disabled={selected.id===principal.accountId}><legend>Additional user capabilities</legend>{capabilities.map(permission=><label className="capability-choice" key={permission}><input type="checkbox" name="capabilities" value={permission} defaultChecked={selected.capabilities.includes(permission)}/>{permission}</label>)}</fieldset><Field>Custom capability role<select name="customRoleId" defaultValue="__keep" disabled={selected.id===principal.accountId}><option value="__keep">Keep current assignment</option><option value="">No custom role</option>{customRoles.map(role=><option key={role.id} value={role.id}>{role.name} (active version)</option>)}</select></Field>{selected.id===principal.accountId?<p className="form-note">You cannot remove your own administrator access.</p>:<button className="primary" disabled={busy}>{busy?'Saving...':'Save access'}</button>}</form></section></div>
    </section>}
    <section className="panel"><div className="section-heading"><div><h2>Account directory</h2><p className="form-note">{accounts.length} accounts in your organisation</p></div><div className="directory-search"><Field>Search accounts<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, login, or role"/></Field></div></div>
    <div className="table-wrap" role="region" aria-label="Account directory" tabIndex="0"><table><thead><tr><th>Name</th><th>Login</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(account=><tr key={account.id}><td>{account.displayName}{account.id===principal.accountId&&<small>Your account</small>}</td><td>{account.login}</td><td>{account.role.replaceAll('_',' ')}</td><td><span className={`status ${account.status==='active'?'status-success':''}`}>{account.status}</span></td><td><button disabled={busy} aria-label={`Manage ${account.login}`} onClick={()=>{setSelected(account);setError('');setNotice('')}}>Manage</button></td></tr>)}</tbody></table>{!visible.length&&<p className="empty">No accounts match your search.</p>}</div></section>
    <section className="panel"><h2>Account activity</h2>{audit.length?audit.map(e=><p className="history-entry" key={e.id}>{e.created_at} - {e.actor}: {e.action} for {e.target}</p>):<p>No account changes recorded.</p>}</section><section className="panel"><h2>Create account</h2><p className="form-note">Set the initial password twice. If the new user cannot sign in, select Manage beside their account to reset it.</p><form onSubmit={create} className="record-form"><FormNote/><Field>Login<input name="login" required maxLength="160" autoComplete="off"/></Field><Field>Display name<input name="displayName" required maxLength="120"/></Field><Field>Role<select name="role" required><option value="staff_user">Staff User</option><option value="compliance_officer">Compliance Officer</option><option value="administrator">Administrator</option></select></Field><Field>Initial password<input name="password" type="password" required minLength="12" maxLength="200" autoComplete="new-password"/></Field><Field>Confirm initial password<input name="confirmPassword" type="password" required minLength="12" maxLength="200" autoComplete="new-password"/></Field><button className="primary" disabled={busy}>{busy?'Saving...':'Create account'}</button></form></section>
  </>;
}

function SettingsPage({appearance,onAppearance}) {
  const [choice,setChoice]=useState(appearance),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>setChoice(appearance),[appearance]);
  async function save(event){event.preventDefault();setBusy(true);setError('');setNotice('');try{const settings=await api('/settings',json('PUT',{appearance:choice}));onAppearance(settings.appearance);setNotice('Appearance saved for your organisation.');}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <><p className="eyebrow">Organisation administration</p><h1>Appearance</h1><p className="subtitle">Choose a consistent style for everyone in your organisation. Each person can still switch between light and dark mode.</p><section className="panel"><h2>Workspace style</h2>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}<form onSubmit={save}><fieldset className="style-options"><legend>Choose a style</legend>{[{id:'srec',name:'SREC blue',description:'Inspired by the sponsor institution: blue, deep navy, and white.'},{id:'slate',name:'Slate',description:'A neutral graphite workspace with understated blue accents.'}].map(style=><label className="style-option" key={style.id}><input type="radio" name="appearance" value={style.id} checked={choice===style.id} onChange={()=>setChoice(style.id)}/><span className={`style-swatch swatch-${style.id}`} aria-hidden="true"/><strong>{style.name}</strong><span>{style.description}</span></label>)}</fieldset><button className="primary" disabled={busy}>{busy?'Saving...':'Save appearance'}</button></form></section></>;
}

function App(){
  const [shadowFields,setShadowFields]=useState({}),[shadowBusy,setShadowBusy]=useState(false);
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('aitrace-theme')==='dark'?'dark':'light'}catch{return'light'}});
  const [appearance,setAppearance]=useState('srec');
  useEffect(()=>{document.documentElement.dataset.appearance=appearance},[appearance]);
  const [principal,setPrincipal]=useState(undefined),[page,setPage]=useState('overview'),[records,setRecords]=useState([]),[overview,setOverview]=useState(null),[actionSeed,setActionSeed]=useState(null),[error,setError]=useState(''),[mobileNavOpen,setMobileNavOpen]=useState(false);
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('aitrace-theme',theme)}catch{}},[theme]);
  useEffect(()=>{api('/auth/session').then(x=>setPrincipal(x.principal)).catch(()=>setPrincipal(null))},[]);
  const can=permission=>principal?.permissions.includes(permission);
  async function load(){try{const [registry,dashboard,settings]=await Promise.all([api('/registry'),api('/dashboard'),api('/settings')]);setAppearance(settings.appearance);setRecords(registry.records);setOverview(dashboard);setError('');}catch(e){if(e.message==='Authentication is required.')setPrincipal(null);else setError(e.message);}}
  useEffect(()=>{if(principal)load()},[principal]);
  async function logout(){await api('/auth/logout',json('POST',{}));setPrincipal(null);setPage('overview');setAppearance('srec');setRecords([]);setOverview(null);setError('');}
  async function shadow(event){event.preventDefault();setError('');setShadowFields({});setShadowBusy(true);const element=event.currentTarget,body=Object.fromEntries(new FormData(element));try{await api('/shadow-reports',json('POST',body));element.reset();await load();setPage('registry');}catch(e){setError(e.message);setShadowFields(e.fields||{});}finally{setShadowBusy(false)}}
  if(principal===undefined)return <main className="content"><p>Loading...</p></main>;
  if(!principal)return <><UatBanner/><header className="topbar"><Brand/><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button></header><Login onLogin={setPrincipal}/></>;
  if(principal.mustChangePassword)return <><UatBanner/><header className="topbar"><Brand/><button onClick={logout}>Sign out</button></header><main className="content"><SecurityPage principal={principal} onChanged={()=>{setPrincipal(null);setPage('overview')}}/></main></>;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar"><Brand/><p className="workspace-label">WORKSPACE</p><p className="organisation-name">{principal.organizationName}</p><button className="mobile-menu-toggle" aria-expanded={mobileNavOpen} aria-controls="workspace-navigation" onClick={()=>setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen?"Close menu":"Menu"}</button><nav id="workspace-navigation" className={mobileNavOpen?"mobile-nav-open":""} aria-label="Main navigation">{['overview','registry','assessments','actions','policies','notifications',...(can('report:export')?['reports']:[]),'guide','security',...(can('account:manage')?['accounts','configuration','settings','certificates']:[])].map(item=><button key={item} aria-current={page===item?'page':undefined} onClick={()=>{setPage(item);setMobileNavOpen(false)}}>{item==='security'?'My password':item==='settings'?'Appearance':item[0].toUpperCase()+item.slice(1)}</button>)}</nav></aside>
    <div className="workspace"><UatBanner/><header className="topbar"><div className="account-identity"><span className="greeting">Hello, {principal.displayName}</span><span className="role-label">{principal.roleLabel}</span></div><details className="account-menu" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus()}}}><summary><span>Account</span><small>Settings &amp; sign out</small></summary><div className="account-menu-panel"><button aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light':'Dark'} theme</button><button onClick={e=>{setPage('security');e.currentTarget.closest('details').open=false}}>My password</button><button onClick={logout}>Sign out</button></div></details></header>
    <main id="main-content" tabIndex="-1" className="content">{error&&<p className="error" role="alert">{error}</p>}
      {page==='overview'&&<OverviewPage overview={overview} onNavigate={setPage}/>}
      {page==='configuration'&&can('account:manage')&&<GovernanceConfiguration/>}
      {page==='certificates'&&can('account:manage')&&<CertificatesPage/>}
      {page==='registry'&&<RegistryPage principal={principal} records={records} onChanged={load} onDisclosure={shadow} disclosureFields={shadowFields} disclosureBusy={shadowBusy}/>}
      {page==='reports'&&can('report:export')&&<ReportsPage/>}
      {page==='security'&&<SecurityPage principal={principal} onChanged={()=>{setPrincipal(null);setPage('overview')}}/>}
      {page==='notifications'&&<NotificationsPage principal={principal}/>}
      {page==='policies'&&<PoliciesPage principal={principal}/>}
      {page==='actions'&&<ActionsPage principal={principal} records={records} onChanged={load} initialAction={actionSeed} onInitialActionUsed={()=>setActionSeed(null)}/>}
      {page==='assessments'&&<AssessmentsPage records={records} onChanged={load} onCreateAction={can('action:manage')?assessment=>{setActionSeed({assessmentId:assessment.id,aiUseId:assessment.ai_use_id});setPage('actions')}:undefined}/>}
      {page==='accounts'&&<AccountsPage principal={principal} onSessionEnded={()=>{setPrincipal(null);setPage('overview')}}/>}
      {page==='settings'&&can('account:manage')&&<SettingsPage appearance={appearance} onAppearance={setAppearance}/>}
      {page==='guide'&&<><p className="eyebrow">Workflow walkthrough</p><h1>How AITrace works</h1><p className="subtitle">Follow the workflow from an AI use being identified through to recorded follow-up.</p><section className="panel prose"><details open><summary>1. Register or disclose an AI use</summary><p>Register a known tool with its purpose, owner, business area and data sensitivity. If a staff member finds an unregistered tool, use the disclosure section in the Registry; it remains Not reviewed until a manager reviews it.</p><button onClick={()=>setPage('registry')}>Open registry</button></details><details><summary>2. Save and submit an assessment</summary><p>Start an assessment for a registered AI use. Drafts can be saved while information is gathered. A submitted result records the demonstration rules and explanation that produced it.</p><button onClick={()=>setPage('assessments')}>Open assessments</button></details><details><summary>3. Assign and complete follow-up</summary><p>Managers can create a linked action from a submitted assessment or create a manual action. Record an owner, due date and completion history; completion does not automatically certify or reassess the AI use.</p><button onClick={()=>setPage('actions')}>Open actions</button></details><details><summary>4. Keep policy evidence and report</summary><p>Managers attach policy topics, schedule reviews and provide authorised downloads. Use the overview and exports to review current work and record follow-up decisions.</p><button onClick={()=>setPage('policies')}>Open policies</button></details><p>AITrace supports self-assessment and governance follow-up. It does not provide legal advice, certification or automatic compliance approval.</p></section></>}    </main></div></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
