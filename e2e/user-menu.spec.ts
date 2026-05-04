import { test, expect } from '@playwright/test';

test.describe('User Menu E2E', () => {
  test('should show user menu after login', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:3001/nanoai-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 登录
    await page.locator('button:has-text("登录")').first().click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="邮箱"]').fill('cz@nanoai.fun');
    await page.locator('input[placeholder="密码"]').fill('cz777777+');

    // 点击提交按钮
    await page.locator('button[type="submit"]').click();

    // 等待登录完成 - 对话框应该关闭
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/login-complete.png' });

    // 检查localStorage
    const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
    const user = await page.evaluate(() => localStorage.getItem('nanoai_user'));

    console.log('Token:', token ? 'exists' : 'null');
    console.log('User:', user);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/tmp/after-final-reload.png' });

    // 查找用户菜单（头像+用户名）
    const avatarDiv = page.locator('.rounded-full.bg-primary');
    const czText = page.locator('text=cz');
    const logoutText = page.locator('text=退出登录');

    console.log('Avatar count:', await avatarDiv.count());
    console.log('cz text count:', await czText.count());
    console.log('logout text count:', await logoutText.count());
  });
});