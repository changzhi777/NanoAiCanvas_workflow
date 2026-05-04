import { test, expect } from '@playwright/test';

test.describe('Login Blank Issue', () => {
  test('check page after login', async ({ page }) => {
    test.setTimeout(30000);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 登录
    await page.locator('button:has-text("登录")').first().click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="邮箱"]').fill('cz@nanoai.fun');
    await page.locator('input[placeholder="密码"]').fill('cz777777+');
    await page.locator('button[type="submit"]').click();

    // 等待
    await page.waitForTimeout(3000);

    // 截图
    await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });

    // 检查
    const root = await page.locator('#root').innerHTML();
    console.log('Root HTML length:', root.length);
    console.log('Errors:', errors);

    // 检查localStorage
    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));
    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    console.log('User:', user);
    console.log('Token exists:', !!token);
  });
});