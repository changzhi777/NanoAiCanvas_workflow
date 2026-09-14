import { test, expect } from '@playwright/test';

test.describe('Nano2 Image 完整功能测试', () => {
  test('检查nano2页面核心元素', async ({ page }) => {
    await page.goto('http://localhost:3000/nano2');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    // 检查标题
    const title = await page.locator('h1').first().textContent().catch(() => 'not found');
    console.log('Title:', title);
    
    // 检查关键按钮
    const genBtn = page.getByRole('button', { name: /开始生成|生成/i }).first();
    const hasGenBtn = await genBtn.isVisible().catch(() => false);
    console.log('Has Generate Button:', hasGenBtn);
    
    // 检查Tab切换
    const tabs = page.locator('button').filter({ hasText: /文生图|融图|参考图/i }).all();
    console.log('Tab count:', (await tabs).length);
    
    // 检查输入框
    const textarea = page.locator('textarea').first();
    const hasTextarea = await textarea.isVisible().catch(() => false);
    console.log('Has Textarea:', hasTextarea);
    
    // 检查历史面板
    const historyText = await page.locator('text=历史').first().isVisible().catch(() => false);
    console.log('Has History Panel:', historyText);
  });
  
  test('测试生成图片流程', async ({ page }) => {
    await page.goto('http://localhost:3000/nano2');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    // 输入prompt
    const textarea = page.locator('textarea').first();
    await textarea.fill('a beautiful sunset over the ocean');
    console.log('Filled prompt');
    
    // 点击生成按钮
    const genBtn = page.getByRole('button', { name: /开始生成/i });
    await genBtn.click();
    console.log('Clicked generate');
    
    // 等待一段时间
    await page.waitForTimeout(5000);
    
    // 检查是否有进度条或结果
    const progressBar = page.locator('[role="progressbar"]').isVisible().catch(() => false);
    console.log('Has Progress Bar:', progressBar);
    
    // 检查页面内容变化
    const bodyText = await page.locator('body').innerText();
    const hasResult = bodyText.includes('生成成功') || bodyText.includes('完成') || bodyText.includes('预览');
    console.log('Has Result:', hasResult);
  });
});
