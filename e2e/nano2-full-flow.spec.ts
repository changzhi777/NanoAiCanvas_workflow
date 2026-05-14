import { test, expect } from '@playwright/test';

test('完整流程: 登录 + 生图', async ({ page }) => {
  await page.goto('http://localhost:3000/nano2');
  await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  console.log('=== Step 1: 登录 ===');
  
  // 点击登录按钮
  const loginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
  await loginBtn.click();
  await page.waitForTimeout(1000);
  
  // 检查是否有登录对话框
  const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').first();
  const hasEmailInput = await emailInput.isVisible().catch(() => false);
  console.log('显示邮箱输入框:', hasEmailInput);
  
  if (hasEmailInput) {
    // 输入邮箱和密码
    await emailInput.fill('14455975@qq.com');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Q.MBMf3m');
    
    // 点击登录确认
    const confirmBtn = page.getByRole('button', { name: /登录|确定|确认/i }).first();
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    console.log('已填写登录信息并提交');
  }
  
  console.log('=== Step 2: 检查登录状态 ===');
  const isLoggedInNow = !(await loginBtn.isVisible().catch(() => false));
  console.log('当前登录状态:', isLoggedInNow ? '已登录' : '未登录');
  
  if (!isLoggedInNow) {
    console.log('登录失败，尝试通过Workflow页面登录');
    // 尝试跳转到workflow页面登录
    await page.goto('http://localhost:3000/workflow');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const wfLoginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
    if (await wfLoginBtn.isVisible().catch(() => false)) {
      await wfLoginBtn.click();
      await page.waitForTimeout(1000);
      
      const wfEmailInput = page.locator('input[placeholder*="邮箱"], input[placeholder*="email"]').first();
      if (await wfEmailInput.isVisible().catch(() => false)) {
        await wfEmailInput.fill('14455975@qq.com');
        const wfPasswordInput = page.locator('input[type="password"]').first();
        await wfPasswordInput.fill('Q.MBMf3m');
        
        const wfConfirmBtn = page.getByRole('button', { name: /登录|确定|确认/i }).first();
        await wfConfirmBtn.click();
        await page.waitForTimeout(3000);
        console.log('Workflow页面登录已提交');
      }
    }
    
    // 回到nano2页面
    await page.goto('http://localhost:3000/nano2');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  
  console.log('=== Step 3: 生图测试 ===');
  
  // 输入prompt
  const textarea = page.locator('textarea').first();
  await textarea.fill('a cute cat sitting on a red chair with flowers');
  console.log('已输入prompt');
  
  // 点击生成按钮
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  await genBtn.click();
  console.log('已点击生成按钮');
  
  // 等待生图
  console.log('等待生图完成...');
  let foundImages = false;
  for (let i = 0; i < 40 && !foundImages; i++) {
    await page.waitForTimeout(2000);
    
    const imgCount = await page.locator('img').count();
    if (imgCount > 0) {
      foundImages = true;
      console.log(`✓ 在${(i+1)*2}秒时检测到${imgCount}张图片!`);
    }
  }
  
  console.log('=== 结果 ===');
  const finalImgCount = await page.locator('img').count();
  console.log('最终图片数量:', finalImgCount);
  
  await page.screenshot({ path: 'test-results/nano2-full-flow.png', fullPage: true });
  
  expect(foundImages || finalImgCount > 0).toBeTruthy();
});
