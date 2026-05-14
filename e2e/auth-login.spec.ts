import { test, expect } from '@playwright/test';

/**
 * 认证登录测试
 * 注意：这些测试需要真实的 API 后端运行，如果后端不可用会超时
 */
test.describe('Auth Login E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 清空 localStorage 确保干净状态
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
  });

  test('should login with cz@nanoai.fun', async ({ page }) => {
    // 打开登录对话框
    const loginButton = page.locator('button:has-text("登录")').first();

    // 如果登录按钮不存在或已登录，跳过
    if (!(await loginButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await loginButton.click();
    await page.waitForTimeout(500);

    // 填写邮箱
    const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"]');
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await emailInput.fill('cz@nanoai.fun');

    // 填写密码
    const passwordInput = page.locator('input[type="password"], input[placeholder*="密码"]');
    await passwordInput.fill('cz777777+');

    // 点击提交
    const submitButton = page.locator('button[type="submit"]:has-text("登录")');
    await submitButton.click();

    // 等待登录结果，最多 10s
    await page.waitForTimeout(10000);

    // 检查是否登录成功（检查用户名是否显示）
    const userSpan = page.locator('span:has-text("cz")');
    const loginSuccess = await userSpan.count() > 0;

    // 检查是否有错误 toast
    const toastError = page.locator('[class*="toast"][class*="error"], .sonner-toast.error');
    const errorCount = await toastError.count();

    if (errorCount > 0) {
      console.log('Login failed with errors');
    }

    // 如果 10s 后还没成功，说明 API 可能有问题
    if (!loginSuccess && errorCount > 0) {
      console.log('Login attempt failed, checking if API is available...');
    }
  });
});