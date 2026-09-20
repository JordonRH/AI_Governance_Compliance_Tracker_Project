import { test, expect } from '@playwright/test';

test('register, reload, filter and edit an AI use through the interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register AI use', exact: true }).first().click();
  const form = page.getByRole('dialog');
  await form.getByLabel('AI tool or use case').fill('Faculty demo assistant');
  await form.getByLabel('Responsible person or team').fill('Fictional faculty team');
  await form.getByLabel('Category', { exact: true }).selectOption('Research');
  await form.getByLabel('Purpose of this AI use').fill('Explore synthetic research questions.');
  await form.getByLabel('Data used').fill('Fictional prompts only.');
  await form.getByRole('button', { name: 'Save registration' }).click();
  await expect(page.getByRole('status')).toHaveText('AI use registered.');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'AI registry' }).click();
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Research');
  await page.getByLabel('Search records').fill('Faculty demo');
  await expect(page.getByRole('button', { name: 'Faculty demo assistant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Faculty demo assistant' }).click();
  await form.getByLabel('AI tool or use case').fill('Updated faculty assistant');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Updated faculty assistant', exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Governance' }).click();
  await expect(page.getByRole('heading', { name: 'Assessment is not configured' })).toBeVisible();
});

test('fictional examples and mobile navigation remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Project guide' }).click();
  await page.getByRole('button', { name: 'Load fictional examples' }).click();
  await expect(page.getByRole('status')).toHaveText('3 fictional examples added.');
  await page.getByRole('button', { name: 'Load fictional examples' }).click();
  await expect(page.getByRole('status')).toHaveText('Fictional examples are already in the registry.');
  await page.getByRole('navigation').getByRole('button', { name: 'Overview' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
});

test('dialog supports keyboard cancellation and search has an empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register AI use', exact: true }).first().click();
  await expect(page.getByLabel('AI tool or use case')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'AI registry' }).click();
  await page.getByLabel('Search records').fill('no-such-record-83921');
  await expect(page.getByRole('heading', { name: 'No matching AI uses' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Search records')).toHaveValue('');
});
