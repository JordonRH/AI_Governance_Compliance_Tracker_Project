import {test,expect} from '@playwright/test';
const restoreConfigurations=new WeakMap();
test.afterEach(async({page})=>{
  const baseline=restoreConfigurations.get(page);if(!baseline)return;
  const current=await (await page.request.get('/api/governance-configuration')).json();
  await page.request.put('/api/governance-configuration',{data:{expectedVersion:current.version,questions:baseline.questions,businessAreas:baseline.businessAreas||[],customRoles:baseline.customRoles,workflow:baseline.workflow}});
  restoreConfigurations.delete(page);
});
test('administrator versions demo configuration and assigns bounded capabilities',async({page})=>{
  await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('navigation').waitFor();
  const baseline=await (await page.request.get('/api/governance-configuration')).json();
  await page.request.post('/api/accounts',{data:{login:'capability-test@example.test',displayName:'Fictional capability target',role:'staff_user',password:'fictional test password'}});
  try {
  await page.getByRole('button',{name:'Configuration',exact:true}).click();
  await page.getByLabel('Question 1 wording').fill('Does this fictional use process personal information?');
  await page.getByRole('button',{name:'Custom capability roles',exact:true}).click();await page.getByRole('button',{name:'Add capability role'}).click();await page.getByLabel('Role name').fill('Fictional action manager');await page.getByLabel('Manage actions',{exact:true}).check();
  await page.getByRole('button',{name:'Save and activate version'}).click();await expect(page.getByRole('status')).toContainText('Configuration version saved and activated');
  await page.getByRole('button',{name:'Accounts',exact:true}).click();await page.getByRole('button',{name:'Manage capability-test@example.test',exact:true}).click();
  await expect(page.getByText(/^Effective permissions:/)).toBeVisible();await page.getByLabel('Custom capability role',{exact:true}).selectOption({label:'Fictional action manager (active version)'});await page.getByRole('button',{name:'Save access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Account access updated');
  // Restore access so the shared browser fixture remains deterministic.
  await page.getByRole('button',{name:'Manage capability-test@example.test',exact:true}).click();await page.getByLabel('Custom capability role',{exact:true}).selectOption('');await page.getByRole('button',{name:'Save access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Account access updated');
  } finally {
    const latest=await (await page.request.get('/api/governance-configuration')).json();
    await page.request.put('/api/governance-configuration',{data:{expectedVersion:latest.version,questions:baseline.questions,customRoles:baseline.customRoles,workflow:baseline.workflow}});
  }
});
test('account menu works with keyboard and stays in view on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const menu=page.locator('.account-menu');await menu.locator('summary').click();await expect(menu.getByRole('button',{name:'My password'})).toBeVisible();const box=await menu.locator('.account-menu-panel').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(844);await menu.getByRole('button',{name:'My password'}).focus();await page.keyboard.press('Escape');await expect(menu).not.toHaveAttribute('open');await expect(menu.locator('summary')).toBeFocused();
});

test('saved configuration activation enforces policy acknowledgements and preserves entered answers',async({page})=>{
  await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('navigation').waitFor();
  const baseline=await (await page.request.get('/api/governance-configuration')).json();
  restoreConfigurations.set(page,baseline);
  const record=await (await page.request.post('/api/registry',{data:{name:'Fictional approval workflow',owner:'Fictional team',businessArea:'Operations',purpose:'Synthetic workflow testing.',dataDescription:'Fictional data only.',dataSensitivity:'Public',approvalStatus:'Not reviewed'}})).json();
  const accounts=await (await page.request.get('/api/accounts')).json(),reviewerId=accounts.accounts.find(a=>a.role==='administrator').id;
  await page.request.post('/api/policies',{data:{title:'Fictional required browser policy',filename:'required.txt',mediaType:'text/plain',content:Buffer.from('Fictional required reading.').toString('base64'),reviewerId,reviewDue:'2027-01-01',checklist:['personalData']}});
  await page.reload();await page.getByRole('navigation').waitFor();
    await page.getByRole('button',{name:'Configuration',exact:true}).click();await page.getByRole('button',{name:'Workflow settings',exact:true}).click();await page.getByLabel('Require policy acknowledgement before submission').check();await page.getByRole('button',{name:'Assessment requirements',exact:true}).click();await page.getByRole('button',{name:'Add evidence question'}).click();
    const additional=page.locator('.question-card').filter({has:page.getByRole('button',{name:'Remove additional question'})});await additional.getByRole('textbox').first().fill('Has fictional evidence been collected?');
    await page.getByRole('button',{name:'Save draft version'}).click();await expect(page.getByRole('status')).toContainText('Draft version saved');
    const draft=await (await page.request.get('/api/governance-configuration')).json();expect(draft.activeVersion).toBe(baseline.activeVersion);
    await page.getByRole('button',{name:'Version history',exact:true}).click();await page.getByText(new RegExp(`^Version ${draft.version} /`)).click();await page.getByRole('button',{name:`Activate version ${draft.version}`,exact:true}).click();await expect(page.getByRole('status')).toContainText(`Version ${draft.version} activated`);
    await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByLabel('AI use').selectOption(record.id);await page.getByRole('button',{name:'Start assessment'}).click();
    for(const label of ['Does this AI use','Is a responsible person','Has the tool','Are affected people','Has fictional evidence'])await page.getByLabel(label).selectOption('true');
    await page.getByRole('button',{name:'Submit assessment'}).click();await expect(page.getByRole('alert')).toContainText('Acknowledge each required policy version');
    const requiredNames=await page.getByRole('button',{name:/^I have read /}).allTextContents();
    for(const name of requiredNames){const acknowledge=page.getByRole('button',{name,exact:true});await acknowledge.click();await expect(acknowledge).toHaveCount(0);}
    await expect(page.getByLabel('Has fictional evidence')).toHaveValue('true');await page.getByRole('button',{name:'Submit assessment'}).click();await expect(page.getByRole('heading',{name:'Assessment result',exact:true})).toBeVisible();await expect(page.getByText(/Acknowledged by/).first()).toBeVisible();
    await page.getByRole('button',{name:'Configuration',exact:true}).click();await page.getByRole('button',{name:'Version history',exact:true}).click();await page.getByRole('button',{name:'Retire active version'}).click();await expect(page.getByRole('status')).toContainText('retired');
    await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByLabel('AI use').selectOption(record.id);await page.getByRole('button',{name:'Start assessment'}).click();await expect(page.getByRole('alert')).toContainText('Configuration is retired');

});

test('reports use one selected date for the view and CSV/PDF exports and reject unavailable history',async({page})=>{
  await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('navigation').getByRole('button',{name:'Reports',exact:true}).click();await expect(page.getByText(/^History captured from/)).toBeVisible();
  await page.getByLabel('To date').fill('2020-01-01');await page.getByRole('button',{name:'Refresh view'}).click();await expect(page.getByRole('alert')).toContainText('earlier states were not captured');await expect(page.getByRole('button',{name:'Export CSV'})).toBeDisabled();
  const today=new Date().toISOString().slice(0,10);await page.getByLabel('To date').fill(today);await page.getByRole('button',{name:'Refresh view'}).click();await expect(page.getByText(`Showing ${today} (UTC).`)).toBeVisible();
  for(const format of ['CSV','PDF']){const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:`Export ${format}`,exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe(`aitrace-registry-${today}.${format.toLowerCase()}`);expect(await download.failure()).toBeNull();}
});
