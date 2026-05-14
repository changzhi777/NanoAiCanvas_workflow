import { test, expect } from '@playwright/test';

test('Nano2 API直连测试', async ({ page }) => {
  await page.goto('http://localhost:3000/nano2');
  await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  
  console.log('=== 检查页面状态 ===');
  
  // 1. 检查登录状态
  const loginBtn = page.locator('button').filter({ hasText: /登录/i }).first();
  const isLoggedIn = !(await loginBtn.isVisible().catch(() => false));
  console.log('登录状态:', isLoggedIn ? '已登录' : '未登录');
  
  // 2. 检查页面元素
  const textarea = page.locator('textarea').first();
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  
  console.log('输入框可见:', await textarea.isVisible());
  console.log('生成按钮可见:', await genBtn.isVisible());
  
  // 3. 直接测试后端API
  console.log('\n=== 直接测试后端API ===');
  
  // 测试 NanoBanana2 API
  const response = await page.evaluate(async () => {
    const res = await fetch('http://64.118.135.134:8002/v2/image/nanobanana2/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a cute cat',
        size: '1K',
        aspect_ratio: '1:1'
      })
    });
    return await res.json();
  });
  
  console.log('NanoBanana2 API响应:', JSON.stringify(response, null, 2));
  
  if (response.task_id) {
    console.log('\n=== 轮询任务状态 ===');
    let status = 'pending';
    for (let i = 0; i < 30 && status === 'pending'; i++) {
      await page.waitForTimeout(2000);
      
      const taskRes = await page.evaluate(async (taskId) => {
        const res = await fetch(`http://64.118.135.134:8002/v2/image/nanobanana2/task/${taskId}`);
        return await res.json();
      }, response.task_id);
      
      status = taskRes.status;
      console.log(`状态: ${status} (${(i+1)*2}s)`);
      
      if (status === 'success' && taskRes.images?.length > 0) {
        console.log('✓ 生成成功! 图片URL:', taskRes.images[0]);
        break;
      }
    }
  }
});
