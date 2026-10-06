import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {accountControl} from './account-menu.js';

async function login(page){await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('navigation').waitFor()}

test('report views reconcile to the snapshot, switch charts and filter their underlying records',async({page},testInfo)=>{
  await login(page);
  for(const [index,status] of ['Approved','Declined','Not reviewed'].entries()){
    const response=await page.request.post('/api/registry',{data:{name:`Fictional chart example ${index}`,owner:'Fictional reporting team',businessArea:index===0?'Finance':'Operations',purpose:'Fictional analytics example.',dataDescription:'Synthetic data only.',dataSensitivity:'Public',approvalStatus:status}});expect(response.status()).toBe(201);
  }
  await page.getByRole('navigation').getByRole('button',{name:'Reports',exact:true}).click();
  const today=new Date().toISOString().slice(0,10);await page.getByLabel('From date').fill(today);await page.getByLabel('To date').fill(today);await page.getByRole('button',{name:'Refresh view'}).click();await expect(page.getByText(new RegExp(`Showing|Period \${today}`)).first()).toBeVisible();
  const snapshot=await (await page.request.get('/api/reports/snapshot')).json();
  await expect(page.getByRole('group',{name:'Choose a report'}).getByRole('button')).toHaveCount(6);
  for(const report of snapshot.reports){
    await page.getByRole('group',{name:'Choose a report'}).getByRole('button',{name:new RegExp(`^${report.title}`)}).click();
    const region=page.getByRole('region',{name:report.title,exact:true});await expect(region.locator('.report-metrics strong').first()).toHaveText(String(report.total));
    await region.getByRole('button',{name:'Data table',exact:true}).click();
    for(const bucket of report.buckets){const row=region.getByRole('table',{name:'Status breakdown'}).getByRole('row').filter({has:page.getByRole('rowheader',{name:bucket.label,exact:true})});await expect(row.getByRole('cell').first()).toHaveText(String(bucket.count));}
  }
  await page.getByRole('group',{name:'Choose a report'}).getByRole('button',{name:/^Registry approvals/}).click();
  await page.getByRole('button',{name:'Bar chart',exact:true}).click();await page.screenshot({path:testInfo.outputPath('reports-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:/^Show Declined records:/}).click();await expect(page.getByLabel('Filter records by status / category')).toHaveValue('Declined');await expect(page.getByRole('table',{name:/underlying records/}).getByRole('cell',{name:'Fictional chart example 1',exact:true})).toBeVisible();
  await page.getByLabel('Search report records').fill('no matching fictional record');await expect(page.getByText('No matching records. Choose another category or clear your search.')).toBeVisible();
  await page.getByLabel('Search report records').fill('');await page.getByLabel('Filter records by status / category').selectOption('');
  await page.getByRole('button',{name:'Doughnut chart',exact:true}).click();await expect(page.locator('.report-donut')).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();const download=await downloadPromise;await download.saveAs(testInfo.outputPath('registry-report.pdf'));expect(await download.failure()).toBeNull();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('reports-mobile.png'),fullPage:true});
});

test('workflow editor explains changes, preserves edits across sections and protects unsaved work',async({page},testInfo)=>{
  await login(page);await page.getByRole('button',{name:'Configuration',exact:true}).click();
  await page.getByRole('button',{name:'Workflow settings',exact:true}).click();
  const required=page.getByLabel('Require In Progress before action completion'),wasChecked=await required.isChecked();await required.setChecked(!wasChecked);
  await expect(page.getByLabel('Workflow preview')).toContainText(wasChecked?'Not Started → Complete allowed':'Not Started → In Progress → Complete');
  await expect(page.getByText('You have unsaved changes.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Assessment requirements',exact:true}).click();await page.getByRole('button',{name:'Workflow settings',exact:true}).click();expect(await required.isChecked()).toBe(!wasChecked);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:testInfo.outputPath('workflow-desktop.png'),fullPage:true});
  for(const theme of ['light','dark']){
    if(await page.locator('html').getAttribute('data-theme')!==theme)await accountControl(page,theme==='light'?'Light theme':'Dark theme');
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('workflow-mobile-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Version history',exact:true}).click();await expect(page.getByText('Save your edits before activating or retiring a version.')).toBeVisible();
  for(const button of await page.getByRole('button',{name:/^(Activate version|Retire active version)/}).all())await expect(button).toBeDisabled();
  await page.getByRole('button',{name:'Assessment requirements',exact:true}).click();await page.getByLabel('Question 1 wording').fill('');await page.getByRole('button',{name:'Workflow settings',exact:true}).click();await page.getByRole('button',{name:'Save draft version',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Give every assessment question');await expect(page.getByLabel('Question 1 wording')).toBeVisible();
  // Edits were never saved; reloading restores the shared baseline.
  await page.reload();await page.getByRole('navigation').waitFor();
});
