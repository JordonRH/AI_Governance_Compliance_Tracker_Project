import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`themes and record details work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Dark theme', exact: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await toggle.focus();
        await page.keyboard.press('Space');
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await page.reload();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const name of ['Project guide', 'Governance', 'AI registry', 'Overview']) {
        await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.screenshot({ path: `test-results/${theme}-${width}-overview.png`, fullPage: true });
      await page.getByRole('button', { name: 'Register AI use', exact: true }).first().click();
      const form = page.getByRole('dialog', { name: 'Register AI use', exact: true });
      await form.getByLabel('AI tool or use case').fill(`Theme sample ${theme} ${width}`);
      await form.getByLabel('Responsible person or team').fill('Fictional review team');
      await form.getByLabel('Purpose of this AI use').fill('Review display\nwith synthetic content.');
      await form.getByLabel('Data used').fill('Fictional data only.');
      await page.screenshot({ path: `test-results/${theme}-${width}-form.png`, fullPage: true });
      await form.getByRole('button', { name: 'Save registration' }).click();
      await expect(page.getByRole('status')).toHaveText('AI use registered.');
      const record = page.getByRole('button', { name: `Theme sample ${theme} ${width}`, exact: true });
      await record.click();
      const detail = page.getByRole('dialog', { name: `Theme sample ${theme} ${width}`, exact: true });
      await expect(detail.getByText('Fictional data only.', { exact: true })).toBeVisible();
      await expect(detail.getByText('Not assessed', { exact: true })).toBeVisible();
      await expect(detail.getByRole('textbox')).toHaveCount(0);
      await page.screenshot({ path: `test-results/${theme}-${width}-details.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await expect(record).toBeFocused();
      await record.click();
      await detail.getByRole('button', { name: 'Edit record' }).click();
      const edit = page.getByRole('dialog', { name: 'Edit AI use', exact: true });
      await expect(edit.getByLabel('AI tool or use case')).toBeFocused();
      await edit.getByLabel('Data used').fill('Updated fictional data.');
      await edit.getByRole('button', { name: 'Save changes' }).click();
      await record.click();
      await expect(detail.getByText('Updated fictional data.', { exact: true })).toBeVisible();
      await detail.getByRole('button', { name: 'Close', exact: true }).click();
      await page.screenshot({ path: `test-results/${theme}-${width}-registry.png`, fullPage: true });
    }
    await toggle.click();
    await page.reload();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
}

test('unavailable storage does not prevent theme changes or registry use', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark theme' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Register AI use', exact: true }).first().click();
  await expect(page.getByLabel('AI tool or use case')).toBeFocused();
  await page.keyboard.press('Escape');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('loading, errors and empty results render in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Dark theme' });
    if (theme === 'dark') await toggle.click();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/registry', async route => {
      await gate;
      await route.fulfill({ status: 503, json: { error: 'Synthetic test failure.' } });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading registry...', { exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('alert')).toContainText('Synthetic test failure.');
    await page.screenshot({ path: `test-results/${theme}-error.png`, fullPage: true });
    await page.unroute('**/api/registry');
    await page.getByRole('button', { name: 'Retry loading' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('navigation').getByRole('button', { name: 'AI registry' }).click();
    await page.getByLabel('Search records').fill('no-theme-match-999');
    await expect(page.getByRole('heading', { name: 'No matching AI uses' })).toBeVisible();
  }
});
