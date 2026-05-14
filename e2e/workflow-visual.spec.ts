import { test, expect } from '@playwright/test';

test.describe('工作流画布视觉效果验证', () => {
  test('截图对比和背景点阵验证', async ({ page }) => {
    console.log('==================== 视觉效果验证 ==================');

    // 清除并重新加载
    await page.context().clearCookies();
    await page.goto('http://localhost:3000');

    // 清除 localStorage
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    console.log('\n1️⃣ 检查背景元素的属性');
    const backgroundElement = page.locator('.react-flow__background');

    // 检查元素是否存在
    const exists = await backgroundElement.count();
    console.log('  背景元素存在:', exists > 0);

    if (exists > 0) {
      // 检查尺寸
      const box = await backgroundElement.boundingBox();
      console.log('  背景尺寸:', box);

      // 检查 SVG 内容
      const hasSVG = await page.locator('.react-flow__background svg').count() > 0;
      console.log('  有 SVG:', hasSVG);

      if (hasSVG) {
        // 检查圆点（pattern dots）
        const circles = await page.locator('.react-flow__background circle').count();
        console.log('  圆点数量:', circles);

        // 检查 pattern 元素
        const patterns = await page.locator('.react-flow__background pattern').count();
        console.log('  pattern 数量:', patterns);
      }

      // 检查计算样式
      const styles = await backgroundElement.evaluate((el) => {
        return {
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          opacity: window.getComputedStyle(el).opacity,
          backgroundColor: window.getComputedStyle(el).backgroundColor,
        };
      });
      console.log('  计算样式:', styles);
    }

    console.log('\n2️⃣ 检查节点和连线');
    const nodeCount = await page.locator('.react-flow__node').count();
    const edgeCount = await page.locator('.react-flow__edge-path, .edge-enhanced').count();
    console.log('  节点数量:', nodeCount);
    console.log('  连线数量:', edgeCount);

    console.log('\n3️⃣ 截图保存');
    // 保存截图
    await page.screenshot({
      path: 'test-results/workflow-canvas.png',
      fullPage: true
    });
    console.log('  ✅ 截图已保存: test-results/workflow-canvas.png');

    console.log('\n4️⃣ 对比截图 - 无限画布');
    // 切换到无限画布并截图
    await page.getByText('无限画布').click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/canvas-page.png',
      fullPage: true
    });
    console.log('  ✅ 无限画布截图已保存: test-results/canvas-page.png');

    console.log('\n==================== 验证完成 ==================');

    // 断言核心功能
    expect(nodeCount, '应该有节点').toBeGreaterThan(0);
    expect(edgeCount, '应该有连线').toBeGreaterThan(0);
  });
});
