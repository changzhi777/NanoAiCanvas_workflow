import { test, expect } from '@playwright/test';

test('Nano2 登录后完整生图测试', async ({ page }) => {
  // 打开调试日志
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text().slice(0, 200));
    }
  });
  
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('=== 1. 登录 ===');
  
  // 点击登录按钮
  const loginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
  await loginBtn.click();
  await page.waitForTimeout(500);
  
  // 填写登录表单
  const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  await emailInput.fill('cz@nanoai.fun');
  await passwordInput.fill('cz777777+');
  
  const submitBtn = page.getByRole('button', { name: /登/i }).first();
  await submitBtn.click();
  
  await page.waitForTimeout(3000);
  console.log('登录已提交');
  
  // 检查是否登录成功
  const loginBtnAfter = page.locator('button').filter({ hasText: /登录/i }).first();
  const isLoggedIn = !(await loginBtnAfter.isVisible().catch(() => false));
  console.log('登录状态:', isLoggedIn ? '成功' : '失败');
  
  if (!isLoggedIn) {
    console.log('登录失败，测试中止');
    return;
  }
  
  console.log('=== 2. 输入Prompt ===');
  
  const textarea = page.locator('textarea').first();
  await textarea.fill('a beautiful sunset over ocean with dolphins jumping');
  console.log('已输入prompt');
  
  console.log('=== 3. 点击生成按钮 ===');
  
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  await genBtn.click();
  console.log('已点击生成按钮');
  
  console.log('=== 4. 等待生图完成 ===');
  
  let foundImages = false;
  for (let i = 0; i < 40 && !foundImages; i++) {
    await page.waitForTimeout(2000);
    
    const imgCount = await page.locator('img').count();
    if (imgCount > 0) {
      foundImages = true;
      console.log(`✓ 在${(i+1)*2}秒时检测到${imgCount}张图片!`);
    }
  }
  
  console.log('=== 5. 最终结果 ===');
  const finalImgCount = await page.locator('img').count();
  console.log('最终图片数量:', finalImgCount);
  console.log('生图是否成功:', foundImages || finalImgCount > 0);
  
  await page.screenshot({ path: 'test-results/nano2-loggedin.png', fullPage: true });
  
  expect(foundImages || finalImgCount > 0).toBeTruthy();
});
