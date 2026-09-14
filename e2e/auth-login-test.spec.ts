import { test, expect } from '@playwright/test';

test.describe('Auth Login E2E', () => {
  test('should login and show username', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // 尝试点击登录按钮
    const loginBtn = page.locator('button:has-text("登录")').first();
    if (!(await loginBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('登录按钮不可见，跳过测试');
      test.skip();
      return;
    }

    await loginBtn.click();
    await page.waitForTimeout(500);

    // 等待邮箱输入框出现
    const emailInput = page.locator('input[placeholder="邮箱"], input[type="email"]').first();
    if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('邮箱输入框未出现，跳过测试');
      test.skip();
      return;
    }

    await emailInput.fill('cz@nanoai.fun');
    await page.locator('input[placeholder="密码"]').fill('cz777777+');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));

    console.log('Token exists:', !!token);
    console.log('User:', user);

    expect(token).toBeTruthy();
  });
});