import {test,expect} from '@playwright/test';
async function login(page,identifier='admin@example.test',password='correct horse battery'){
  await page.goto('/');await page.getByLabel('Login').fill(identifier);await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  if(password==='replacement test password'){
    await expect(page.getByRole('heading',{name:'Change password',exact:true})).toBeVisible();
    await page.getByLabel('Current password').fill(password);await page.getByLabel('New password').fill('final personal password');await page.getByLabel('Confirm password').fill('final personal password');await page.getByRole('button',{name:'Change password and sign out'}).click();
    await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();await login(page,identifier,'final personal password');return;
  }
  await expect(page.getByRole('navigation')).toBeVisible();
}
test('administrator manages account passwords and access from the directory',async({page})=>{
  await login(page);await page.getByRole('button',{name:'Accounts',exact:true}).click();
  const create=page.locator('form.record-form');
  await create.getByLabel('Login').fill('managed@example.test');await create.getByLabel('Display name').fill('Managed account');await create.getByLabel('Initial password').fill('initial test password');await create.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Account created.');
  await page.getByLabel('Search accounts').fill('managed@example.test');await page.getByRole('button',{name:'Manage managed@example.test',exact:true}).click();
  await page.getByLabel(/^New password/).fill('replacement test password');await page.getByLabel('Confirm new password').fill('replacement test password');await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Password reset');
  await page.getByRole('button',{name:'Manage managed@example.test',exact:true}).click();await page.getByLabel('Account status').selectOption('disabled');await page.getByRole('button',{name:'Save access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Account access updated');
  await page.getByRole('button',{name:'Manage managed@example.test',exact:true}).click();await page.getByLabel('Account status').selectOption('active');await page.getByLabel('Account role').selectOption('compliance_officer');await page.getByRole('button',{name:'Save access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Account access updated');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await login(page,'managed@example.test','replacement test password');await expect(page.getByText('Compliance Officer',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Accounts',exact:true})).toHaveCount(0);
});
test('administrator saves styles and reloads both palettes on desktop and mobile',async({page},testInfo)=>{
  await login(page);await page.getByRole('button',{name:'Appearance',exact:true}).click();
  for(const [style,label] of [['slate','Slate'],['srec','SREC blue']]){
    await page.getByRole('radio',{name:new RegExp(label)}).check();await page.getByRole('button',{name:'Save appearance',exact:true}).click();await expect(page.getByRole('status')).toContainText('Appearance saved');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-appearance',style);
    await page.getByRole('button',{name:'Appearance',exact:true}).click();
    await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:testInfo.outputPath(`${style}-desktop.png`),fullPage:true});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Dark theme',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.waitForTimeout(200);await page.screenshot({path:testInfo.outputPath(`${style}-mobile-dark.png`),fullPage:true});await page.getByRole('button',{name:'Light theme',exact:true}).click();
  }
});
