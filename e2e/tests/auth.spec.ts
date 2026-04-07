import { test, expect } from '@playwright/test';
import { BASE_URL, CREDENTIALS } from './helpers';

test.describe('Authentication', () => {
// The test will fail since the login page is sometimes requiring a reload to Sign in successfully
  test('AUTH-01 | Valid login', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.reload();
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(CREDENTIALS.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(CREDENTIALS.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('link', { name: 'Tours' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Tour' })).toBeVisible();
  });

});
