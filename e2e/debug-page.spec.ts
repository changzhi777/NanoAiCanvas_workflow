import { test, expect } from '@playwright/test';

test.describe('Debug Page', () => {
  test('full page debug', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(8000);

    // Full page screenshot
    await page.screenshot({ path: '/tmp/full-page.png', fullPage: true });

    // Check root element
    const rootContent = await page.locator('#root').innerHTML();
    console.log('Root content length:', rootContent.length);
    console.log('Root preview:', rootContent.substring(0, 500));

    // Check body
    const body = await page.locator('body');
    const box = await body.boundingBox();
    console.log('Body bounding box:', box);
  });
});