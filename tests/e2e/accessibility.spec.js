import {accountControl} from './account-menu.js';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('all workspace pages pass automated accessibility checks in both themes',async({page},testInfo)=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1024,height:900});await page.goto('/');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByLabel('Login').fill('admin@example.test');await page.getByLabel('Password').fill('correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('navigation').waitFor();
 for(const appearance of ['srec','slate']){
  await page.request.put('/api/settings',{data:{appearance}});await page.reload();await page.getByRole('navigation').waitFor();
  if(await page.locator('html').getAttribute('data-theme')==='dark')await accountControl(page,'Light theme');
 for(const theme of ['light','dark']){
  if(theme==='dark')await accountControl(page,'Dark theme');
  for(const name of ['Overview','Registry','Assessments','Actions','Policies','Notifications','Reports','Guide','Accounts','Configuration','Appearance','Certificates','My password']){
   await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
   await page.waitForTimeout(180);
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   expect(result.violations,`${name} / ${appearance} / ${theme}`).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name).toBe(true);
  }
  await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();await page.screenshot({path:testInfo.outputPath(`overview-${appearance}-${theme}.png`),fullPage:true});
 }
 }
 await page.request.put('/api/settings',{data:{appearance:'srec'}});
 await page.setViewportSize({width:390,height:844});
 for(const name of ['Assessments','Actions','Policies','Notifications','My password']){
  await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});
