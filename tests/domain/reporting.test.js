import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createComplianceCsv, createCompliancePdf } from '../../server/reporting.js';
const records=Array.from({length:95},(_,index)=>({name:`AI use ${index}`,purpose:'Synthetic',owner:'Fictional',businessArea:'Operations',dataSensitivity:'Public',approvalStatus:'Not reviewed',assessmentStatus:'Not assessed',source:'registry',updatedAt:'2026-09-25T00:00:00.000Z'}));
test('CSV includes every record and escapes fields',()=>{const csv=createComplianceCsv([{...records[0],name:'Tool, "quoted"'}]);assert.match(csv,/"Tool, ""quoted"""/);});
test('PDF paginates without silently omitting records',()=>{const pdf=createCompliancePdf(records,'Fictional SME','2026-09-25T00:00:00.000Z').toString();assert.ok(pdf.startsWith('%PDF-1.4'));assert.match(pdf,/AI use 0/);assert.match(pdf,/AI use 94/);assert.match(pdf,/Page 3 of 3/);assert.match(pdf,/\/Count 3/);});
