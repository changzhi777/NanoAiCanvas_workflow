import { test, expect } from '@playwright/test';

test.describe('对比无限画布和工作流画布', () => {
  test('对比两个画布的配置和显示', async ({ page }) => {
    console.log('==================== 对比测试开始 ====================');

    // 清除 localStorage
    await page.context().clearCookies();
    await page.goto('http://localhost:3000');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n📊 测试 1: 检查两个页面的切换按钮');
    const canvasButton = page.getByText('无限画布');
    const workflowButton = page.getByText('NanoAI Workflow');

    await expect(canvasButton).toBeVisible();
    await expect(workflowButton).toBeVisible();
    console.log('✅ 切换按钮存在');

    console.log('\n📊 测试 2: 切换到无限画布页面');
    await canvasButton.click();
    await page.waitForTimeout(500);

    // 检查无限画布的元素
    const canvasBackground = page.locator('.react-flow__background');
    const canvasMiniMap = page.locator('.react-flow__minimap');
    const canvasControls = page.locator('.react-flow__controls');
    const canvasNodes = page.locator('.react-flow__node');

    console.log('无限画布 - 背景可见:', await canvasBackground.isVisible());
    console.log('无限画布 - 小地图可见:', await canvasMiniMap.isVisible());
    console.log('无限画布 - 控制面板可见:', await canvasControls.isVisible());
    console.log('无限画布 - 节点数量:', await canvasNodes.count());

    console.log('\n📊 测试 3: 切换到工作流页面');
    await workflowButton.click();
    await page.waitForTimeout(500);

    // 检查工作流画布的元素
    const workflowBackground = page.locator('.react-flow__background');
    const workflowMiniMap = page.locator('.react-flow__minimap');
    const workflowControls = page.locator('.react-flow__controls');
    const workflowNodes = page.locator('.react-flow__node');

    console.log('工作流 - 背景可见:', await workflowBackground.isVisible());
    console.log('工作流 - 小地图可见:', await workflowMiniMap.isVisible());
    console.log('工作流 - 控制面板可见:', await workflowControls.isVisible());
    console.log('工作流 - 节点数量:', await workflowNodes.count());

    console.log('\n📊 测试 4: 清除 localStorage 并刷新');
    // 在控制台执行清除脚本
    await page.evaluate(() => {
      console.log('🧹 清除 localStorage...');
      ['workflow-template-loaded', 'workflow-force-reload', 'nanoai-workflow-storage', 'sidebar-collapsed'].forEach(k => localStorage.removeItem(k));
      console.log('✅ 清除完成');
    });

    console.log('\n📊 测试 5: 刷新页面');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待自动加载

    // 再次检查工作流页面
    const workflowBackground2 = page.locator('.react-flow__background');
    const workflowMiniMap2 = page.locator('.react-flow__minimap');
    const workflowControls2 = page.locator('.react-flow__controls');
    const workflowNodes2 = page.locator('.react-flow__node');

    const bgVisible = await workflowBackground2.isVisible();
    const mmVisible = await workflowMiniMap2.isVisible();
    const ctrlVisible = await workflowControls2.isVisible();
    const nodeCount = await workflowNodes2.count();

    console.log('刷新后 - 背景可见:', bgVisible);
    console.log('刷新后 - 小地图可见:', mmVisible);
    console.log('刷新后 - 控制面板可见:', ctrlVisible);
    console.log('刷新后 - 节点数量:', nodeCount);

    console.log('\n📊 测试 6: 检查控制台日志');
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('🔍') || msg.text().includes('🚀') || msg.text().includes('✅')) {
        logs.push(msg.text());
      }
    });

    // 重新加载以捕获日志
    await page.evaluate(() => location.reload());
    await page.waitForTimeout(2000);

    console.log('控制台日志 (最近10条):');
    logs.slice(-10).forEach(log => console.log('  ', log));

    console.log('\n==================== 对比测试完成 ====================');

    // 断言
    expect(bgVisible, '背景应该可见').toBe(true);
    expect(mmVisible, '小地图应该可见').toBe(true);
    expect(ctrlVisible, '控制面板应该可见').toBe(true);
  });
});
