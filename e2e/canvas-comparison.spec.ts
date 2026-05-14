import { test, expect } from '@playwright/test';

test.describe('对比无限画布和工作流画布', () => {
  test('对比两个画布的配置和显示', async ({ page }) => {
    console.log('==================== 对比测试开始 ====================');

    await page.goto('http://localhost:3000');
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    console.log('\n📊 测试 1: 检查 ReactFlow 画布');
    const hasFlow = await page.locator('.react-flow').count() > 0;
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`ReactFlow 存在: ${hasFlow}, 节点数量: ${nodeCount}`);
    expect(hasFlow).toBeTruthy();

    console.log('\n📊 测试 2: 检查画布元素');
    const hasBackground = await page.locator('.react-flow__background').count() > 0;
    const hasMiniMap = await page.locator('.react-flow__minimap').count() > 0;
    const hasControls = await page.locator('.react-flow__controls').count() > 0;
    console.log(`背景: ${hasBackground}, 小地图: ${hasMiniMap}, 控制: ${hasControls}`);

    console.log('\n📊 测试 3: 刷新页面');
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const bgVisible = await page.locator('.react-flow__background').isVisible();
    const mmVisible = await page.locator('.react-flow__minimap').isVisible();
    const ctrlVisible = await page.locator('.react-flow__controls').isVisible();
    console.log(`刷新后 - 背景: ${bgVisible}, 小地图: ${mmVisible}, 控制: ${ctrlVisible}`);

    console.log('\n==================== 对比测试完成 ====================');

    expect(bgVisible).toBeTruthy();
  });
});