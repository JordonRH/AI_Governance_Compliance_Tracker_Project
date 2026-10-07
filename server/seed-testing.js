import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from './database.js';
import {createServer} from 'node:http';
import {createAccount,login,revokeRequestSession} from './auth.js';
import {createApp} from './app.js';
import {defaults} from './governance-config.js';
import {testingAccounts,customRoles,scenarios} from './testing-fixtures.js';

const options={};
for(let index=2;index<process.argv.length;index+=2){
  const key=process.argv[index],value=process.argv[index+1];
  if(!['--organization-id','--output-dir'].includes(key)||!value||value.startsWith('--')||options[key])throw new Error('Usage: npm run testing:seed -- --organization-id <existing-id> [--output-dir <local-directory>]');
  options[key]=value;
}
const organizationId=options['--organization-id'],password=process.env.AITRACE_ACCOUNT_PASSWORD;
if(!organizationId)throw new Error('Choose an existing test organisation with --organization-id.');
if(typeof password!=='string'||password.length<12||password.length>200)throw new Error('Set AITRACE_ACCOUNT_PASSWORD to a test password of 12 to 200 characters.');
const databasePath=resolve(process.env.DATABASE_PATH||'data/aitrace.sqlite');
if(!existsSync(databasePath))throw new Error('Initialize the application database and organisation before seeding.');
const outputDir=resolve(options['--output-dir']||resolve(dirname(databasePath),'testing'));
const db=openDatabase(databasePath);
let server,adminCookie,backup;
const ownCookies=new Set();

function configuration(scenario){
  return {
    questions:[...defaults().questions,...scenario.questions.map(([label,required],index)=>({id:`additional-test-${scenario.key}-${index+1}`,label,topic:'TEST scenario: '+scenario.name,required}))],
    businessAreas:scenario.areas,customRoles,
    workflow:{allowLinkedActions:scenario.linked!==false,mandatoryPolicyReading:scenario.reading,requireInProgressBeforeCompletion:scenario.progress,allowReopen:scenario.reopen}
  };
}
const editable=value=>({questions:value.questions,businessAreas:value.businessAreas||[],customRoles:value.customRoles,workflow:value.workflow});

