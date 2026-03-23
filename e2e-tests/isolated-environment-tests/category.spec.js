// Sun Zhiyuan Felix (A0272474Y)

import { test, expect } from '@playwright/test';
import { seededAdmin } from './seededAdmin.js';

test.describe.configure({ mode: 'serial' }); // Category edit and delete buttons rely on indexing, so parallel execution will cause issues

const { name: adminName, email: adminEmail, password: adminPassword } = seededAdmin;

test.describe("Category Creation", () => {
    test.beforeEach(async ({ page, request }) => {
        const resetRes = await request.post('/api/v1/test/reset');
        await expect(resetRes.ok()).toBeTruthy();

        await page.goto('/login');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(adminEmail);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(adminPassword);
        await page.getByRole('button', { name: 'LOGIN' }).click();
    });

    test('should create a new category', async ({ page }) => {
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Fill in category name and submit
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('CreateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByRole('cell', { name: 'CreateTestCategory' })).toBeVisible();
    });

    test('category created should be visible in category list', async ({ page }) => {
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Fill in category name and submit
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('CreateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();
        // Navigate to category list page
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();

        await expect(page.getByRole('link', { name: 'CreateTestCategory' })).toBeVisible();
    });

    test('category created should be visible in category page', async ({ page }) => {
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Fill in category name and submit
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('CreateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();
        // Navigate to category list page
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await page.getByRole('link', { name: 'CreateTestCategory' }).click();

        await expect(page.getByRole('heading', { name: 'Category - CreateTestCategory' })).toBeVisible();
    });

    test('should show error for empty category name', async ({ page }) => {
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Submit with empty category name
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('Name is required')).toBeVisible();
    });

    test('should show error for duplicate category name', async ({ page }) => {
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Create category with name "CreateTestCategory"
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('CreateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();
        // Try creating another category with same name "CreateTestCategory"
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('CreateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('Category Already Exists')).toBeVisible();
    });
});

test.describe("Category Update", () => {
    test.beforeEach(async ({ page, request }) => {
        const resetRes = await request.post('/api/v1/test/reset');
        await expect(resetRes.ok()).toBeTruthy();

        await page.goto('/login');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(adminEmail);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(adminPassword);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Fill in category name and submit
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('UpdateTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByRole('cell', { name: 'UpdateTestCategory' })).toBeVisible();
    });

    test('should update category name', async ({ page }) => {
        // Edit the category name
        await page.getByRole('button', { name: 'Edit' }).first().click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('UpdateTestCategoryChanged');
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('UpdateTestCategoryChanged is updated')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'UpdateTestCategoryChanged' })).toBeVisible();
    });

    test('should close edit modal on manual close', async ({ page }) => {
        // Open edit modal
        await page.getByRole('button', { name: 'Edit' }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Click cancel button to close modal
        await page.getByRole('button', { name: 'Close' }).click();

        await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should show error for empty category name on update', async ({ page }) => {
        // Edit the category name to empty
        await page.getByRole('button', { name: 'Edit' }).first().click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('');
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('Name is required')).toBeVisible();
        await expect(page.getByRole('dialog').locator('form')).toBeVisible();
    });

    test('should show error for duplicate category name on update', async ({ page }) => {
        // Create another category with name "UpdateTestCategory2"
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('UpdateTestCategory2');
        await page.getByRole('button', { name: 'Submit' }).click();

        // Edit "UpdateTestCategory2" to have name "UpdateTestCategory" which is duplicate
        await page.getByRole('button', { name: 'Edit' }).nth(1).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('UpdateTestCategory');
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('Category Already Exists')).toBeVisible();
        await expect(page.getByRole('dialog').locator('form')).toBeVisible();
    });

    test('products of updated category should reflect new category name', async ({ page }) => {
        // Create a product under "UpdateTestCategory" category
        await page.getByRole('link', { name: 'Create Product' }).click();
        await page.locator('div').filter({ hasText: /^Select a category$/ }).first().click();
        await page.getByTitle('UpdateTestCategory').click();
        await page.getByRole('textbox', { name: 'write a name' }).click();
        await page.getByRole('textbox', { name: 'write a name' }).fill('Product1 Name');
        await page.getByRole('textbox', { name: 'write a description' }).click();
        await page.getByRole('textbox', { name: 'write a description' }).fill('Product1 Description');
        await page.getByPlaceholder('write a Price').click();
        await page.getByPlaceholder('write a Price').fill('123');
        await page.getByPlaceholder('write a quantity').click();
        await page.getByPlaceholder('write a quantity').fill('123');
        await page.locator('.mb-3 > .ant-select').click();
        await page.getByText('Yes').click();
        await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
        // Edit the category name
        await page.getByRole('link', { name: 'Create Category' }).click();
        await page.getByRole('button', { name: 'Edit' }).first().click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('UpdateTestCategoryChanged');
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
        // Navigate to product page and verify it shows updated category name
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await page.getByRole('link', { name: 'UpdateTestCategoryChanged' }).click();

        // Verify the product shows up under changed category page
        await expect(page.getByRole('heading', { name: 'Product1 Name' })).toBeVisible();
    });
});

test.describe("Category Deletion", () => {
    test.beforeEach(async ({ page, request }) => {
        const resetRes = await request.post('/api/v1/test/reset');
        await expect(resetRes.ok()).toBeTruthy();

        await page.goto('/login');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(adminEmail);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(adminPassword);
        await page.getByRole('button', { name: 'LOGIN' }).click();
        // Navigate to create category page
        await page.getByRole('button', { name: adminName }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();
        // Fill in category name and submit
        await page.getByRole('textbox', { name: 'Enter new category' }).click();
        await page.getByRole('textbox', { name: 'Enter new category' }).fill('DeleteTestCategory');
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByRole('cell', { name: 'DeleteTestCategory' })).toBeVisible();
    });

    test('should delete category', async ({ page }) => {
        // Delete the category
        await page.getByRole('button', { name: 'Delete' }).first().click();

        await expect(page.getByText('category is deleted')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'DeleteTestCategory' })).not.toBeVisible();
    });

    test('products of deleted category should be deleted', async ({ page }) => {
        // Create a product under "DeleteTestCategory" category
        await page.getByRole('link', { name: 'Create Product' }).click();
        await page.locator('div').filter({ hasText: /^Select a category$/ }).first().click();
        await page.getByTitle('DeleteTestCategory').click();
        await page.getByRole('textbox', { name: 'write a name' }).click();
        await page.getByRole('textbox', { name: 'write a name' }).fill('Product2 Name');
        await page.getByRole('textbox', { name: 'write a description' }).click();
        await page.getByRole('textbox', { name: 'write a description' }).fill('Product2 Description');
        await page.getByPlaceholder('write a Price').click();
        await page.getByPlaceholder('write a Price').fill('123');
        await page.getByPlaceholder('write a quantity').click();
        await page.getByPlaceholder('write a quantity').fill('123');
        await page.locator('.mb-3 > .ant-select').click();
        await page.getByText('Yes').click();
        await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
        // Check product is created successfully
        await page.getByRole('link', { name: 'Products' }).click();
        await expect(page.getByRole('link', { name: 'Product2 Name' })).toBeVisible();

        // Delete the category
        await page.getByRole('link', { name: 'Create Category' }).click();
        await page.getByRole('button', { name: 'Delete' }).first().click();

        // Verify the product is deleted after category deletion
        await page.getByRole('link', { name: 'Products' }).click();
        await expect(page.getByRole('link', { name: 'Product2 Name' })).not.toBeVisible();
    });
});