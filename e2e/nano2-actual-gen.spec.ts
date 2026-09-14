import { test, expect } from '@playwright/test';

test('实际生成图片测试', async ({ page }) => {
  await page.goto('http://localhost:3000/nano2');
  await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  
  console.log('=== 开始实际生图测试 ===');
  
  // 1. 输入prompt
  const textarea = page.locator('textarea').first();
  const testPrompt = 'a cute cat sitting on a red chair';
  await textarea.fill(testPrompt);
  console.log('已输入prompt:', testPrompt);
  
  // 2. 点击生图按钮
  const genBtn = page.getByRole('button', { name: /开始生成/i });
  await genBtn.click();
  console.log('已点击生成按钮');
  
  // 3. 等待生图完成 (最多60秒)
  console.log('等待生图完成...');
  
  // 检查进度条出现
  await page.waitForTimeout(2000);
  
  // 持续检查直到有结果
  let attempts = 0;
  let generated = false;
  
  while (attempts < 30 && !generated) {
    await page.waitForTimeout(2000);
    
    // 检查页面内容是否有生成结果
    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('生成成功') || bodyText.includes('完成') || bodyText.includes('预览')) {
      generated = true;
      console.log('检测到生成完成标志!');
      break;
    }
    
    // 检查是否有图片出现
    const imgCount = await page.locator('img').count();
    if (imgCount > 0) {
      generated = true;
      console.log('检测到图片生成! 图片数量:', imgCount);
      break;
    }
    
    attempts++;
    console.log(`等待中... (${attempts * 2}s)`);
  }
  
  // 4. 最终检查
  const finalBodyText = await page.locator('body').innerText();
  const finalImgCount = await page.locator('img').count();
  
  console.log('\n=== 测试结果 ===');
  console.log('页面包含生成成功文字:', finalBodyText.includes('生成成功') || finalBodyText.includes('完成'));
  console.log('页面包含预览文字:', finalBodyText.includes('预览'));
  console.log('生成图片数量:', finalImgCount);
  console.log('生图是否成功:', generated);
  
  // 截图保存结果
  await page.screenshot({ path: 'test-results/nano2-gen-result.png', fullPage: true });
  console.log('截图已保存: test-results/nano2-gen-result.png');
  
  expect(generated || finalImgCount > 0).toBeTruthy();
});
