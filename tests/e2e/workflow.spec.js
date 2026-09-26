import {test,expect} from '@playwright/test';
test('assessment drafts survive reload and produce explainable results',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Registry',exact:true}).click();await page.getByRole('button',{name:'Load fictional examples'}).click();await expect(page.getByText('Fictional invoice helper')).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByLabel('AI use',{exact:false}).selectOption({label:'Fictional invoice helper'});await page.getByRole('button',{name:'Start assessment'}).click();
 await page.getByLabel('Does this AI use').selectOption('true');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Draft saved.');await page.reload();
 await page.getByRole('navigation').getByRole('button',{name:'Assessments',exact:true}).click();await page.getByRole('button',{name:'Open assessment'}).first().click();await expect(page.getByLabel('Does this AI use')).toHaveValue('true');
 await page.getByLabel('Is a responsible person').selectOption('false');await page.getByLabel('Has the tool').selectOption('true');await page.getByLabel('Are affected people').selectOption('true');await page.getByRole('button',{name:'Submit assessment'}).click();await expect(page.getByRole('heading',{name:'Assessment result'})).toBeVisible();await expect(page.getByText('High (demo)',{exact:true}).first()).toBeVisible();
});
