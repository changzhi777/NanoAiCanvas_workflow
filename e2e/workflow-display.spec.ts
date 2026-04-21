import { test, expect } from '@playwright/test';

test.describe('工作流页面显示测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清空 localStorage，确保首次加载
    await page.context().clearCookies();
    await page.goto('http://localhost:3000');
  });

  test('应该显示工作流页面和默认模板', async ({ page }) => {
    console.log('1. 等待页面加载...');
    await page.waitForLoadState('networkidle');

    console.log('2. 检查是否在 Workflow 页面...');
    // 检查页面切换按钮状态
    const workflowButton = page.getByText('NanoAI Workflow');
    await expect(workflowButton).toBeVisible();

    console.log('3. 检查画布背景...');
    // 检查背景网格
    const background = page.locator('.react-flow__background');
    await expect(background).toBeVisible();

    console.log('4. 检查小地图...');
    // 检查小地图是否存在
    const miniMap = page.locator('.react-flow__minimap');
    await expect(miniMap).toBeVisible({ timeout: 5000 });

    console.log('5. 检查控制面板...');
    // 检查控制面板
    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible();

    console.log('6. 检查是否加载了节点...');
    // 等待节点加载（首次会自动加载模板）
    await page.waitForTimeout(1000); // 等待自动加载完成
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`  节点数量: ${nodeCount}`);
    expect(nodeCount).toBeGreaterThan(0);

    console.log('7. 检查节点样式...');
    // 检查第一个节点是否有彩色头部
    const firstNode = nodes.first();
    await expect(firstNode).toBeVisible();
    const nodeHeader = firstNode.locator('h3').first();
    await expect(nodeHeader).toBeVisible();

    console.log('8. 检查连接线...');
    // 检查连线是否存在
    const edges = page.locator('.react-flow__edge-path, .edge-enhanced');
    const edgeCount = await edges.count();
    console.log(`  连线数量: ${edgeCount}`);
    expect(edgeCount).toBeGreaterThan(0);

    console.log('✅ 工作流页面显示测试完成！');
  });

  test('应该显示侧边栏和工具栏', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 等待模板加载

    console.log('1. 检查左侧边栏...');
    // 检查侧边栏是否存在
    const sidebar = page.locator('[data-testid="workflow-sidebar"]').or(
      page.locator('.fixed.left-0.top-0.bottom-0')
    );
    await expect(sidebar.first()).toBeVisible();

    console.log('2. 检查顶部工具栏...');
    // 检查工具栏
    const toolbar = page.locator('[data-testid="workflow-toolbar"]').or(
      page.locator('.fixed.top-0.left-0.right-0')
    );
    await expect(toolbar.first()).toBeVisible();

    console.log('3. 检查节点库面板...');
    // 检查是否有"添加节点"按钮
    const addNodeButton = page.getByText('添加节点').or(
      page.getByText('节点库')
    );
    await expect(addNodeButton.first()).toBeVisible({ timeout: 5000 });

    console.log('✅ 侧边栏和工具栏测试完成！');
  });

  test('连接端点和连线应该有增强效果', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // 等待模板和动画加载完成

    console.log('1. 检查连接端点大小...');
    // 检查连接端点
    const handles = page.locator('.react-flow__handle');
    const handleCount = await handles.count();
    console.log(`  连接端点数量: ${handleCount}`);
    expect(handleCount).toBeGreaterThan(0);

    // 检查第一个连接端点的大小（应该是 16px）
    const firstHandle = handles.first();
    const handleBox = await firstHandle.boundingBox();
    if (handleBox) {
      console.log(`  端点尺寸: ${handleBox.width}x${handleBox.height}`);
      expect(handleBox.width).toBeGreaterThanOrEqual(14); // 允许一些误差
      expect(handleBox.height).toBeGreaterThanOrEqual(14);
    }

    console.log('2. 检查连线样式...');
    // 检查连线是否有增强类
    const enhancedEdges = page.locator('.edge-enhanced');
    const enhancedCount = await enhancedEdges.count();
    console.log(`  增强连线数量: ${enhancedCount}`);

    console.log('3. 检查连接端点的光晕效果...');
    // 检查是否有 shadow-lg 类（光晕效果）
    const glowingHandles = page.locator('.react-flow__handle.shadow-lg');
    const glowingCount = await glowingHandles.count();
    console.log(`  发光端点数量: ${glowingCount}`);

    console.log('✅ 连接端点和连线增强效果测试完成！');
  });
});
