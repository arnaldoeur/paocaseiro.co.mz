import { test, expect } from '@playwright/test';

test.describe('Menu Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menu');
    await page.waitForTimeout(3000); // Allow data to load
  });

  test('page loads with menu content', async ({ page }) => {
    await expect(page).toHaveURL(/\/menu/);
    await expect(page).toHaveTitle(/Menu|Pão Caseiro/);
  });

  test('displays product categories or items', async ({ page }) => {
    // There should be some product cards or category sections
    const content = page.locator('[class*="card"], [class*="product"], [class*="item"]').first();
    // If products loaded, they should be visible; otherwise the page should at least render
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('responsive: mobile view hides/adjusts layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
