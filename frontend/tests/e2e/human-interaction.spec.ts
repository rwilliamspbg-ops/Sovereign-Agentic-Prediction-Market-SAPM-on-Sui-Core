import { expect, test } from '@playwright/test';

test.describe('human interaction smoke flow', () => {
  test('lets a user discover markets, filter, inspect trade gating, and navigate with the command palette', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/');

    await expect(page.getByText('Trade Real-Time Probability Curves On Sui')).toBeVisible();
    await expect(page.getByText(/Data Source:/)).toBeVisible();
    await expect(page.getByText('Quick Ticket')).toBeVisible();

    await page.getByPlaceholder('🔍 Search prediction markets...').fill('Bitcoin');
    await expect(page.getByText('Will Bitcoin reach new all-time high in 2025?')).toBeVisible();
    await page.getByPlaceholder('🔍 Search prediction markets...').clear();

    await page.getByRole('button', { name: 'technology' }).first().click();
    await expect(page.getByText('Will Sui reach 1M daily active users in 2025?')).toBeVisible();
    await page.getByRole('button', { name: 'All' }).first().click();

    await page.getByRole('button', { name: 'Buy Yes' }).first().click();
    await expect(page.getByRole('button', { name: /YES \d+\.\dc/ })).toBeVisible();
    await page.getByRole('button', { name: 'Buy No' }).first().click();
    await expect(page.getByRole('button', { name: /NO \d+\.\dc/ })).toBeVisible();

    await page.getByRole('button', { name: 'More' }).first().click();
    await expect(page.getByText('Current Odds')).toBeVisible();
    await expect(page.getByText('💼 Connect your wallet to trade')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();

    await page.getByRole('button', { name: 'Open Judge Script' }).click();
    await expect(page.getByText('Judge Script')).toBeVisible();
    await expect(page.getByText(/speaking scaffold/i)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await page.getByPlaceholder('Search commands, routes, docs...').fill('portfolio');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/portfolio$/);
    await expect(page.getByText(/Portfolio|positions|exposure/i)).toBeVisible();

    await page.goto('/markets');
    await expect(page.getByText(/Markets|Prediction Markets/i)).toBeVisible();

    expect(browserErrors).toEqual([]);
  });
});
