export async function accountControl(page,name){
  const menu=page.locator('.account-menu');
  if(await menu.count()&&!await menu.evaluate(element=>element.open))await menu.locator('summary').click();
  await page.getByRole('button',{name,exact:true}).click();
  if(name==='Sign out')return;
  if(await menu.count()&&await menu.evaluate(element=>element.open))await menu.locator('summary').click();
}
