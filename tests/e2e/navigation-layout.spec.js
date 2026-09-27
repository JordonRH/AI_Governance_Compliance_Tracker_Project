import {test, expect} from '@playwright/test';

async function login(page) {
  await page.goto('/');
  await page.getByLabel('Login').fill('admin@example.test');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', {name:'Sign in', exact:true}).click();
  await expect(page.getByRole('navigation')).toBeVisible();
}

test('short desktop keeps branding anchored while keyboard navigation scrolls', async ({page}) => {
  await page.setViewportSize({width:1024, height:600});
  await login(page);
  const brand = page.locator('.sidebar .brand');
  const before = await brand.boundingBox();
  await page.getByRole('navigation').getByRole('button', {name:'Overview', exact:true}).focus();
  for (let i=0; i<11; i++) await page.keyboard.press('Tab');
  await expect(page.getByRole('navigation').getByRole('button', {name:'Certificates', exact:true})).toBeFocused();
  expect((await brand.boundingBox()).y).toBeCloseTo(before.y, 0);
  await expect(brand).toBeInViewport();
  expect(await page.locator('.sidebar').evaluate(el=>el.scrollTop)).toBe(0);
});

test('skip link is near the content top and transfers keyboard focus', async ({page}) => {
  await page.setViewportSize({width:1440, height:960});
  await login(page);
  await page.reload();
  await page.getByRole('navigation').waitFor();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', {name:'Skip to content'});
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(8);
  expect(box.y).toBeLessThan(24);
  expect(box.x).toBeGreaterThanOrEqual(248);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

for (const appearance of ['srec', 'slate']) {
  for (const theme of ['light', 'dark']) {
    test(`navigation, scrolling and skip link across breakpoints / ${appearance} / ${theme}`, async ({page}, info) => {
      await login(page);
      await page.request.put('/api/settings', {data:{appearance}});
      await page.reload();
      await page.getByRole('navigation').waitFor();
      if (theme === 'dark') await page.getByRole('button', {name:'Dark theme', exact:true}).click();
      for (const width of [1440, 1024, 761, 760, 390]) {
        await page.setViewportSize({width, height:720});
        const nav = page.getByRole('navigation');
        for (const name of ['Registry', 'Accounts', 'Guide']) {
          await nav.getByRole('button', {name, exact:true}).click();
          if (name === 'Registry') {
            await page.getByRole('button', {name:'Add AI use', exact:true}).click();
            await page.getByRole('button', {name:'Save record', exact:true}).click();
            expect(await page.locator('form.record-form').evaluate(el=>el.checkValidity())).toBe(false);
          }
          await page.evaluate(()=>window.scrollTo(0, document.documentElement.scrollHeight));
          expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          if (width > 760) {
            expect((await page.locator('.sidebar').boundingBox()).y).toBe(0);
            await expect(page.locator('.sidebar .brand')).toBeInViewport();
          } else {
            expect(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).position)).toBe('static');
          }
          const skip = page.getByRole('link', {name:'Skip to content'});
          expect(await skip.evaluate(el=>getComputedStyle(el).clipPath)).not.toBe('none');
          await skip.focus();
          const box = await skip.boundingBox();
          expect(box.y).toBe(12);
          expect(box.x).toBe(width > 1100 ? 268 : width > 760 ? 230 : 20);
          await page.keyboard.press('Enter');
          await expect(page.locator('#main-content')).toBeFocused();
          if (name !== 'Guide') {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(()=>document.querySelector('#main-content').contains(document.activeElement))).toBe(true);
          }
        }
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:info.outputPath(`${width}.png`), fullPage:true});
      }
      await page.request.put('/api/settings', {data:{appearance:'srec'}});
    });
  }
}

test('sidebar stays anchored through registry details, editing and action history', async ({page}) => {
  await page.setViewportSize({width:1440,height:720});
  await login(page);
  await page.request.post('/api/examples', {data:{}});
  const records = (await (await page.request.get('/api/registry')).json()).records;
  const accounts = (await (await page.request.get('/api/accounts')).json()).accounts;
  const owner = accounts.find(a=>a.login==='admin@example.test');
  await page.request.post('/api/actions', {data:{aiUseId:records[0].id, title:'Layout history check', ownerAccountId:owner.id, dueDate:'2026-10-01'}});
  await page.reload();
  const nav = page.getByRole('navigation');
  const anchored = async () => {
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    expect((await page.locator('.sidebar').boundingBox()).y).toBe(0);
    await expect(page.locator('.sidebar .brand')).toBeInViewport();
  };
  await nav.getByRole('button', {name:'Registry', exact:true}).click();
  await page.getByRole('button', {name:`View ${records[0].name}`, exact:true}).click();
  await expect(page.getByRole('button', {name:'Close details'})).toBeVisible();
  await anchored();
  await page.getByRole('button', {name:'Close details'}).click();
  await page.getByRole('button', {name:`Edit ${records[0].name}`, exact:true}).click();
  await expect(page.locator('form.record-form')).toBeVisible();
  await anchored();
  await nav.getByRole('button', {name:'Actions', exact:true}).click();
  const row = page.getByRole('row').filter({hasText:'Layout history check'});
  await row.getByText('View history').click();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await anchored();
  await row.getByRole('button', {name:'Edit action'}).click();
  await anchored();
});

test('desktop rail fills the full document while the panel stays fixed during scrolling', async ({page}) => {
  await login(page);
  for (const {width,appearance,theme} of ['srec','slate'].flatMap(appearance=>['light','dark'].flatMap(theme=>[1440,1024].map(width=>({width,appearance,theme}))))) {
    await page.request.put('/api/settings',{data:{appearance}});
    await page.reload();
    await page.getByRole('navigation').waitFor();
    if(await page.getByRole('button',{name:theme==='dark'?'Dark theme':'Light theme',exact:true}).count())await page.getByRole('button',{name:theme==='dark'?'Dark theme':'Light theme',exact:true}).click();
    await page.setViewportSize({width,height:600});
    await page.getByRole('navigation').getByRole('button',{name:'Accounts',exact:true}).click();
    await page.getByRole('button',{name:'Manage admin@example.test',exact:true}).click();
    const brand=page.locator('.sidebar .brand');
    const initial=await brand.boundingBox();
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);
    expect((await brand.boundingBox()).y).toBe(initial.y);
    expect((await page.locator('.sidebar').boundingBox()).y).toBe(0);
    await page.evaluate(()=>scrollTo(0,0));
    const png=await page.screenshot({fullPage:true});
    const pixelPage=await page.context().newPage();
    const colors=await pixelPage.evaluate(async base64=>{
      const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return {top:[...ctx.getImageData(4,4,1,1).data],bottom:[...ctx.getImageData(4,image.height-4,1,1).data]};
    },png.toString('base64'));
    await pixelPage.close();
    expect(colors.bottom).toEqual(colors.top);
    await page.getByRole('button',{name:'Close account controls'}).click();
  }
  await page.request.put('/api/settings',{data:{appearance:'srec'}});
});

test('UAT banner identifies the environment and standard desktop navigation fits without scrolling',async({page})=>{
  await page.goto('/');
  await expect(page.getByText('UAT environment',{exact:true})).toBeVisible();
  await login(page);
  for(const width of [1440,1024,761]){
    await page.setViewportSize({width,height:720});
    await expect(page.getByText('UAT environment',{exact:true})).toBeVisible();
    expect(await page.getByRole('navigation').evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
    await expect(page.getByRole('navigation').getByRole('button',{name:'Certificates',exact:true})).toBeInViewport();
  }
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByText('UAT environment',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
