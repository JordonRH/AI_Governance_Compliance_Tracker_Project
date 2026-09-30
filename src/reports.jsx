import React,{useEffect,useState} from 'react';
import {api} from './api.js';

const colours=['#1976d2','#a455c6','#d77b18','#168877','#cf526d','#6574bf','#657d39','#a36442'];
const percent=(count,total)=>total?Math.round(count/total*1000)/10:0;

function Breakdown({report,chart,onFilter}){
 let offset=0;
 return <figure className="report-figure">
  <figcaption className="sr-only">{report.title}: {report.total} {report.unit}. Exact counts and percentages follow.</figcaption>
  {chart==='donut'&&<div className="report-donut" aria-hidden="true"><svg viewBox="0 0 200 200">
   <circle cx="100" cy="100" r="72" fill="none" stroke="var(--border)" strokeWidth="24"/>
   {report.buckets.map((bucket,index)=>{if(!bucket.count)return null;const share=bucket.count/report.total*100,start=offset;offset+=share;return <circle key={bucket.label} cx="100" cy="100" r="72" pathLength="100" fill="none" stroke={colours[index%colours.length]} strokeWidth="24" strokeDasharray={`${share} ${100-share}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"/>})}
   <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="30" fontWeight="650">{report.total}</text>
   <text x="100" y="122" textAnchor="middle" fill="var(--muted)" fontSize="12">total</text>
  </svg></div>}
  {chart==='table'?<div className="table-wrap"><table><caption className="sr-only">Status breakdown</caption><thead><tr><th scope="col">Status / category</th><th scope="col">Count</th><th scope="col">Share</th></tr></thead><tbody>{report.buckets.map(bucket=><tr key={bucket.label}><th scope="row">{bucket.label}</th><td>{bucket.count}</td><td>{percent(bucket.count,report.total)}%</td></tr>)}</tbody></table></div>:
  <div className="report-breakdown">{report.buckets.map((bucket,index)=><button className="report-bar-row" key={bucket.label} onClick={()=>onFilter(bucket.label)} aria-label={`Show ${bucket.label} records: ${bucket.count}`}>
   <span className="report-bar-label">{chart==='donut'&&<span className="report-swatch" style={{background:colours[index%colours.length]}} aria-hidden="true"/>}{bucket.label}</span><strong>{bucket.count} <small>({percent(bucket.count,report.total)}%)</small></strong>
   {chart==='bar'&&<span className="report-track" aria-hidden="true"><span style={{width:`${percent(bucket.count,report.total)}%`}}/></span>}
  </button>)}</div>}
  {!report.total&&<p className="report-empty">No {report.unit} captured at this date. Counts are zero; no data is inferred.</p>}
 </figure>;
}

export function ReportsPage(){
 const today=new Date().toISOString().slice(0,10),[date,setDate]=useState(today),[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState('registry'),[chart,setChart]=useState('bar'),[status,setStatus]=useState(''),[search,setSearch]=useState('');
 async function load(value=date){setBusy(true);try{setData(await api(`/reports/snapshot?asOfDate=${encodeURIComponent(value)}`));setStatus('');setSearch('');setError('')}catch(e){setData(null);setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 async function download(format,full=false){try{const reportQuery=full?'':`&report=${selected}`,blob=await api(`/reports/compliance.${format}?asOfDate=${encodeURIComponent(data.asOfDate)}${reportQuery}`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aitrace-${full?'governance':selected}-${data.asOfDate}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}}
 const report=data?.reports.find(row=>row.id===selected),current=Boolean(data&&data.asOfDate===date&&!busy);
 const rows=(report?.rows||[]).filter(row=>(!status||row.status===status)&&(!search||[row.name,row.status,row.area,row.owner].some(value=>String(value||'').toLowerCase().includes(search.toLowerCase()))));
 function select(id){setSelected(id);setStatus('');setSearch('')}
 return <div className="reports-page"><p className="eyebrow">Governance intelligence</p><h1>Reports</h1><p className="subtitle">Explore your governance position, switch between reports and see the records behind every count.</p>
 {error&&<p className="error" role="alert">{error}</p>}
 <section className="panel report-toolbar" aria-label="Report date and exports">
  <div className="report-date-controls"><label className="field">As at date<input type="date" max={today} value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label><button disabled={busy||!date} onClick={()=>load()}>{busy?'Loading...':'Refresh view'}</button></div>
  <div><div className="actions"><button disabled={!current} onClick={()=>download('csv')}>Export CSV</button><button className="primary" disabled={!current} onClick={()=>download('pdf')}>Export PDF</button></div><small>Exports include the selected report's full breakdown and records.</small></div>
 </section>
 {data&&<><div className="report-context"><p>Showing {data.asOfDate} (UTC).</p><p>History captured from {data.coverageStart}. Earlier states are unavailable.</p><p>Each date shows the end of that UTC day. Today's figures change as records are saved.</p></div>
 {!current&&!busy&&<p className="notice" role="status">Date changed. Refresh the view to load this date; exports are paused until it matches.</p>}
 <div className="report-selector" role="group" aria-label="Choose a report">{data.reports.map(item=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>select(item.id)}><span>{item.title}</span><strong>{item.total}</strong><small>{item.unit}</small></button>)}</div>
 {report&&<section className="panel report-analysis" aria-label={report.title}>
  <div className="section-heading"><div><p className="eyebrow">Selected report</p><h2>{report.title}</h2><p className="form-note">{report.description}</p></div><div className="view-switcher" role="group" aria-label="Chart style">{[['bar','Bar chart'],['donut','Doughnut chart'],['table','Data table']].map(([id,label])=><button key={id} aria-pressed={chart===id} onClick={()=>setChart(id)}>{label}</button>)}</div></div>
  <div className="report-metrics"><p><strong>{report.total}</strong> {report.unit}</p><p><strong>{report.buckets.filter(b=>b.count).length}</strong> populated categories</p>{selected==='actions'&&<p><strong>{data.actions.overdue}</strong> overdue at this date</p>}</div>
  <Breakdown report={report} chart={chart} onFilter={setStatus}/>
  <div className="report-record-heading"><div><h3>Underlying records</h3><p className="form-note">{rows.length} of {report.total} shown. List filters do not change the report totals or exports.</p></div><div className="report-list-filters"><label className="field">Filter records by status / category<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All categories</option>{report.buckets.map(b=><option key={b.label}>{b.label}</option>)}</select></label><label className="field">Search report records<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, area or owner"/></label></div></div>
  {rows.length?<div className="table-wrap report-record-table"><table><caption className="sr-only">{report.title} underlying records as at {data.asOfDate}</caption><thead><tr><th scope="col">Record</th><th scope="col">Status / category</th><th scope="col">{selected==='policies'?'Version':selected==='actions'?'AI use':'Business area'}</th>{['actions','policies'].includes(selected)&&<th scope="col">Due date</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.name}</td><td><span className="status">{row.status}</span></td><td>{selected==='policies'?`v${row.version}`:selected==='actions'?row.aiUseName:row.area||'—'}</td>{['actions','policies'].includes(selected)&&<td>{row.dueDate}</td>}</tr>)}</tbody></table></div>:<p className="report-empty">No matching records. Choose another category or clear your search.</p>}
 </section>}
 <details className="panel accordion"><summary>Full governance evidence export</summary><p>Download all recorded AI uses, submitted assessment evidence, actions and policy versions for {data.asOfDate}. Use this for the complete evidence bundle.</p><div className="actions"><button disabled={!current} onClick={()=>download('csv',true)}>Full governance CSV</button><button disabled={!current} onClick={()=>download('pdf',true)}>Full governance PDF</button></div></details>
 </>}
 </div>;
}
