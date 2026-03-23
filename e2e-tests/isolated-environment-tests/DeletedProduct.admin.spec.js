// Pawirunsiri Thanakorn (A0266315E)

import { test, expect } from '@playwright/test';
import { seededAdmin } from './seededAdmin.js';

const {
  name: adminName,
  email: adminEmail,
  password: adminPassword,
} = seededAdmin;

const TEST_CATEGORY = 'TestCategory';

test.describe('Deleted Products Should Not Be Accessible', () => {
  test.beforeEach(async ({ page, request }) => {
    const resetRes = await request.post('/api/v1/test/reset');
    await expect(resetRes.ok()).toBeTruthy();

    // Log in to get an auth token for the category creation API call
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: adminEmail, password: adminPassword },
    });
    await expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // Seed a category so the product form dropdown has something to select
    const categoryRes = await request.post('/api/v1/category/create-category', {
      data: { name: TEST_CATEGORY },
      headers: { Authorization: token },
    });
    await expect(categoryRes.ok()).toBeTruthy();

    // Now log in via the UI
    await page.goto('/login');
    await page
      .getByRole('textbox', { name: 'Enter Your Email' })
      .fill(adminEmail);
    await page
      .getByRole('textbox', { name: 'Enter Your Password' })
      .fill(adminPassword);
    await page.getByRole('button', { name: 'LOGIN' }).click();
  });

  test('Admin deletes product -> product detail page shows not found', async ({
    page,
  }) => {
    // Create a product
    await page.getByRole('button', { name: adminName }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Product' }).click();
    await page
      .locator('div')
      .filter({ hasText: /^Select a category$/ })
      .first()
      .click();
    await page.getByTitle('TestCategory').click({ force: true });
    await page
      .getByRole('textbox', { name: 'write a name' })
      .fill('Ghost Product');
    await page
      .getByRole('textbox', { name: 'write a description' })
      .fill('Ghost Product Description');
    await page.getByPlaceholder('write a Price').fill('9.99');
    await page.getByPlaceholder('write a quantity').fill('5');
    await page.locator('.mb-3 > .ant-select').click();
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // Open the product edit page to capture its slug from the URL
    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('link', { name: 'Ghost Product' }).click();
    const slug = 'ghost-product';

    page.on('dialog', async (dialog) => {
      await dialog.accept('yes');
    });

    // Delete the product
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Products' }).click();
    await expect(
      page.getByRole('link', { name: 'Ghost Product' }),
    ).not.toBeVisible();

    // Attempt to navigate directly to the deleted product's detail page
    if (slug) {
      await page.goto(`/product/${slug}`);
    }

    await expect(page.getByText(/Product Not Found/i)).toBeVisible();
  });
});
