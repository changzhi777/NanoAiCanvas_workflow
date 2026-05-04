import { test, expect } from '@playwright/test';

test('Nano2 详细生图测试', async ({ page }) => {
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('=== 1. 检查登录状态 ===');
  
  // 登录按钮状态
  const loginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
  const isLoggedIn = !(await loginBtn.isVisible().catch(() => false));
  console.log('登录状态:', isLoggedIn ? '已登录' : '未登录');
  
  console.log('=== 2. 检查会话 ===');
  
  // 检查是否有会话存在
  const sessionText = await page.locator('text=会话历史').isVisible().catch(() => false);
  console.log('显示会话历史:', sessionText);
  
  // 检查是否有任务队列tab
  const taskTab = page.locator('text=任务队列').isVisible().catch(() => false);
  console.log('显示任务队列Tab:', taskTab);
  
  console.log('=== 3. 输入Prompt ===');
  const textarea = page.locator('textarea').first();
  await textarea.fill('a beautiful sunset over ocean');
  console.log('已输入prompt');
  
  console.log('=== 4. 点击生成按钮 ===');
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  await genBtn.click();
  console.log('已点击生成按钮');
  
  // 等待并检查toast消息
  await page.waitForTimeout(1000);
  
  // 检查是否有错误toast
  const errorToasts = await page.locator('[class*="toast"]').all();
  console.log('Toast数量:', errorToasts.length);
  
  for (const toast of errorToasts.slice(0, 3)) {
    const text = await toast.textContent().catch(() => '');
    if (text) console.log('Toast内容:', text.slice(0, 50));
  }
  
  console.log('=== 5. 等待生图完成 ===');
  
  // 持续等待最多60秒
  let foundImages = false;
  for (let i = 0; i < 30 && !foundImages; i++) {
    await page.waitForTimeout(2000);
    
    const imgCount = await page.locator('img').count();
    if (imgCount > 0) {
      foundImages = true;
      console.log(`在${(i+1)*2}秒时检测到${imgCount}张图片!`);
    }
    
    // 检查状态文字变化
    const statusEl = page.locator('[class*="text-muted-foreground"]').filter({ hasText: /生成|完成|预览/i }).first();
    const status = await statusEl.textContent().catch(() => '');
    if (status) console.log(`状态:${status}`);
  }
  
  console.log('=== 6. 最终结果 ===');
  const finalImgCount = await page.locator('img').count();
  console.log('最终图片数量:', finalImgCount);
  
  // 截图
  await page.screenshot({ path: 'test-results/nano2-detailed-result.png', fullPage: true });
  console.log('截图已保存');
  
  expect(foundImages || finalImgCount > 0).toBeTruthy();
});
