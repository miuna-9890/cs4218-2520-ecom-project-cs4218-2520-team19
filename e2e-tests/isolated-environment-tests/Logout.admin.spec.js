// Pawirunsiri Thanakorn (A0266315E)

import { test, expect } from '@playwright/test';
import { seededAdmin } from './seededAdmin.js';

const {
  name: adminName,
  email: adminEmail,
  password: adminPassword,
} = seededAdmin;

test.describe('Logout', () => {
  test.beforeEach(async ({ page, request }) => {
    const resetRes = await request.post('/api/v1/test/reset');
    await expect(resetRes.ok()).toBeTruthy();

    await page.goto('/login');
    await page
      .getByRole('textbox', { name: 'Enter Your Email' })
      .fill(adminEmail);
    await page
      .getByRole('textbox', { name: 'Enter Your Password' })
      .fill(adminPassword);
    await page.getByRole('button', { name: 'LOGIN' }).click();
  });

  test('Normal Login -> Logout -> Redirect to Login', async ({ page }) => {
    await page.getByRole('button', { name: adminName }).click();
    await page.getByRole('link', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('textbox', { name: 'Enter Your Email' }),
    ).toBeVisible();
  });
});
