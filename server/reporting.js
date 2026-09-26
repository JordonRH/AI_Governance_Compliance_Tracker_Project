import PDFDocument from 'pdfkit';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fontPath=require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
const csvCell=value=>{
 let text=String(value??'');
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return `"${text.replaceAll('"','""')}"`;
};
export function createComplianceCsv(records,details={}){
 const headings=['Type','Name','Purpose / details','Owner / reviewer','Business area','Data sensitivity','Approval status','Assessment status','Risk result','Status','Due date','Version','Source','Updated at'];
 const rows=records.map(r=>['AI use',r.name,r.purpose,r.owner,r.businessArea,r.dataSensitivity,r.approvalStatus,r.assessmentStatus,r.riskOutcome?.label,'','', '',r.source,r.updatedAt]);
 for(const a of details.assessments||[])rows.push(['Assessment',a.aiUseName,a.explanations,a.author,'','','',a.state,a.risk,'','',a.definitionVersion,'Demonstration only',a.updatedAt]);
 for(const a of details.actions||[])rows.push(['Action',a.title,a.aiUseName,a.owner,'','','','', '',a.status,a.dueDate,a.version,'Action tracker',a.updatedAt]);
 for(const p of details.policies||[])rows.push(['Policy',p.title,p.checklist,p.reviewer,'','','','','',p.reviewedAt?'Reviewed':'Review pending',p.reviewDue,p.version,p.filename,p.createdAt]);
 return '\uFEFF'+[headings,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export async function createCompliancePdf(records,organizationName,generatedAt=new Date().toISOString(),details={}){
 const doc=new PDFDocument({size:'A4',margin:45,bufferPages:true,info:{Title:'AITrace governance summary',Author:'AITrace'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
 doc.font(fontPath);
 const heading=(title)=>{if(doc.y>690)doc.addPage();doc.moveDown(.6).fontSize(15).fillColor('#00306e').text(title).moveDown(.4).fontSize(10).fillColor('#172742')};
 const paragraph=text=>{doc.fontSize(10).fillColor('#172742').text(String(text),{width:505,lineGap:3}).moveDown(.5)};
 doc.fontSize(22).fillColor('#00306e').text('AI governance summary');
 paragraph(organizationName);paragraph(`Generated ${generatedAt}`);
 paragraph('Prototype self-assessment evidence. Demonstration risk rules are not sponsor-approved policy, legal advice, or compliance certification.');
 paragraph(`${records.length} AI uses | ${(details.actions||[]).length} actions | ${(details.policies||[]).length} policy versions`);
 heading('AI use register');
 if(!records.length)paragraph('No AI uses recorded.');
 for(const r of records){heading(r.name);paragraph(`Area: ${r.businessArea} | Owner: ${r.owner}`);paragraph(`Purpose: ${r.purpose}`);paragraph(`Data sensitivity: ${r.dataSensitivity} | Approval: ${r.approvalStatus}`);paragraph(`Assessment: ${r.assessmentStatus} | Risk: ${r.riskOutcome?.label||'Not assessed'}`)}
 heading('Assessment evidence');
 if(!details.assessments?.length)paragraph('No submitted assessments.');
 for(const a of details.assessments||[]){heading(a.aiUseName);paragraph(`Definition: ${a.definitionVersion} | Risk: ${a.risk}`);paragraph(a.explanations)}
 heading('Compliance actions');
 if(!details.actions?.length)paragraph('No actions recorded.');
 for(const a of details.actions||[]){heading(a.title);paragraph(`${a.aiUseName} | ${a.status} | Due ${a.dueDate}`);paragraph(`Owner: ${a.owner} | Revision ${a.version}`)}
 heading('Policy evidence');
 if(!details.policies?.length)paragraph('No policy versions recorded.');
 for(const p of details.policies||[]){heading(`${p.title} / version ${p.version}`);paragraph(`Reviewer: ${p.reviewer} | Review due: ${p.reviewDue}`);paragraph(`File: ${p.filename} | Checklist topics: ${p.checklist||'None'}`)}
 const range=doc.bufferedPageRange();for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.fontSize(8).fillColor('#586b85').text(`AITrace | Page ${i+1} of ${range.count}`,45,805,{lineBreak:false})}
 doc.end();return done;
}
