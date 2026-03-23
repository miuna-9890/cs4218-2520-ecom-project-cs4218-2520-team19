import { test as teardown } from '@playwright/test';
import { deleteTestUser } from './test-user.js';
import { deleteTestData } from './test-products.js';

teardown('teardown', async () => {
    await deleteTestUser();
    await deleteTestData();
    console.log('Teardown complete, test user and test data deleted.');
});