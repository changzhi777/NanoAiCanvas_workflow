import { test, expect } from '@playwright/test';

test.describe('Auth Login E2E', () => {
  test('should login and show username', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 登录前 - 点击登录按钮
    await page.locator('button:has-text("登录")').first().click();
    await page.waitForTimeout(500);

    // 填写表单
    await page.locator('input[placeholder="邮箱"]').fill('cz@nanoai.fun');
    await page.locator('input[placeholder="密码"]').fill('cz777777+');
    await page.locator('button[type="submit"]').click();

    // 等待登录完成
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: '/tmp/auth-check.png' });

    // 验证localStorage有数据
    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));

    console.log('Token exists:', !!token);
    console.log('User:', user);

    expect(token).toBeTruthy();
    expect(user).toContain('"username":"cz"');
  });
});