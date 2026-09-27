import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {openDatabase} from '../server/database.js';
import {createAccount} from '../server/auth.js';
for (const dir of ['test-results', 'output/showcase/screenshots', 'test-results/showcase-layout', 'output/pdf']) mkdirSync(dir,{recursive:true});
const fixture=resolve('test-results/showcase-'+randomUUID());mkdirSync(fixture);
const database=join(fixture,'showcase.sqlite'),db=openDatabase(database),password=randomUUID()+'-showcase';
const org={organizationId:'showcase-sme',organizationName:'Cedar SME - fictional demo'};
const admin=await createAccount(db,{...org,login:'showcase-admin',displayName:'Alex Jordan (Demo)',role:'administrator',password});
const officer=await createAccount(db,{...org,login:'showcase-officer',displayName:'Taylor Reed (Demo)',role:'compliance_officer',password});
const staff=await createAccount(db,{...org,login:'showcase-staff',displayName:'Casey Morgan (Demo)',role:'staff_user',password});
const reset=await createAccount(db,{...org,login:'showcase-reset',displayName:'Sam Lee (Demo)',role:'staff_user',password});db.close();
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('AITRACE_')&&!['PORT','DATABASE_PATH'].includes(k)));
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...env,PORT:'5188',DATABASE_PATH:database,AITRACE_CERTIFICATES_DIR:join(fixture,'certificates')},windowsHide:true,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
const base='http://127.0.0.1:5188',manifest=[];let browser;
try{
 for(let i=0;i<100;i++){if(logs.includes('AITrace local prototype'))break;if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 let cookie='';async function api(path,method='GET',body){const res=await fetch(base+'/api'+path,{method,headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(!res.ok)throw Error(path+' '+res.status+' '+await res.text());return res.json();}
 async function signIn(login){const res=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password})});if(!res.ok)throw Error('Fixture sign-in failed');cookie=res.headers.get('set-cookie').split(';')[0];}
 await signIn('showcase-admin');
 const inputs=[
 {name:'Customer enquiry assistant',owner:'Customer service team',businessArea:'Customer service',purpose:'Draft responses to common product questions for staff review.',dataDescription:'Fictional product information and synthetic customer questions.',dataSensitivity:'Public',approvalStatus:'Approved'},
 {name:'Invoice review helper',owner:'Finance team',businessArea:'Finance',purpose:'Suggest invoice categories and highlight items needing a human check.',dataDescription:'Synthetic invoice records only.',dataSensitivity:'Confidential',approvalStatus:'Not reviewed'},
 {name:'Marketing copy assistant',owner:'Marketing team',businessArea:'Marketing',purpose:'Draft promotional copy for review before publication.',dataDescription:'Fictional campaign briefs and public sample product information.',dataSensitivity:'Public',approvalStatus:'Approved'}];
 const records=[];for(const input of inputs)records.push(await api('/registry','POST',input));
 const answers=[{personalData:false,humanOversight:true,tested:true,disclosed:true},{personalData:true,humanOversight:false,tested:false,disclosed:true},{personalData:false,humanOversight:true,tested:true,disclosed:false}];
 const assessments=[];for(let i=0;i<3;i++){const a=await api('/assessments','POST',{aiUseId:records[i].id});assessments.push(await api('/assessments/'+a.id,'PUT',{expectedRevision:1,responses:answers[i],submit:true}));}
 const draft=await api('/assessments','POST',{aiUseId:records[0].id});await api('/assessments/'+draft.id,'PUT',{expectedRevision:1,responses:{personalData:false,humanOversight:true},submit:false});
 const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
 const action=await api('/actions','POST',{aiUseId:records[1].id,assessmentId:assessments[1].id,title:'Confirm invoice review safeguards',ownerAccountId:admin,dueDate:day(0)});
 await api('/actions/'+action.id,'PUT',{expectedVersion:action.version,status:'In Progress'});
 await api('/actions','POST',{aiUseId:records[2].id,assessmentId:assessments[2].id,title:'Document the customer disclosure notice',ownerAccountId:staff,dueDate:day(-1)});
 const done=await api('/actions','POST',{aiUseId:records[0].id,title:'Confirm a human reviewer for replies',ownerAccountId:officer,dueDate:day(-2)});await api('/actions/'+done.id,'PUT',{expectedVersion:done.version,status:'Complete'});
 const policy={title:'Responsible AI use policy',filename:'responsible-ai-policy.txt',mediaType:'text/plain',content:Buffer.from('Fictional showcase policy. Staff review AI outputs and use approved sample data.').toString('base64'),reviewerId:admin,reviewDue:day(0),checklist:['humanOversight','disclosed']};const p=await api('/policies','POST',policy);await api('/policies','POST',{...policy,documentId:p.documentId,content:Buffer.from('Fictional showcase policy version 2. Review outputs, document disclosures, and escalate concerns.').toString('base64')});
 await api('/policies','POST',{...policy,title:'Data handling guidance',filename:'data-handling.txt',reviewerId:officer,reviewDue:day(7),checklist:['personalData']});
 await api('/certificates/generate','POST',{});
 await api('/accounts/'+reset+'/password','POST',{password});
 await signIn('showcase-staff');await api('/shadow-reports','POST',{name:'Meeting summary tool',businessArea:'Operations',purpose:'Summarise fictional internal meeting notes for team review.',dataDescription:'Invented meeting notes only; no personal information.',dataSensitivity:'Internal'});
 await signIn('showcase-admin');await api('/reminders/run','POST',{});
 browser=await chromium.launch();let context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1.5});let page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 async function capture(id,title,role='Administrator',note=''){
  await page.waitForLoadState('networkidle');
  await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);document.querySelector('.sidebar nav')?.scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  if(await page.locator('input[type=password]').evaluateAll(inputs=>inputs.some(el=>el.value)))throw Error('Password field must be empty before capture');
  const geometry=await page.evaluate(()=>({scrollY,sidebarTop:document.querySelector('.sidebar')?.getBoundingClientRect().top??null}));
  if(geometry.scrollY!==0 || (geometry.sidebarTop!==null && geometry.sidebarTop!==0))throw Error('Capture must begin at page/sidebar top');
  await page.screenshot({path:resolve('output/showcase/screenshots',id+'.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:resolve('test-results/showcase-layout',id+'.png'),animations:'disabled'});
  if(id==='25-mobile-overview'){
   const bottom=await page.locator('.stat-grid').evaluate(el=>el.getBoundingClientRect().bottom);
   await page.screenshot({path:resolve('test-results/showcase-layout',id+'.png'),clip:{x:0,y:0,width:390,height:Math.ceil(bottom+12)},animations:'disabled'});
  }
  manifest.push({id,title,role,note,file:'screenshots/'+id+'.png',viewport:page.viewportSize(),...geometry});console.log('Captured '+id+' '+title);

 }
 async function nav(name){await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{level:1}).waitFor();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);}
 async function login(login){await page.goto(base);await page.getByLabel('Login').fill(login);await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForTimeout(450);}
 await page.goto(base);await page.getByRole('heading',{name:'Sign in',exact:true}).waitFor();await capture('01-sign-in','Sign in','Public');
 await login('showcase-admin');await page.getByRole('navigation').waitFor();await capture('02-overview','Governance overview');
 await nav('Registry');await capture('03-registry','AI use registry');
 await page.getByRole('button',{name:'Add AI use',exact:true}).click();await capture('04-register-ai-use','Register an AI use');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'View Customer enquiry assistant',exact:true}).click();await capture('05-registry-details','AI use details and history');await page.getByRole('button',{name:'Close details'}).click();
 await page.getByRole('button',{name:'Edit Invoice review helper',exact:true}).click();await capture('06-edit-ai-use','Edit an AI use');
 await nav('Assessments');await capture('07-assessment-history','Assessment history');
 await page.getByRole('row').filter({hasText:'Draft'}).getByRole('button',{name:'Open assessment'}).click();await capture('08-assessment-draft','Governance assessment draft');
 await page.getByRole('row').filter({hasText:'Invoice review helper'}).getByRole('button',{name:'Open assessment'}).click();await page.getByText('Submitted answers and source trace').click();await capture('09-assessment-result','Explainable assessment result');
 await nav('Actions');await capture('10-actions','Action register and assignment');
 const actionRow=page.getByRole('row').filter({hasText:'Confirm invoice review safeguards'});await actionRow.getByRole('button',{name:'Edit action'}).click();await actionRow.getByText('View history').click();await capture('11-action-edit-history','Action progress and history');
 await nav('Policies');await capture('12-policies','Policy library and versions');
 await page.getByRole('button',{name:'Record review',exact:true}).first().click();await capture('13-policy-review','Schedule the next policy review');
 await nav('Notifications');await capture('14-notifications','Reminder settings and inbox');
 await nav('Disclose AI use');await page.getByLabel('AI tool or use case').fill('Research brainstorming helper');await page.getByLabel('Business area').fill('Operations');await page.getByLabel('Purpose').fill('Explore ideas using fictional business scenarios.');await page.getByLabel('Data handled').fill('Synthetic notes and public sample information only.');await capture('15-disclosure','Voluntary AI use disclosure');
 await nav('Guide');await capture('16-guide','Getting started guide');
 await nav('Accounts');await capture('17-accounts','Account directory and administration');
 await page.getByRole('button',{name:'Manage showcase-staff',exact:true}).click();await capture('18-account-controls','Administrator password and access controls');
 await page.getByRole('heading',{name:'Create account',exact:true}).scrollIntoViewIfNeeded();await capture('19-create-account','Create an account', 'Administrator','Full-page original starts at the page top; PDF excerpts show focused panels.');
 await nav('Appearance');await capture('20-appearance','Organisation appearance settings');
 await nav('Certificates');await capture('21-certificates','Temporary certificates and replacement');
 await nav('My password');await capture('22-change-password','Change your password');
 await nav('Overview');await page.getByRole('button',{name:'Dark theme',exact:true}).click();await capture('23-dark-theme','Overview in dark mode');await page.getByRole('button',{name:'Light theme',exact:true}).click();
 await nav('Appearance');await page.getByRole('radio',{name:/Slate/}).check();await page.getByRole('button',{name:'Save appearance'}).click();await nav('Overview');await capture('24-slate-style','Overview in Slate style');await nav('Appearance');await page.getByRole('radio',{name:/SREC blue/}).check();await page.getByRole('button',{name:'Save appearance'}).click();
 await page.setViewportSize({width:390,height:844});await nav('Overview');await capture('25-mobile-overview','Mobile overview');await nav('Registry');await capture('26-mobile-registry','Mobile registry');
 await context.close();context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1.5});page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));await login('showcase-staff');await capture('27-staff-overview','Staff overview','Staff User');await nav('Actions');await capture('28-staff-actions','Assigned staff actions','Staff User');await nav('Policies');await capture('29-staff-policies','Staff policy access','Staff User');await nav('Notifications');await capture('30-staff-inbox','Personal staff inbox','Staff User');await context.close();
 context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1.5});page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));await login('showcase-officer');await capture('31-compliance-officer','Compliance Officer workspace','Compliance Officer');await context.close();
 context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1.5});page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));await login('showcase-reset');await page.getByText('Your password was reset.',{exact:false}).waitFor();await capture('32-required-password-change','Required password change after reset','Staff User');
 await context.close();context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1.5});page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));await login('showcase-admin');
 async function panel(id,heading){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.locator('section.panel').filter({has:page.getByRole('heading',{name:heading,exact:true})}).screenshot({path:resolve('test-results/showcase-layout',id+'.png'),animations:'disabled'});}
 await nav('Assessments');await page.getByRole('row').filter({hasText:'Draft'}).getByRole('button',{name:'Open assessment'}).click();await panel('08-assessment-draft','Assessment questions');await page.getByRole('row').filter({hasText:'Invoice review helper'}).getByRole('button',{name:'Open assessment'}).click();await page.getByText('Submitted answers and source trace').click();await panel('09-assessment-result','Assessment result');
 await nav('Guide');await panel('16-guide','A simple governance workflow');
 await nav('Registry');await page.locator('section.table-wrap').screenshot({path:resolve('test-results/showcase-layout/03-registry.png')});
 await nav('Notifications');await panel('14-notifications','My inbox');
 await nav('Certificates');await panel('21-certificates','Connection and staged certificate');
 await nav('My password');await page.locator('section.panel').screenshot({path:resolve('test-results/showcase-layout/22-change-password.png')});
 await nav('Actions');await panel('10-actions','Action register');await nav('Policies');await panel('12-policies','Policy library and versions');await nav('Accounts');await page.getByRole('button',{name:'Manage showcase-staff',exact:true}).click();await panel('18-account-controls','Casey Morgan (Demo)');
 if(pageErrors.length)throw Error('Browser errors: '+pageErrors.join('; '));writeFileSync('output/showcase/screenshots.json',JSON.stringify({capturedAt:new Date().toISOString(),dataset:'Fictional Cedar SME showcase; no live user data',viewport:'1440 x 960 desktop; 390 x 844 mobile',screens:manifest},null,2));console.log('Completed '+manifest.length+' captures with no browser page errors.');
}finally{if(browser)await browser.close();if(server.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}}
