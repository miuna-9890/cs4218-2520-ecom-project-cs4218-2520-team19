// Teo Kim Han, A0273551E
import { test, expect } from '@playwright/test';

const expectNovelInCart = async (page) => {
  await expect(page).toHaveURL('/cart');
  await expect(page.locator('h1')).toContainText('You Have 1 items in your cart');
  await expect(page.getByRole('img', { name: 'Novel' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Novel');
  await expect(page.getByText('A bestselling novel')).toBeVisible();
  await expect(page.getByText('Price :')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Total : $14.99');
};

test('Adding novel to cart -> View Cart', async ({ page }) => {
  await page.goto('/');

  await test.step('Click on ADD TO CART button for the novel product', async () => {
    const novelCard = page.getByText('Novel$14.99A bestselling');
    await novelCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByText('Item Added to cart')).toBeVisible();
  });

  await test.step('Check for cart update in header', async () => {
    const navigationBar = page.getByRole('navigation');
    await expect(navigationBar.getByText('Cart1')).toBeVisible();
  });
  
  await page.getByRole('link', { name: 'Cart' }).click();
  await expectNovelInCart(page);
});

test('More Details -> Add to cart -> View Cart', async ({ page }) => {
  await page.goto('/');

  await test.step('Click on More Details button for the novel product', async () => {
    const novelCard = page.getByText('Novel$14.99A bestselling');
    await novelCard.getByRole('button', { name: 'More Details' }).click();
    await expect(page.getByRole('img', { name: 'Novel' })).toBeVisible();
  });

  await test.step('Click on ADD TO CART button in product details page', async () => {
    const novelDetails = page.getByText('Product DetailsName :');
    await novelDetails.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByText('Item Added to cart')).toBeVisible();
  });

  await test.step('Wait for cart update in header', async () => {
    const navigationBar = page.getByRole('navigation');
    await expect(navigationBar.getByText('Cart1')).toBeVisible();
  });
  
  await page.getByRole('link', { name: 'Cart' }).click();

  await expectNovelInCart(page);
});

test('More Details -> Add to cart for similar product -> View Cart', async ({ page }) => {
  await page.goto('/');

  await test.step('Click on More Details button for the novel product', async () => {
    const novelCard = page.getByText('Novel$14.99A bestselling');
    await novelCard.getByRole('button', { name: 'More Details' }).click();
    await expect(page.getByRole('img', { name: 'Novel' })).toBeVisible();
    await expect(page.getByRole('img', {name: 'Textbook' })).toBeVisible();
  });

  await test.step('Click on ADD TO CART button for the similar product in product details page', async () => {
    const textbookCard = page.getByText('Textbook$79.99A comprehensive');
    await textbookCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByText('Item Added to cart')).toBeVisible();
  });

  await test.step('Wait for cart update in header', async () => {
    const navigationBar = page.getByRole('navigation');
    await expect(navigationBar.getByText('Cart1')).toBeVisible();
  });

  await page.getByRole('link', { name: 'Cart' }).click();

  await expectNovelInCart(page);
});

test('remove item from cart', async ({ page }) => {
  await page.goto('/');
  
  await test.step('Add novel to cart', async () => {
    const novelCard = page.getByText('Novel$14.99A bestselling');
    await novelCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByText('Item Added to cart')).toBeVisible();
  });

  await test.step('Check for cart update in header', async () => {
    const navigationBar = page.getByRole('navigation');
    await expect(navigationBar.getByText('Cart1')).toBeVisible();
  });

  await page.getByRole('link', { name: 'Cart' }).click();

  await test.step('Click on Remove button for the novel in cart', async () => {
    await page.getByRole('button', { name: 'Remove' }).click();
  });

  await expect(page.getByText('Your Cart is Empty')).toBeVisible();
});

test('update address button in cart navigates to profile update page', async ({ page }) => {
  await page.goto('/cart');

  await page.getByRole('button', { name: 'Update Address' }).click();

  await test.step('Verify navigation to profile update page', async () => {
    await page.waitForURL('/dashboard/user/profile');
    await expect(page.getByRole('heading', { name: 'USER PROFILE' })).toBeVisible();
  });
});