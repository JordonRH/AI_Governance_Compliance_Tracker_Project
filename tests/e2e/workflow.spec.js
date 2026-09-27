import {test,expect} from '@playwright/test';

test.beforeEach(async({request})=>{
 await request.post('/api/auth/login',{data:{login:'admin@example.test',password:'correct horse battery'}});
 await request.post('/api/examples',{data:{}});
 await request.post('/api/auth/logout',{data:{}});
});
test('assessment drafts survive reload and produce explainable results',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Registry',exact:true}).click();await page.getByRole('button',{name:'Load fictional examples'}).click();await expect(page.getByText('Fictional invoice helper')).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByLabel('AI use',{exact:false}).selectOption({label:'Fictional invoice helper'});await page.getByRole('button',{name:'Start assessment'}).click();
 await page.getByLabel('Does this AI use').selectOption('true');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Draft saved.');await page.reload();
 await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByRole('button',{name:'Open assessment'}).first().click();await expect(page.getByLabel('Does this AI use')).toHaveValue('true');
 await page.getByLabel('Is a responsible person').selectOption('false');await page.getByLabel('Has the tool').selectOption('true');await page.getByLabel('Are affected people').selectOption('true');await page.getByRole('button',{name:'Submit assessment'}).click();await expect(page.getByRole('heading',{name:'Assessment result'})).toBeVisible();await expect(page.getByText('High (demo)',{exact:true}).first()).toBeVisible();
});

test('action register creates assigned work and records completion history',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Actions',exact:true}).click();await page.getByLabel('AI use').selectOption({label:'Fictional invoice helper'});await page.getByLabel('Action title').fill('Review invoice safeguards');await page.getByLabel('Assigned account').selectOption({label:'Fictional Administrator'});await page.getByLabel('Due date').fill('2026-10-01');await page.getByRole('button',{name:'Create action',exact:true}).click();
 const row=page.getByRole('row').filter({hasText:'Review invoice safeguards'});await expect(row).toBeVisible();await row.getByRole('button',{name:'Edit action'}).click();await page.getByLabel('Action status').selectOption('Complete');await page.getByRole('button',{name:'Save action'}).click();await expect(row.getByRole('cell',{name:'Complete',exact:true})).toBeVisible();await row.getByText('View history').click();await expect(row.getByText(/status: Complete/)).toBeVisible();
});

test('policy upload links checklist topics and schedules its next review',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Policies',exact:true}).click();await page.getByLabel('Policy title').fill('Fictional AI policy');await page.getByLabel('Policy file').setInputFiles({name:'policy.txt',mimeType:'text/plain',buffer:Buffer.from('Fictional AI policy for testing.')});await page.getByLabel('Reviewer',{exact:false}).selectOption({label:'Fictional Administrator'});await page.getByLabel('Review due').fill('2026-09-25');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Upload policy',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Policy version uploaded.');
 const row=page.getByRole('row').filter({hasText:'Fictional AI policy'});await expect(row).toBeVisible();const download=page.waitForEvent('download');await row.getByRole('link',{name:'Download policy'}).click();expect((await download).suggestedFilename()).toBe('policy.txt');await row.getByRole('button',{name:'Record review'}).click();await page.getByLabel('Next review due').fill('2099-01-01');await page.locator('form').filter({has:page.getByLabel('Next review due')}).getByRole('button',{name:'Record review'}).click();await expect(page.getByRole('status')).toContainText('Review recorded');
});

test('reminders are delivered to the inbox once and can be read',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Actions',exact:true}).click();await page.getByLabel('AI use').selectOption({label:'Fictional invoice helper'});await page.getByLabel('Action title').fill('Notification test action');await page.getByLabel('Assigned account').selectOption({label:'Fictional Administrator'});await page.getByLabel('Due date').fill(new Date().toISOString().slice(0,10));await page.getByRole('button',{name:'Create action',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'Notification test action'})).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'Notifications',exact:true}).click();await page.getByRole('button',{name:'Check reminders now'}).click();await expect(page.getByRole('heading',{name:'Notification test action'})).toBeVisible();await page.getByRole('button',{name:'Check reminders now'}).click();await expect(page.getByRole('status')).toHaveText('0 new notifications delivered.');await page.locator('article').filter({hasText:'Notification test action'}).getByRole('button',{name:'Mark as read'}).click();await expect(page.locator('article').filter({hasText:'Notification test action'}).getByRole('button')).toHaveCount(0);
});
