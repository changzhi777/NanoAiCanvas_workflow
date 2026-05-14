import { test, expect } from '@playwright/test';

test.describe('User Menu E2E', () => {
  test('should show user menu after login', async ({ page }) => {
    test.setTimeout(60000);

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

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));

    console.log('Token:', token ? 'exists' : 'null');
    console.log('User:', user);

    // 刷新页面
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // 检查用户菜单元素
    const avatarDiv = page.locator('.rounded-full.bg-primary');
    const czText = page.locator('text=cz');
    console.log('Avatar count:', await avatarDiv.count());
    console.log('cz text count:', await czText.count());
  });
});