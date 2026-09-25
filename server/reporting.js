const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
export function createComplianceCsv(records) {
  const headings=['Name','Purpose','Owner','Business area','Data sensitivity','Approval status','Assessment status','Source','Updated at'];
  return [headings,...records.map(record=>[record.name,record.purpose,record.owner,record.businessArea,record.dataSensitivity,record.approvalStatus,record.assessmentStatus,record.source,record.updatedAt])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
function safeText(value){return String(value).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)').replace(/[^\x20-\x7E]/g,'?');}
export function createCompliancePdf(records, organizationName, generatedAt=new Date().toISOString()) {
  const rows=records.map(record=>`${record.name} | ${record.businessArea} | ${record.dataSensitivity} | ${record.approvalStatus} | ${record.assessmentStatus}`);
  const chunks=[];for(let index=0;index<Math.max(rows.length,1);index+=40)chunks.push(rows.slice(index,index+40));
  const pageCount=chunks.length,fontId=3+pageCount*2,objects=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds=chunks.map((_,index)=>3+index*2);
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  chunks.forEach((chunk,index)=>{
    const pageId=3+index*2,contentId=pageId+1;
    const lines=[`AI governance compliance summary - ${organizationName}`,`Generated ${generatedAt}`,`Recorded AI uses: ${records.length} | Page ${index+1} of ${pageCount}`,'',...(chunk.length?chunk:['No AI uses recorded.'])];
    const stream=['BT','/F1 9 Tf','42 800 Td',...lines.flatMap((line,lineIndex)=>lineIndex?['0 -17 Td',`(${safeText(line)}) Tj`]:[`(${safeText(line)}) Tj`]),'ET'].join('\n');
    objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId]=`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let output='%PDF-1.4\n',offsets=[0];
  for(let id=1;id<=fontId;id++){offsets[id]=Buffer.byteLength(output);output+=`${id} 0 obj\n${objects[id]}\nendobj\n`;}
  const xref=Buffer.byteLength(output);output+=`xref\n0 ${fontId+1}\n0000000000 65535 f \n`;
  for(let id=1;id<=fontId;id++)output+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
  output+=`trailer\n<< /Size ${fontId+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}
