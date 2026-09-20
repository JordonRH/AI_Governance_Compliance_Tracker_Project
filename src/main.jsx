import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './themes.css';

const categories = ['Education', 'Administration', 'Research'];
const blankRecord = { name: '', purpose: '', owner: '', category: 'Education', dataDescription: '' };
const pages = { overview: 'Overview', registry: 'AI registry', governance: 'Governance', guide: 'Project guide' };

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error || 'Request failed.'), { fields: body.fields });
  return body;
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('aitrace-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('aitrace-theme', theme); } catch { /* Storage is optional. */ }
  }, [theme]);
  const [viewing, setViewing] = useState(null);
  const detailDialog = useRef(null);
  useEffect(() => { if (viewing) detailDialog.current.showModal(); }, [viewing]);
  const [page, setPage] = useState('overview');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankRecord);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const dialog = useRef(null);
  const nameInput = useRef(null);

  async function load() {
    setLoading(true);
    setError('');
    try { const data = await request('/registry'); setRecords(data.records); }
    catch (err) { setError(err.message || 'Cannot connect to the local server.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function navigate(next) { setPage(next); setNotice(''); }
  function openForm(record = null) {
    setEditing(record);
    setForm(record ? { ...record } : { ...blankRecord });
    setFormError(''); setFieldErrors({});
    dialog.current.showModal();
    nameInput.current?.focus();
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setFormError(''); setFieldErrors({});
    try {
      const saved = await request(editing ? `/registry/${editing.id}` : '/registry', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      setRecords(current => editing ? current.map(record => record.id === saved.id ? saved : record) : [saved, ...current]);
      dialog.current.close();
      setNotice(editing ? 'Record updated.' : 'AI use registered.');
      setQuery(''); setCategory('All categories'); setPage('registry');
    } catch (err) { setFormError(err.message); setFieldErrors(err.fields || {}); }
    finally { setSaving(false); }
  }
  async function addExamples() {
    setSeeding(true); setNotice('');
    try {
      const { added } = await request('/examples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await load(); setNotice(added ? `${added} fictional examples added.` : 'Fictional examples are already in the registry.');
    } catch (err) { setError(err.message); }
    finally { setSeeding(false); }
  }
  const filtered = records.filter(record => (category === 'All categories' || record.category === category) &&
    [record.name, record.owner, record.purpose].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  const formatDate = value => new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

  function registryTable(items) {
    return <div className="table-scroll"><table><caption className="sr-only">Registered AI uses</caption>
      <thead><tr><th scope="col">AI use</th><th scope="col">Category</th><th scope="col">Owner</th><th scope="col">Assessment</th><th scope="col"><span className="sr-only">Record actions</span></th></tr></thead>
      <tbody>{items.map(record => <tr key={record.id}>
        <td><button className="record-link" onClick={() => setViewing(record)}>{record.name}</button><span className="record-sub">Updated {formatDate(record.updatedAt)}</span></td>
        <td><span className={`category ${record.category.toLowerCase()}`}>{record.category}</span></td><td>{record.owner}</td>
        <td><span className="status">Not assessed</span></td><td><button className="text-button" aria-label={`Edit ${record.name}`} onClick={() => openForm(record)}>Edit</button></td>
      </tr>)}</tbody></table></div>;
  }
  function emptyState(search = false) {
    return <div className="empty"><span className="eyebrow">{search ? 'Refine your search' : 'Start with visibility'}</span>
      <h3>{search ? 'No matching AI uses' : 'Your AI registry starts here'}</h3>
      <p>{search ? 'Try a different name, owner or category.' : 'Record the purpose, owner and data use of your first AI tool. Use fictional information for this prototype.'}</p>
      {search ? <button className="secondary" onClick={() => { setQuery(''); setCategory('All categories'); }}>Clear filters</button> :
        <div className="button-row"><button className="primary" onClick={() => openForm()}>Register AI use</button><button className="secondary" disabled={seeding} onClick={addExamples}>{seeding ? 'Adding examples...' : 'Load fictional examples'}</button></div>}
    </div>;
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate('overview'); }}><span className="brand-mark" aria-hidden="true">A</span><span>AITrace<small>Governance workspace</small></span></a>
      <p className="nav-label">Workspace</p>
      <nav aria-label="Main navigation">{Object.entries(pages).map(([key, label], i) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}><span className="nav-number" aria-hidden="true">0{i + 1}</span>{label}</button>)}</nav>
      <div className="sidebar-footer"><span className="sidebar-tag">Capstone prototype</span><p>University of Canberra</p><small>2026-S2R-04</small></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Institution workspace <span className="topbar-divider">/</span> <strong>{pages[page]}</strong></span><div className="topbar-actions"><button className="secondary theme-toggle" aria-pressed={theme === 'dark'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>Dark theme</button><span className="local-badge">Local prototype</span></div></header>
      <main id="main" tabIndex="-1">
        <div className="page-heading"><div><p className="eyebrow">AI governance, made visible</p><h1>{pages[page]}</h1><p className="subtitle">{page === 'overview' ? 'Understand where AI is used. Build a clearer picture of governance.' : page === 'registry' ? 'A shared record of AI tools, their purpose and the people responsible.' : page === 'governance' ? 'Define the rules before drawing conclusions.' : 'A practical foundation, with a clear record of what comes next.'}</p></div>
          {['overview', 'registry'].includes(page) && <button className="primary" onClick={() => openForm()}>Register AI use</button>}
        </div>
        <div className="prototype-note">Local demonstration with fictional data. Authentication and governance assessment are not implemented yet.</div>
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <div className="error" role="alert">{error} <button className="text-button" onClick={load}>Retry loading</button></div>}

        {page === 'overview' && <>
          <section className="intro-panel"><div><span className="eyebrow">Your governance starting point</span><h2>Good oversight starts<br />with knowing what is in use.</h2><p>Bring AI use into one place. Record its purpose and data use, then prepare for a consistent governance review.</p><button className="light-button" onClick={() => navigate('registry')}>Explore the registry</button></div><div className="intro-aside"><span>01</span><p>Register first.<br />Assess with agreed rules.</p><small>No risk ratings are inferred.</small></div></section>
          <section className="metrics" aria-label="Registry summary"><article><p>Registered AI uses</p><strong>{loading || error ? 'Unavailable' : records.length}</strong><small>Recorded in this workspace</small></article><article><p>Awaiting assessment</p><strong>{loading || error ? 'Unavailable' : records.length}</strong><small>Assessment rules are not configured</small></article><article><p>Areas represented</p><strong>{loading || error ? 'Unavailable' : `${new Set(records.map(r => r.category)).size} / 3`}</strong><small>Education, administration, research</small></article></section>
          <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Institutional visibility</p><h2>AI use by area</h2></div><span className="muted">{loading || error ? 'Data unavailable' : `${records.length} total`}</span></div>
            {categories.map(name => { const count = records.filter(record => record.category === name).length; return <div className="area" key={name}><div><span>{name}</span><strong>{loading || error ? 'Unavailable' : count}</strong></div><div className="bar" aria-hidden="true"><span className={name.toLowerCase()} style={{ width: !loading && !error && records.length ? `${count / records.length * 100}%` : '0%' }} /></div></div>; })}
          </section><section className="panel next-step"><p className="eyebrow">Next decision</p><h2>Set the assessment foundation</h2><p>Questions, framework mapping and thresholds need agreement before a record can receive a risk result.</p><span className="status">Framework selection pending</span><button className="text-button" onClick={() => navigate('governance')}>View governance decisions</button></section></div>
          <section className="panel registry-panel"><div className="panel-heading"><div><p className="eyebrow">From your registry</p><h2>Latest registrations</h2></div><button className="text-button" onClick={() => navigate('registry')}>View all records</button></div>{loading ? <p className="loading" role="status">Loading registry...</p> : error ? <p className="loading">Registry could not be loaded.</p> : records.length ? registryTable(records.slice(0, 5)) : emptyState()}</section>
        </>}
        {page === 'registry' && <section className="panel registry-panel"><div className="filters"><label>Search records<input type="search" placeholder="Search by name, purpose or owner" value={query} onChange={e => setQuery(e.target.value)} /></label><label htmlFor="registry-category">Category<select aria-label="Category" id="registry-category" value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option>{categories.map(name => <option key={name}>{name}</option>)}</select></label></div><div className="result-count">{loading ? 'Loading records...' : error ? 'Data unavailable' : `${filtered.length} of ${records.length} records`}</div>{!loading && !error && (filtered.length ? registryTable(filtered) : emptyState(records.length > 0))}</section>}
        {page === 'governance' && <div className="document-grid"><section className="panel prose"><p className="eyebrow">Current state</p><h2>Assessment is not configured</h2><p>Every registered AI use is marked <strong>Not assessed</strong>. This does not mean low risk, approved or compliant.</p><p>The system currently records AI use. It does not calculate scores, recommend governance actions or certify compliance.</p><h3>Decisions needed</h3><ol><li>Select the governance framework and applicable institutional policies.</li><li>Agree assessment questions and their source mapping.</li><li>Approve rules, thresholds and the explanation for each result.</li><li>Define reviewer permissions and approval steps.</li></ol></section><section className="panel prose"><p className="eyebrow">Planned approach</p><h2>Rules people can understand</h2><p>Assessment results will be traceable to responses and approved rules. Rule versions will identify the basis of each result.</p><p>Machine learning is not required. Framework selection remains open; no institutional policy is assumed.</p><h3>Risk and approval are different</h3><p>A future risk result describes the outcome of an assessment. Approval records an authorised institutional decision. Neither is inferred from a registry entry.</p></section></div>}
        {page === 'guide' && <div className="document-grid"><section className="panel prose"><p className="eyebrow">Available today</p><h2>Review the first working flow</h2><ol><li>Register a fictional AI use with its purpose, owner and data description.</li><li>Find it in the registry using search and category filters.</li><li>Open the record to review or edit its details.</li><li>Return to the overview and check that the totals match.</li><li>Refresh the page to confirm the record is retained.</li></ol><h3>Need example records?</h3><p>Add three clearly fictional examples, one for each area. Repeating this action does not duplicate or overwrite them.</p><button className="secondary" disabled={seeding} onClick={addExamples}>{seeding ? 'Adding examples...' : 'Load fictional examples'}</button></section><section className="panel prose"><p className="eyebrow">Team review</p><h2>Build, record, review</h2><p>Jordon leads the initial work. Avnish, Ashvin and Noorpreet will review the foundation before subsequent allocation.</p><p>Capture findings, decisions and actual contributions against the relevant ticket. Proposed ownership is not a record of completed work.</p><h3>Still to come</h3><p>Authentication, role permissions, assessments, actions, document handling, reminders, reporting and Shadow AI self-reporting remain future work.</p><p>Setup instructions, design decisions and verification evidence are maintained in the repository documentation.</p></section></div>}
        <footer className="page-footer"><span>AITrace</span><span>AI Governance Compliance Tracker 2026-S2R-04</span></footer>
      </main>
    </div>
    <dialog ref={detailDialog} aria-labelledby="detail-title" onClose={() => setViewing(null)}>
      {viewing && <><div className="dialog-heading"><div><p className="eyebrow">AI registry</p><h2 id="detail-title">{viewing.name}</h2></div><button autoFocus className="text-button" onClick={() => detailDialog.current.close()}>Close</button></div>
        <dl className="record-details">{[['Responsible person or team', viewing.owner], ['Category', viewing.category], ['Purpose', viewing.purpose], ['Data used', viewing.dataDescription], ['Assessment status', 'Not assessed'], ['Created', formatDate(viewing.createdAt)], ['Updated', formatDate(viewing.updatedAt)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="form-help">Registration does not approve this AI use or establish compliance.</p>
        <div className="dialog-actions"><button className="primary" onClick={() => { detailDialog.current.close(); openForm(viewing); }}>Edit record</button></div></>}
    </dialog>
    <dialog ref={dialog} aria-labelledby="record-title" onCancel={event => { if (saving) event.preventDefault(); }}>
      <form onSubmit={save}><div className="dialog-heading"><div><p className="eyebrow">AI registry</p><h2 id="record-title">{editing ? 'Edit AI use' : 'Register AI use'}</h2></div><button type="button" className="text-button" disabled={saving} onClick={() => dialog.current.close()}>Close</button></div>
        <p className="form-help">Use fictional information. Describe the data involved without entering personal or sensitive records.</p>
        {formError && <p className="error" role="alert">{formError}</p>}
        {[
          ['name', 'AI tool or use case', 120, false], ['owner', 'Responsible person or team', 120, false]
        ].map(([key, label, max]) => <label className="field" key={key}>{label}<input required maxLength={max} value={form[key]} ref={key === 'name' ? nameInput : undefined} aria-invalid={!!fieldErrors[key]} aria-describedby={fieldErrors[key] ? `${key}-error` : undefined} onChange={e => setForm({ ...form, [key]: e.target.value })} />{fieldErrors[key] && <span id={`${key}-error`} className="field-error">{fieldErrors[key]}</span>}</label>)}
        <label className="field" htmlFor="record-category">Category<select aria-label="Category" id="record-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(name => <option key={name}>{name}</option>)}</select></label>
        {[['purpose', 'Purpose of this AI use', 2000], ['dataDescription', 'Data used', 1000]].map(([key, label, max]) => <label className="field" key={key}>{label}<textarea rows="3" required maxLength={max} value={form[key]} aria-invalid={!!fieldErrors[key]} aria-describedby={fieldErrors[key] ? `${key}-error` : undefined} onChange={e => setForm({ ...form, [key]: e.target.value })} />{fieldErrors[key] && <span id={`${key}-error`} className="field-error">{fieldErrors[key]}</span>}</label>)}
        <p className="form-help">Assessment status: Not assessed. Saving a record does not approve its use.</p><div className="dialog-actions"><button type="button" className="secondary" disabled={saving} onClick={() => dialog.current.close()}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save registration'}</button></div>
      </form>
    </dialog>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
