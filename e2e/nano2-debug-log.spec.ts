import { test, expect } from '@playwright/test';

test('Nano2 完整日志调试', async ({ page }) => {
  // 打开调试日志
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('request', request => {
    if (request.url().includes('64.118.135')) {
      console.log('REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('64.118.135')) {
      console.log('RESPONSE:', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('=== 1. 尝试登录 ===');
  
  // 点击登录按钮
  const loginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(500);
    
    // 填写登录表单
    const emailInput = page.locator('input[placeholder*="邮箱"], input[placeholder*="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('14455975@qq.com');
      await passwordInput.fill('Q.MBMf3m');
      
      const submitBtn = page.getByRole('button', { name: /登/i }).first();
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('登录表单已提交');
    }
  }
  
  // 再次检查登录状态
  const loginBtnAfter = page.locator('button').filter({ hasText: /登录/i }).first();
  const isLoggedIn = !(await loginBtnAfter.isVisible().catch(() => false));
  console.log('登录状态:', isLoggedIn);
  
  console.log('=== 2. 输入Prompt并点击生成 ===');
  
  const textarea = page.locator('textarea').first();
  await textarea.fill('a beautiful sunset over ocean');
  
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  await genBtn.click();
  
  console.log('已点击生成，等待结果...');
  
  // 等待30秒看页面变化
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    
    // 检查页面上的任何变化
    const progressBars = await page.locator('[role="progressbar"]').all();
    if (progressBars.length > 0) {
      console.log(`[${(i+1)*2}s] 发现进度条`);
    }
    
    // 检查任何包含"错误"或"失败"文字的元素
    const pageText = await page.locator('body').innerText();
    if (pageText.includes('错误') || pageText.includes('失败') || pageText.includes('error')) {
      console.log(`[${(i+1)*2}s] 发现错误提示`);
    }
  }
  
  console.log('=== 3. 最终截图 ===');
  await page.screenshot({ path: 'test-results/nano2-final.png', fullPage: true });
  console.log('截图已保存');
  
  // 获取最终页面状态
  const finalText = await page.locator('body').innerText();
  const lines = finalText.split('\n').filter(l => l.trim()).slice(0, 20);
  console.log('页面内容前20行:');
  lines.forEach(l => console.log(' ', l.slice(0, 80)));
});
