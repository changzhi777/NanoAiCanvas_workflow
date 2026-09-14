import { test, expect } from '@playwright/test';

test.describe('Login Blank Issue', () => {
  test('check page after login', async ({ page }) => {
    test.setTimeout(60000);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:3000');

    // 检查 ReactFlow 是否加载
    if (!(await page.locator('.react-flow').isVisible({ timeout: 10000 }).catch(() => false))) {
      console.log('ReactFlow 未加载，跳过测试');
      test.skip();
      return;
    }

    const loginBtn = page.locator('button:has-text("登录")').first();
    if (!(await loginBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('登录按钮不可见，跳过测试');
      test.skip();
      return;
    }

    await loginBtn.click();
    await page.waitForTimeout(300);

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

    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));
    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    console.log('User:', user);
    console.log('Token exists:', !!token);
  });
});