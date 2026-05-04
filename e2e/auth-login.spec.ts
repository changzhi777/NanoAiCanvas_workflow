import { test, expect } from '@playwright/test';

test.describe('Auth Login E2E', () => {
  test('should login with cz@nanoai.fun', async ({ page }) => {
    // 打开登录对话框
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 点击登录按钮
    const loginButton = page.locator('button:has-text("登录")').first();
    await loginButton.click();

    // 等待对话框出现
    await page.waitForTimeout(500);

    // 填写邮箱
    const emailInput = page.locator('input[type="email"], input[placeholder="邮箱"]');
    await emailInput.fill('cz@nanoai.fun');

    // 填写密码
    const passwordInput = page.locator('input[type="password"], input[placeholder="密码"]');
    await passwordInput.fill('cz777777+');

    // 点击提交
    const submitButton = page.locator('button[type="submit"]:has-text("登录")');
    await submitButton.click();

    // 等待并检查结果
    await page.waitForTimeout(3000);

    // 截图便于调试
    await page.screenshot({ path: '/tmp/auth-test-result.png' });

    // 检查是否有错误toast
    const toastError = page.locator('[class*="toast"][class*="error"], .sonner-toast.error');
    const errorCount = await toastError.count();

    if (errorCount > 0) {
      const errorText = await toastError.first().textContent();
      console.log('Toast error:', errorText);
    }

    // 检查是否显示用户名（登录成功标志）
    const userSpan = page.locator('span:has-text("cz")');
    const loginSuccess = await userSpan.count() > 0;

    console.log('Login success:', loginSuccess);
    console.log('Error toasts found:', errorCount);
  });
});