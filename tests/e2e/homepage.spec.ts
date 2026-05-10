import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the loading splash to finish (max 10s)
    await page.waitForSelector('.min-h-screen', { timeout: 10000 });
  });

  test('loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Pão Caseiro/);
  });

  test('displays the navbar', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('displays the footer', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('has language toggle button', async ({ page }) => {
    // Look for EN/PT toggle
    const langBtn = page.getByText(/EN|PT/i).first();
    await expect(langBtn).toBeVisible();
  });

  test('hero section is visible', async ({ page }) => {
    // Check for key hero content
    const heroText = page.getByText(/Pão Caseiro|O sabor que aquece/i).first();
    await expect(heroText).toBeVisible();
  });
});
