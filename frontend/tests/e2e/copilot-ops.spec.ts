import { expect, test } from '@playwright/test';

test.describe('copilot ops run modes', () => {
  test('supports stop-on-failure and continue-on-failure with transcript download', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Copilot Ops' }).click();
    await expect(page.getByText('Agentic Action Control')).toBeVisible();

    await page.getByRole('button', { name: 'Prepare judge mode run with proof artifacts' }).click();
    await expect(page.getByText('Action Queue')).toBeVisible();

    await page.getByRole('button', { name: 'Run All' }).click();
    await expect(page.getByText(/Last run:/)).toBeVisible();
    await expect(page.getByText(/stopped on failure/)).toBeVisible();

    await page.getByLabel('Stop Run All on first failure').uncheck();
    await page.getByRole('button', { name: 'Run All' }).click();
    await expect(page.getByText(/continue-on-failure mode/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Transcript' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('sapm-copilot-transcript-');
  });
});
