import { test, expect } from '@playwright/test';

test.describe('Debug Blank Page', () => {
  test('check what happens on page load', async ({ page }) => {
    test.setTimeout(30000);

    // 捕获控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(`Page Error: ${err.message}`);
    });

    // 访问页面
    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 截图
    await page.screenshot({ path: '/tmp/debug-blank.png', fullPage: true });

    // 检查根元素
    const root = await page.locator('#root').innerHTML();
    console.log('Root HTML length:', root.length);
    console.log('Root preview:', root.substring(0, 500));

    // 打印错误
    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(e => console.log(e));
    }

    // 检查body
    const body = await page.locator('body').textContent();
    console.log('\nBody text:', body?.substring(0, 200));
  });
});