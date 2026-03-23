// Pawirunsiri Thanakorn (A0266315E)

import { test, expect } from '@playwright/test';
import { seededAdmin } from './seededAdmin.js';

test.describe.configure({ mode: 'serial' });

const {
  name: adminName,
  email: adminEmail,
  password: adminPassword,
} = seededAdmin;

const TEST_CATEGORY = 'TestCategory';

async function navigateToCreateProduct(page) {
  await page.getByRole('button', { name: adminName }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Create Product' }).click();
}

async function fillProductForm(page, { name, category, price, quantity }) {
  // Ant Design Select appends the dropdown overlay to document.body,
  // so we open it first and wait for the option to appear before clicking
  await page.locator('.ant-select').first().click();
  await page.waitForSelector(`.ant-select-item-option[title="${category}"]`);
  await page.locator(`.ant-select-item-option[title="${category}"]`).click();

  await page.getByPlaceholder('write a name').fill(name);
  await page
    .getByPlaceholder('write a description')
    .fill(`${name} Description`);
  await page.getByPlaceholder('write a Price').fill(price);
  await page.getByPlaceholder('write a quantity').fill(quantity);

  // Shipping is the second .ant-select on the page
  await page.locator('.ant-select').nth(1).click();
  await page.waitForSelector('.ant-select-item-option[title="Yes"]');
  await page.locator('.ant-select-item-option[title="Yes"]').click();
}

test.describe('Admin – Products', () => {
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

  test('Create 1 Product -> Sees 1 Product', async ({ page }) => {
    await navigateToCreateProduct(page);
    await fillProductForm(page, {
      name: 'Test Product 1',
      category: TEST_CATEGORY,
      price: '9.99',
      quantity: '5',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Products' }).click();
    await expect(
      page.locator('.product-link').filter({ hasText: 'Test Product 1' }),
    ).toBeVisible();
  });

  test('Create >1 Product -> Sees >1 Products', async ({ page }) => {
    await navigateToCreateProduct(page);
    await fillProductForm(page, {
      name: 'Test Product A',
      category: TEST_CATEGORY,
      price: '9.99',
      quantity: '5',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Create Product' }).click();
    await fillProductForm(page, {
      name: 'Test Product B',
      category: TEST_CATEGORY,
      price: '19.99',
      quantity: '10',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Products' }).click();
    await expect(
      page.locator('.product-link').filter({ hasText: 'Test Product A' }),
    ).toBeVisible();
    await expect(
      page.locator('.product-link').filter({ hasText: 'Test Product B' }),
    ).toBeVisible();
  });

  test('Edit 1 Product -> Sees Product Edited', async ({ page }) => {
    await navigateToCreateProduct(page);
    await fillProductForm(page, {
      name: 'Edit Me Product',
      category: TEST_CATEGORY,
      price: '9.99',
      quantity: '5',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Products' }).click();
    await page
      .locator('.product-link')
      .filter({ hasText: 'Edit Me Product' })
      .click();

    const nameInput = page.getByPlaceholder('write a name');
    // getSingleProduct() is async — wait for it to populate the field before interacting
    await expect(nameInput).toHaveValue('Edit Me Product');
    await nameInput.fill('Edit Me Product Updated');
    await expect(nameInput).toHaveValue('Edit Me Product Updated');
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page).toHaveURL('/dashboard/admin/products');
    // getAllProducts() re-fetches after navigation — poll with a generous timeout
    await expect(
      page
        .locator('.product-link')
        .filter({ hasText: 'Edit Me Product Updated' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('Duplicate Product name -> Fail Gracefully', async ({ page }) => {
    await navigateToCreateProduct(page);
    await fillProductForm(page, {
      name: 'Duplicate Product',
      category: TEST_CATEGORY,
      price: '9.99',
      quantity: '5',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await page.getByRole('link', { name: 'Create Product' }).click();
    await fillProductForm(page, {
      name: 'Duplicate Product',
      category: TEST_CATEGORY,
      price: '5.00',
      quantity: '1',
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
  });

  test('Delete 1 Product -> Sees Product Deleted', async ({ page }) => {
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
      .fill('Delete Me Product');
    await page
      .getByRole('textbox', { name: 'write a description' })
      .fill('Delete Me Product Description');
    await page.getByPlaceholder('write a Price').fill('9.99');
    await page.getByPlaceholder('write a quantity').fill('5');
    await page.locator('.mb-3 > .ant-select').click();
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // Open the product edit page to capture its slug from the URL
    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('link', { name: 'Delete Me Product' }).click();

    const deleteBtn = page.getByRole('button', { name: 'DELETE PRODUCT' });
    await expect(deleteBtn).toBeVisible(); // wait until Playwright can see it
    page.once('dialog', (dialog) => dialog.accept('yes'));
    await deleteBtn.click();
    await page.getByRole('link', { name: 'Products' }).click();

    await expect(
      page.getByRole('link', { name: 'Delete Me Product' }),
    ).not.toBeVisible();
  });
});
