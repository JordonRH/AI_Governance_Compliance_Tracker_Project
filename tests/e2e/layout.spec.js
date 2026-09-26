import {test,expect} from '@playwright/test';

test('consistent required fields and responsive pages', async({page}, testInfo)=>{
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
    for(const name of ['Registry','Disclose AI use','Accounts']){
      await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
      if(name==='Registry') await page.getByRole('button',{name:'Add AI use',exact:true}).click();
      const form=page.locator('form.record-form');
      await expect(form).toBeVisible();
      for(const input of await form.locator('[required]').all()){
        const id=await input.getAttribute('id');
        await expect(form.locator(`label[for="${id}"] .required-mark`)).toBeVisible();
      }
      await form.locator('button.primary').click();
      await expect(form).toBeVisible();
      expect(await form.evaluate(el=>el.checkValidity())).toBe(false);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`${name}-${width}.png`),fullPage:true});
    }
  }
  await page.getByRole('button',{name:'Dark theme'}).click();
  await page.screenshot({path:testInfo.outputPath('accounts-dark-mobile.png'),fullPage:true});
});
