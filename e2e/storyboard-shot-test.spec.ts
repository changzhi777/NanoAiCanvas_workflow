import { test, expect, Page } from '@playwright/test';

test.describe('故事板分镜节点 — 独立测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('StoryboardShotANode 独立生成（直接填入分镜描述）', async ({ page }) => {
    // 1. 等待画布加载
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    console.log(`画布节点数: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);

    // 2. 找 StoryboardShotANode（故事板分镜节点）
    const storyboardNode = page.locator('.react-flow__node').filter({ hasText: '故事板' }).first();
    const sbVisible = await storyboardNode.isVisible({ timeout: 3000 });
    console.log(`故事板节点 visible: ${sbVisible}`);

    if (!sbVisible) {
      console.log('未找到故事板节点，跳过');
      test.skip();
      return;
    }

    // 3. 检查生成按钮状态
    const generateBtn = storyboardNode.locator('button').filter({ hasText: '生成' }).first();
    const btnDisabled = await generateBtn.isDisabled();
    console.log(`生成按钮 disabled: ${btnDisabled}`);

    // 4. 如果按钮 enabled，直接点击生成（节点自带上游数据）
    if (!btnDisabled) {
      console.log('点击生成按钮...');
      await generateBtn.click();
      await page.waitForTimeout(20000); // 等待生图（较长超时）

      await page.screenshot({ fullPage: false, path: `test-results/sb-after-gen-${Date.now()}.png` });

      // 检查节点状态
      const sbHtml = await storyboardNode.innerHTML();
      const success = sbHtml.includes('SUCCESS') || sbHtml.includes('已完成') || sbHtml.includes('green');
      console.log(`故事板节点状态: ${success ? '成功' : '执行中/失败'}`);
    } else {
      console.log('按钮 disabled，尝试填写上游文本...');

      // 尝试找到输入框并填写内容
      const textarea = storyboardNode.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.click();
        const testContent = '场景1：李小龙在武馆练功，双截棍挥舞\n场景2：恐龙从屏幕跳出\n场景3：李小龙飞踢击败恐龙';
        for (const char of testContent) {
          await page.keyboard.type(char);
          await page.waitForTimeout(20);
        }
        await page.waitForTimeout(500);

        const newBtnDisabled = await generateBtn.isDisabled();
        console.log(`填写后按钮 disabled: ${newBtnDisabled}`);

        if (!newBtnDisabled) {
          await generateBtn.click();
          console.log('已点击生成');
          await page.waitForTimeout(20000);
          await page.screenshot({ fullPage: false, path: `test-results/sb-after-fill-gen-${Date.now()}.png` });
        }
      }
    }
  });

  test('StoryboardShotANode API 直连验证', async ({ page }) => {
    // 直接测试 storyboard API 是否可用
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/glm/storyboard-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '李小龙在武馆练功，恐龙从屏幕跳出，李小龙飞踢击败恐龙', shot_count: 3 })
      });
      return { status: res.status, ok: res.ok };
    });
    console.log(`Storyboard API: ${response.status} (ok=${response.ok})`);
    expect(response.ok).toBe(true);
  });
});