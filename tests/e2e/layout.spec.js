import {accountControl} from './account-menu.js';
import {test,expect} from '@playwright/test';

test('consistent required fields and responsive pages', async({page}, testInfo)=>{
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await page.screenshot({path:testInfo.outputPath('login.png'),fullPage:true});
  await page.getByLabel('Login').fill('admin@example.test');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByText('Fictional SME')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('overview.png'),fullPage:true});
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    for(const name of ['Registry','Accounts']){
      await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
      if(name==='Registry') await page.getByRole('button',{name:'Add AI use',exact:true}).click();
      const form=name==='Registry'?page.getByRole('button',{name:'Save record',exact:true}).locator('xpath=ancestor::form'):page.locator('form.record-form');
      await expect(form).toBeVisible();
      for(const input of await form.locator('[required]').all()){
        const id=await input.getAttribute('id');
        const marker=form.locator(`label[for="${id}"] .required-mark`);
        if(await input.evaluate(element=>element.validity.valid)) await expect(marker).toBeHidden();
        else await expect(marker).toBeVisible();
      }
      if(name==='Registry'){
        const input=form.getByLabel('AI tool or use case');
        await input.fill('Required marker check');
        await expect(form.locator(`label[for="${await input.getAttribute('id')}"] .required-mark`)).toBeHidden();
      }
      await form.locator('button.primary').click();
      await expect(form).toBeVisible();
      expect(await form.evaluate(el=>el.checkValidity())).toBe(false);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`${name}-${width}.png`),fullPage:true});
    }
  }
  expect(pageErrors).toEqual([]);
  await accountControl(page,'Dark theme');
  await page.screenshot({path:testInfo.outputPath('accounts-dark-mobile.png'),fullPage:true});
});
