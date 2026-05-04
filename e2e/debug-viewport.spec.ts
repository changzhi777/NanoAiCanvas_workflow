import { test, expect } from '@playwright/test';

test.describe('Debug Viewport', () => {
  test('test different viewports', async ({ page }) => {
    test.setTimeout(30000);

    // 设置标准视口大小
    await page.setViewportSize({ width: 1280, height: 720 });

    // 访问页面
    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 截图
    await page.screenshot({ path: '/tmp/viewport-1280.png', fullPage: true });

    // 检查页面内容
    const text = await page.locator('body').textContent();
    console.log('Body text length:', text?.length);
    console.log('Has NanoAI:', text?.includes('NanoAI'));
    console.log('Has 节点:', text?.includes('节点'));
  });

  test('test full hd viewport', async ({ page }) => {
    test.setTimeout(30000);

    // 设置全高清视口
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/tmp/viewport-1920.png', fullPage: true });

    const text = await page.locator('body').textContent();
    console.log('Full HD Body text length:', text?.length);
  });
});