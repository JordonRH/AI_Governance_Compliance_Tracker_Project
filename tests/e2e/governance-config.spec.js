import {test,expect} from '@playwright/test';
test('administrator versions demo configuration and assigns bounded capabilities',async({page})=>{
  await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('navigation').waitFor();
  const baseline=await (await page.request.get('/api/governance-configuration')).json();
  await page.request.post('/api/accounts',{data:{login:'capability-test@example.test',displayName:'Fictional capability target',role:'staff_user',password:'fictional test password'}});
  try {
  await page.getByRole('button',{name:'Configuration',exact:true}).click();
  await page.getByLabel(/^personalData/).fill('Does this fictional use process personal information?');
  await page.getByRole('button',{name:'Add capability role'}).click();await page.getByLabel('Role name').fill('Fictional action manager');await page.getByLabel('action:manage',{exact:true}).check();
  await page.getByRole('button',{name:'Save new demonstration version'}).click();await expect(page.getByRole('status')).toContainText('New demonstration configuration version saved');
  await page.getByRole('button',{name:'Accounts',exact:true}).click();await page.getByRole('button',{name:'Manage capability-test@example.test',exact:true}).click();
  await expect(page.getByText(/^Effective permissions:/)).toBeVisible();await page.getByLabel('Custom capability role',{exact:true}).selectOption({label:'Fictional action manager (latest version)'});await page.getByRole('button',{name:'Save access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Account access updated');
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
