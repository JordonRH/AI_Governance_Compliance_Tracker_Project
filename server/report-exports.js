import PDFDocument from 'pdfkit';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fontPath=require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
const share=(count,total)=>total?Math.round(count/total*1000)/10:0;
const cell=value=>{
  let text=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return `"${text.replaceAll('"','""')}"`;
};

export function createReportCsv(report,snapshot){
  const rows=[['Report',report.title],['As at',`${snapshot.asOfDate} UTC`],['History captured from',snapshot.coverageStart],['Scope',report.description],['Total',report.total,report.unit],[],['Status / category','Count','Share (%)']];
  for(const bucket of report.buckets)rows.push([bucket.label,bucket.count,share(bucket.count,report.total)]);
  rows.push([],['Record ID','Record','Status / category','Business area','Owner / account ID','AI use','Due date','Version']);
  for(const row of report.rows)rows.push([row.id,row.name,row.status,row.area,row.owner,row.aiUseName,row.dueDate,row.version]);
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}

export async function createReportPdf(report,snapshot,organizationName){
  const doc=new PDFDocument({size:'A4',margin:45,bufferPages:true,info:{Title:`AITrace ${report.title}`,Author:'AITrace'}}),chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
  doc.font(fontPath);
  const room=height=>{if(doc.y+height>755)doc.addPage()};
  const line=(text,size=10)=>{room(35);doc.fontSize(size).fillColor('#172742').text(String(text),{lineGap:3}).moveDown(.5)};
  line(report.title,23);line(organizationName);line(`As at ${snapshot.asOfDate} (end of UTC day).`);line(`History captured from ${snapshot.coverageStart}. Generated ${new Date().toISOString()}.`);
  line(report.description);line(`${report.total} ${report.unit}`,16);
  for(const bucket of report.buckets){
    doc.fontSize(10);room(doc.heightOfString(bucket.label)+50);
    line(`${bucket.label}: ${bucket.count} (${share(bucket.count,report.total)}%)`);
    const y=doc.y;doc.rect(45,y,505,8).fill('#e5edf5');
    if(bucket.count)doc.rect(45,y,505*bucket.count/report.total,8).fill('#0065c3');
    doc.y=y+20;
  }
  room(70);line('Underlying records',16);
  if(!report.rows.length)line('No records captured at this date.');
  for(const row of report.rows){
    room(90);line(row.name,12);line([row.status,row.area,row.aiUseName,row.dueDate&&`Due ${row.dueDate}`,row.version&&`Version ${row.version}`].filter(Boolean).join(' | '));
    if(row.owner)line(`Owner / account ID: ${row.owner}`);
  }
  const pages=doc.bufferedPageRange();
  for(let index=0;index<pages.count;index++){doc.switchToPage(index);doc.fontSize(8).fillColor('#586b85').text(`AITrace | ${snapshot.asOfDate} UTC | Page ${index+1} of ${pages.count}`,45,805,{lineBreak:false})}
  doc.end();return done;
}
