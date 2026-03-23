// Teo Kim Han, A0273551E
import { test, expect } from "@playwright/test";

test.describe('Non-Admin user should not be able to navigate to admin routes', async () => {
    
    test('should not be able to navigate to "/dashboard/admin"', async ({ page }) => {
        await page.goto('/dashboard/admin');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/create-category"', async ({ page }) => {
        await page.goto('/dashboard/admin/create-category');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/create-product"', async ({ page }) => {
        await page.goto('/dashboard/admin/create-product');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/product/:slug"', async ({ page }) => {
        await page.goto('/dashboard/admin/product/test-slug');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/products"', async ({ page }) => {
        await page.goto('/dashboard/admin/products');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/users"', async ({ page }) => {
        await page.goto('/dashboard/admin/users');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('should not be able to navigate to "/dashboard/admin/orders"', async ({ page }) => {
        await page.goto('/dashboard/admin/orders');

        await expect(page.getByText('UnAuthorized Access')).toBeVisible();
        await expect(page).toHaveURL('/');
    });
});