try{
  if(db.prepare('SELECT MAX(version) version FROM schema_migrations').get().version!==12)throw new Error('Upgrade the application database before seeding; this command does not migrate it.');
  const organization=db.prepare('SELECT name FROM organizations WHERE id=?').get(organizationId);
  if(!organization)throw new Error('The selected organisation does not exist.');
  // Preflight every reserved login before creating anything or changing access.
  const existingAccounts=new Map();
  for(const [name,role,displayName,capabilities] of testingAccounts){
    const account=db.prepare('SELECT * FROM accounts WHERE login=?').get(name);
    if(!account)continue;
    const sameCapabilities=JSON.stringify(JSON.parse(account.capabilities_json||'[]').sort())===JSON.stringify([...capabilities].sort());
    if(account.organization_id!==organizationId||account.role!==role||account.display_name!==displayName||account.status!=='active'||account.must_change_password||account.custom_role_json||!sameCapabilities)throw new Error(`Existing account ${name} differs from the test profile. No existing account will be overwritten.`);
    existingAccounts.set(name,account);
  }
  const versions=db.prepare('SELECT version,configuration_json FROM governance_configurations WHERE organization_id=? ORDER BY version DESC').all(organizationId);
  const existingVersions=new Map();
  for(const scenario of scenarios){
    const matches=versions.filter(row=>JSON.parse(row.configuration_json).questions.some(question=>question.topic==='TEST scenario: '+scenario.name));
    const same=matches.find(row=>JSON.stringify(editable(JSON.parse(row.configuration_json)))===JSON.stringify(configuration(scenario)));
    if(matches.length&&!same)throw new Error(`Existing test configuration ${scenario.name} differs. Review it before seeding.`);
    if(same)existingVersions.set(scenario.key,same.version);
  }
  mkdirSync(outputDir,{recursive:true});
  backup=resolve(outputDir,`before-testing-${randomUUID()}.sqlite`);
  db.prepare('VACUUM INTO ?').run(backup);
  for(const [name] of existingAccounts){
    const signed=await login(db,name,password);
    if(!signed)throw new Error(`The supplied password does not match existing test account ${name}. Passwords will not be reset.`);
    revokeRequestSession(db,{headers:{cookie:`aitrace_session=${signed.token}`}});
  }
  server=createServer(createApp(db,{allowedHostnames:['127.0.0.1','localhost'],requestBodyLimitBytes:32768,loginMaxAttempts:100,loginWindowMs:900000}));
  await new Promise((ok,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',ok)});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function request(path,method='GET',body,cookie){
    const response=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();if(!response.ok)throw new Error(`${path}: ${response.status}: ${result.error||'Request failed'}`);
    const sessionCookie=response.headers.get('set-cookie')?.split(';')[0];
    if(path==='/auth/login'&&sessionCookie)ownCookies.add(sessionCookie);
    if(path==='/auth/logout'&&cookie)ownCookies.delete(cookie);
    return {data:result,cookie:sessionCookie};
  }
  function audit(id,actorId){db.prepare('INSERT INTO account_audit(organization_id,actor_id,account_id,action,created_at) VALUES(?,?,?,?,?)').run(organizationId,actorId,id,'test-account-created:operator-authorized',new Date().toISOString())}
  let bootstrap=existingAccounts.get('test.admin');
  if(!bootstrap){
    const [name,role,displayName]=testingAccounts[0];
    const id=await createAccount(db,{organizationId,organizationName:organization.name,login:name,role,displayName,password});bootstrap={id};audit(id,id);
  }
  adminCookie=(await request('/auth/login','POST',{login:'test.admin',password})).cookie;
  const before=(await request('/governance-configuration','GET',null,adminCookie)).data,accounts=[];
  for(const [name,role,displayName,capabilities] of testingAccounts){
    let account=existingAccounts.get(name)||(name==='test.admin'?bootstrap:null);
    if(!account){
      account=(await request('/accounts','POST',{login:name,role,displayName,password},adminCookie)).data;audit(account.id,bootstrap.id);
      if(capabilities.length)await request('/accounts/'+account.id,'PATCH',{role,status:'active',capabilities},adminCookie);
    }
    const signed=await request('/auth/login','POST',{login:name,password});
    const principal=(await request('/auth/session','GET',null,signed.cookie)).data.principal;
    if(principal.role!==role||capabilities.some(p=>!principal.permissions.includes(p)))throw new Error('Account verification failed: '+name);
    const response=await fetch(base+'/reports/snapshot',{headers:{Cookie:signed.cookie}});
    if(response.status!==(principal.permissions.includes('report:export')?200:403))throw new Error('Report permission verification failed: '+name);
    await request('/auth/logout','POST',{},signed.cookie);
    accounts.push({login:name,role,displayName,capabilities,id:account.id});
  }
  const configurations=[];
  for(const scenario of scenarios){
    let version=existingVersions.get(scenario.key);
    if(version===undefined){
      const latest=(await request('/governance-configuration','GET',null,adminCookie)).data;
      version=(await request('/governance-configuration','PUT',{expectedVersion:latest.version,...configuration(scenario),activate:false,approvalReference:'Fictional test scenario: '+scenario.name},adminCookie)).data.version;
    }
    configurations.push({...scenario,version});
  }
  const policyTitle='TEST ONLY - Fictional governance acknowledgement policy';
  if(!(await request('/policies','GET',null,adminCookie)).data.policies.some(p=>p.title===policyTitle)){
    const reviewDate=new Date();reviewDate.setUTCFullYear(reviewDate.getUTCFullYear()+1);
    await request('/policies','POST',{title:policyTitle,filename:'fictional-testing-policy.txt',mediaType:'text/plain',content:Buffer.from('FICTIONAL TEST CONTENT ONLY. This attachment exercises versioned policy acknowledgements. Use fictional data, record a human reviewer, test the intended use and explain AI involvement. This is not a real-world approved policy.').toString('base64'),reviewerId:accounts.find(a=>a.login==='test.policy').id,reviewDue:reviewDate.toISOString().slice(0,10),checklist:defaults().questions.map(q=>q.id)},adminCookie);
  }
  const after=(await request('/governance-configuration','GET',null,adminCookie)).data;
  if(after.activeVersion!==before.activeVersion||after.lifecycleRevision!==before.lifecycleRevision)throw new Error('Activation changed during seeding. Review concurrent administrator activity.');
  const manifest={organizationId,accounts,configurations,activeVersion:after.activeVersion,backup};
  writeFileSync(resolve(outputDir,'manifest.json'),JSON.stringify(manifest,null,2));
  const catalogue=['# Fictional testing catalogue','','Organisation: '+organization.name,'','Use the password supplied to the seed command. It is not written to these files.','','## Accounts','','| Login | Fixed role | Extra capabilities |','| --- | --- | --- |',...accounts.map(a=>`| ${a.login} | ${a.role} | ${a.capabilities.join(', ')||'None'} |`),'','## Configuration versions','','| Version | Scenario | Business areas | Policy acknowledgement | In Progress required | Reopen | Assessment links |','| --- | --- | --- | --- | --- | --- | --- |',...configurations.map(c=>`| ${c.version} | ${c.name} | ${c.areas.join(', ')||'All'} | ${c.reading?'Required':'Optional'} | ${c.progress?'Yes':'No'} | ${c.reopen?'Yes':'No'} | ${c.linked===false?'No':'Yes'} |`),'',`Active version remains ${after.activeVersion??'retired'}. Newly created versions are saved drafts.`,'','Open Configuration > Version history to inspect and activate a saved version. Existing assessment/action snapshots retain their settings. Every variant includes five TEST role templates; activate the version before assigning a template from Accounts. Specialised test accounts use direct capabilities.','','A fictional policy supports acknowledgement testing. Area names must match Registry exactly. Scoring remains synthetic.','','Verification: 18 successful logins and role/capability/report-access checks. Temporary verification sessions are revoked.','','Backup: '+backup,''];
  writeFileSync(resolve(outputDir,'catalogue.md'),catalogue.join('\n'));
  console.log(JSON.stringify({accounts:accounts.length,configurations:configurations.map(c=>({version:c.version,name:c.name})),activeVersion:after.activeVersion,catalogue:resolve(outputDir,'catalogue.md'),backup},null,2));
}finally{
  for(const cookie of ownCookies)revokeRequestSession(db,{headers:{cookie}});
  if(server?.listening)await new Promise(ok=>server.close(ok));
  db.close();
}
