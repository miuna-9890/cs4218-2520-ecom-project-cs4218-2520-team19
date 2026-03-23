// Teo Kim Han, A0273551E
import { test, expect } from "@playwright/test";
import { connectDB, disconnectDB } from "../config/db.js";
import userModel from '../models/userModel.js';
import { testUser } from './test-user.js';

// reset authentication state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

const deleteInvalidUser = async () => {
    await connectDB();
    if (await userModel.findOne({ email: 'invalid@email.com' })) {
        await userModel.deleteOne({ email: 'invalid@email.com' });
    };
    await disconnectDB();
};

test('forgot password succeeds for valid user', async ({ page }) => {
    await page.goto('/login');

    await page.getByText('FORGOT PASSWORD').click();

    await test.step('Fill in the form and submit to update password', async () => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(testUser.email);
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill(testUser.answer);
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword123');
        await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click();
        await expect(page.getByText('Password Changed Successfully')).toBeVisible();
    });

    await test.step('Login with updated password should succeed', async () => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('uitest@email.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('newpassword123');
        await page.getByRole('button', { name: 'LOGIN' }).click();
        await expect(page).toHaveURL('/');
    });
});

test('forgot password fails for invalid user', async ({ page }) => {
    await deleteInvalidUser(); // Ensure the invalid email does not exist before the test
    await page.goto('/login');

    await page.getByText('FORGOT PASSWORD').click();

    await test.step('Fill in the form with invalid email and submit', async () => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('invalid@email.com');
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('tennis');
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword123');
        await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click();
    });

    await expect(page.getByText('User cannot be found')).toBeVisible();
});

test.describe('forgot password fails for missing fields', async () => {
    
    test('Submit the form with missing email', async ({ page }) => {
        await page.goto('/login');
        await page.getByText('FORGOT PASSWORD').click();
    
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('tennis');
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword123');
        await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click();

        await expect(page).not.toHaveURL('/login');
    });

    test('Submit the form with missing answer', async ({ page }) => {
        await page.goto('/login');
        await page.getByText('FORGOT PASSWORD').click();

        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('uitest@email.com');
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword123');
        await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click();

        await expect(page).not.toHaveURL('/login');
    });

    test('Submit the form with missing new password', async ({ page }) => {
        await page.goto('/login');
        await page.getByText('FORGOT PASSWORD').click();
        
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('uitest@email.com');
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('tennis');
        await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click();

        await expect(page).not.toHaveURL('/login');
    });
});