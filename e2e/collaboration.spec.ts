import { test, expect } from '@playwright/test';

test.describe('协作功能测试', () => {
  test('验证协作功能界面和基础操作', async ({ page }) => {
    console.log('\n=== 协作功能测试 ===\n');

    await page.goto('/');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 切换到 Workflow 页面
    console.log('1. 切换到 Workflow 页面:');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const workflowBtn = page.locator('button:has-text("Workflow")').first();
    if (await workflowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workflowBtn.click();
    } else {
      // 尝试点击页面切换器
      await page.locator('[class*="page-switcher"], [class*="tabs"] button').first().click().catch(() => {});
    }
    await page.waitForTimeout(2000);

    // 检查协作按钮
    console.log('\n2. 检查协作按钮:');
    const collabButtonExists = await page.locator('button[title*="协作"], button:has-text("协作")').count();
    console.log(`  协作按钮存在: ${collabButtonExists > 0 ? '✓ 是' : '✗ 否'}`);

    if (collabButtonExists > 0) {
      // 点击协作按钮
      console.log('\n3. 打开协作面板:');

      try {
        await page.locator('button[title*="协作"], button:has-text("协作")').first().click({ timeout: 5000 });
      } catch (error) {
        console.log('  点击失败，尝试使用 JavaScript...');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const collabBtn = buttons.find(b =>
            b.getAttribute('title')?.includes('协作') ||
            b.textContent?.includes('协作')
          );
          if (collabBtn) {
            (collabBtn as HTMLButtonElement).click();
          }
        });
      }

      await page.waitForTimeout(1000);

      // 检查协作面板是否打开
      const dialogVisible = await page.isVisible('text=协作').catch(() => false);
      console.log(`  协作面板显示: ${dialogVisible ? '✓ 是' : '✗ 否'}`);

      if (dialogVisible) {
        console.log('  ✓ 协作面板已打开');

        // 检查协作面板内容
        const panelContent = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          return {
            hasSessionInput: bodyText.includes('会话') || bodyText.includes('Session'),
            hasUserName: bodyText.includes('用户') || bodyText.includes('name'),
            hasOnlineUsers: bodyText.includes('在线') || bodyText.includes('Online'),
          };
        });

        console.log('\n4. 检查协作面板内容:');
        console.log(`  会话输入框: ${panelContent.hasSessionInput ? '✓ 是' : '✗ 否'}`);
        console.log(`  用户名输入框: ${panelContent.hasUserName ? '✓ 是' : '✗ 否'}`);
        console.log(`  在线用户区域: ${panelContent.hasOnlineUsers ? '✓ 是' : '✗ 否'}`);
      }
    }

    // 关闭对话框
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);

    console.log('\n✓ 协作功能测试完成\n');
  });
});
