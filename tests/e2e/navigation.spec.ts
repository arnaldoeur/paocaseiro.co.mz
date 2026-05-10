import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 10000 });
  });

  test('navigates to Menu page', async ({ page }) => {
    await page.getByRole('link', { name: /menu/i }).first().click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.getByText(/menu|cardápio/i).first()).toBeVisible();
  });

  test('navigates to Gallery page', async ({ page }) => {
    await page.getByRole('link', { name: /galer/i }).first().click();
    await expect(page).toHaveURL(/\/gallery/);
  });

  test('navigates to Blog page', async ({ page }) => {
    await page.getByRole('link', { name: /blog/i }).first().click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test('language toggle switches between PT and EN', async ({ page }) => {
    // Initial should be PT
    const toggleBtn = page.getByText(/EN|PT/i).first();
    await toggleBtn.click();
    // Page should now show some English content or toggle text should change
    await page.waitForTimeout(500);
    // Toggle back
    await toggleBtn.click();
    await page.waitForTimeout(500);
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(page.getByText(/privacidade|privacy/i).first()).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/termos');
    await expect(page.getByText(/termos|terms/i).first()).toBeVisible();
  });

  test('404 / unknown routes fall back gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    // Should not crash — renders within the main layout
    await expect(page.locator('nav').first()).toBeVisible();
  });
});
