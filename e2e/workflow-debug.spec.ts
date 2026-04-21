import { test, expect } from '@playwright/test';

test.describe('调试工作流画布显示', () => {
  test('直接测试工作流页面的显示和自动加载', async ({ page }) => {
    console.log('==================== 工作流画布调试 ==================');

    // 清除所有数据
    await page.context().clearCookies();

    console.log('\n1️⃣ 首次访问（清除 localStorage）');
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      console.log('✅ localStorage 已清除');
    });

    console.log('\n2️⃣ 重新加载页面');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待自动加载

    // 捕获控制台日志
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    console.log('\n3️⃣ 检查画布元素');
    const background = page.locator('.react-flow__background');
    const miniMap = page.locator('.react-flow__minimap');
    const controls = page.locator('.react-flow__controls');
    const nodes = page.locator('.react-flow__node');
    const edges = page.locator('.react-flow__edge-path, .edge-enhanced');
    const handles = page.locator('.react-flow__handle');

    const bgVisible = await background.isVisible();
    const mmVisible = await miniMap.isVisible();
    const ctrlVisible = await controls.isVisible();
    const nodeCount = await nodes.count();
    const edgeCount = await edges.count();
    const handleCount = await handles.count();

    console.log('📊 画布状态:');
    console.log('  背景可见:', bgVisible);
    console.log('  小地图可见:', mmVisible);
    console.log('  控制面板可见:', ctrlVisible);
    console.log('  节点数量:', nodeCount);
    console.log('  连线数量:', edgeCount);
    console.log('  连接端点数量:', handleCount);

    console.log('\n4️⃣ 检查关键日志');
    const relevantLogs = logs.filter(log =>
      log.includes('🔍') ||
      log.includes('🚀') ||
      log.includes('✅') ||
      log.includes('自动加载') ||
      log.includes('模板')
    );
    console.log('相关日志 (最近20条):');
    relevantLogs.slice(-20).forEach(log => console.log('  ', log));

    console.log('\n5️⃣ 检查 localStorage 状态');
    const storage = await page.evaluate(() => {
      return {
        workflowTemplateLoaded: localStorage.getItem('workflow-template-loaded'),
        nanoaiWorkflowStorage: localStorage.getItem('nanoai-workflow-storage'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('  workflow-template-loaded:', storage.workflowTemplateLoaded);
    console.log('  nanoai-workflow-storage 存在:', !!storage.nanoaiWorkflowStorage);
    console.log('  所有 localStorage 键:', storage.allKeys);

    console.log('\n6️⃣ 如果没有节点，手动触发模板加载');
    if (nodeCount === 0) {
      console.log('⚠️  没有检测到节点，尝试手动加载模板...');

      const result = await page.evaluate(() => {
        // 检查 store 状态
        const hasStore = !!(window as any).__ZUSTAND_STORES__;
        const storeNames = hasStore ? Object.keys((window as any).__ZUSTAND_STORES__) : [];

        return {
          hasStore,
          storeNames,
          // 尝试获取模板数据
          hasTemplates: Array.isArray((window as any).__TEMPLATE_DATA__)
        };
      });

      console.log('  Store 检测:', result);

      // 手动点击"添加节点"按钮
      const addNodeButton = page.getByText('添加节点').or(page.getByText('生成分镜')).or(page.getByText('浏览模板'));
      const buttonExists = await addNodeButton.first().isVisible({ timeout: 2000 });

      if (buttonExists) {
        console.log('  ✅ 找到添加节点按钮');
        // 点击"浏览模板"按钮
        const templateButton = page.getByText('浏览模板');
        if (await templateButton.isVisible()) {
          await templateButton.click();
          await page.waitForTimeout(1000);

          const newNodeCount = await nodes.count();
          console.log('  点击后节点数量:', newNodeCount);
        }
      } else {
        console.log('  ❌ 未找到添加节点按钮');
      }
    }

    console.log('\n7️⃣ 最终状态检查');
    const finalNodeCount = await nodes.count();
    const finalEdgeCount = await edges.count();
    const finalBackgroundVisible = await background.isVisible();

    console.log('✅ 最终状态:');
    console.log('  背景可见:', finalBackgroundVisible);
    console.log('  节点数量:', finalNodeCount);
    console.log('  连线数量:', finalEdgeCount);

    console.log('\n==================== 调试完成 ====================');

    // 断言
    expect(finalBackgroundVisible, '背景应该可见').toBe(true);
    expect(finalNodeCount, '应该有节点显示').toBeGreaterThan(0);
  });

  test('对比两个页面的 HTML 结构', async ({ page }) => {
    console.log('\n==================== HTML 结构对比 ==================');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 检查无限画布的 HTML
    console.log('\n📄 无限画布 HTML:');
    const canvasHTML = await page.locator('.canvas-wrapper').first().innerHTML();
    console.log('  有 react-flow__background:', canvasHTML.includes('react-flow__background'));
    console.log('  有 react-flow__minimap:', canvasHTML.includes('react-flow__minimap'));
    console.log('  有 react-flow__controls:', canvasHTML.includes('react-flow__controls'));

    // 检查工作流画布的 HTML
    console.log('\n📄 工作流画布 HTML:');
    const workflowHTML = await page.locator('.nanoai-workflow').innerHTML();
    console.log('  有 react-flow__background:', workflowHTML.includes('react-flow__background'));
    console.log('  有 react-flow__minimap:', workflowHTML.includes('react-flow__minimap'));
    console.log('  有 react-flow__controls:', workflowHTML.includes('react-flow__controls'));

    console.log('\n==================== 对比完成 ==================');
  });
});
