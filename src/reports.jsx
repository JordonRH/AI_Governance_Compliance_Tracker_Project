import React,{useEffect,useState} from 'react';
import {api} from './api.js';

export function ReportsPage(){
 const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[data,setData]=useState(null),[error,setError]=useState('');
 async function load(value=date){try{setData(await api(`/dashboard?asOfDate=${value}`));setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 async function download(format){try{const blob=await api(`/reports/compliance.${format}`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aitrace-compliance-summary.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}}
 return <><p className="eyebrow">Governance reporting</p><h1>Reports</h1><p className="subtitle">Review current records with due dates evaluated against your selected date. Exports contain current records; this view does not reconstruct historical records.</p>{error&&<p className="error" role="alert">{error}</p>}<section className="panel"><div className="actions"><label className="field">Due-date reference<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button onClick={()=>load()}>Refresh view</button><button onClick={()=>download('csv')}>Export CSV</button><button className="primary" onClick={()=>download('pdf')}>Export PDF</button></div><div className="stat-grid"><article className="stat-card"><span>Recorded uses</span><strong>{data?.registry.total??0}</strong></article><article className="stat-card"><span>Not assessed</span><strong>{data?.registry.notAssessed??0}</strong></article><article className="stat-card"><span>Outstanding actions</span><strong>{data?.actions?.status==='available'?data.actions.outstanding:'—'}</strong><small>{data?.actions?.status==='available'?`${data.actions.overdue} overdue`:'Restricted for this role'}</small></article></div></section></>;
}
