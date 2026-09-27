import {test,expect} from '@playwright/test';
test('administrator can generate and inspect a staged development certificate',async({page})=>{
 await page.goto('/');await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Certificates',exact:true}).click();
 await page.getByRole('button',{name:'Generate temporary certificate'}).click();
 await expect(page.getByRole('status')).toContainText('Certificate staged');
 await expect(page.getByText('Certificate: Temporary development certificate (self-signed)')).toBeVisible();
 await expect(page.getByText('Activation: Pending server restart/configuration')).toBeVisible();
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'Certificates',exact:true}).click();await expect(page.getByText('Certificate: Temporary development certificate (self-signed)')).toBeVisible();
});

