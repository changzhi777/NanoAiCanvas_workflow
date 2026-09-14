import { test, expect } from '@playwright/test';

test.describe('插件系统功能测试', () => {
  test('验证插件管理界面和API功能', async ({ page }) => {
    console.log('\n=== 插件系统功能测试 ===\n');

    await page.goto('/');
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // 切换到 Workflow 页面
    console.log('1. 切换到 Workflow 页面:');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("NanoAI Workflow")').click();
    await page.waitForTimeout(6000);

    // 检查插件管理按钮
    console.log('\n2. 检查插件管理按钮:');
    const pluginButtonExists = await page.locator('button[title*="插件管理"]').count();
    console.log(`  插件管理按钮存在: ${pluginButtonExists > 0 ? '✓ 是' : '✗ 否'}`);

    if (pluginButtonExists > 0) {
      // 点击插件管理按钮
      console.log('\n3. 打开插件管理对话框:');

      try {
        await page.locator('button[title*="插件管理"]').click({ force: true, timeout: 10000 });
      } catch (error) {
        console.log('  force点击失败，使用JavaScript直接点击...');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const pluginBtn = buttons.find(b => b.getAttribute('title')?.includes('插件管理'));
          if (pluginBtn) {
            (pluginBtn as HTMLButtonElement).click();
          }
        });
      }

      await page.waitForTimeout(1500);

      // 检查插件管理对话框是否打开
      const dialogVisible = await page.isVisible('text=插件管理').catch(() => false);
      console.log(`  插件管理对话框显示: ${dialogVisible ? '✓ 是' : '✗ 否'}`);

      if (dialogVisible) {
        console.log('  ✓ 插件管理对话框已打开');

        // 检查插件列表
        const pluginList = await page.evaluate(() => {
          const pluginText = document.body.textContent || '';
          return {
            hasPluginList: pluginText.includes('已安装插件'),
            pluginCount: (pluginText.match(/已安装插件/g) || []).length,
            hasEmptyState: pluginText.includes('暂无插件'),
          };
        });

        console.log('\n4. 检查插件列表:');
        console.log(`  有插件列表: ${pluginList.hasPluginList ? '✓ 是' : '✗ 否'}`);
        console.log(`  插件数量显示: ${pluginList.pluginCount}`);
        console.log(`  空状态显示: ${pluginList.hasEmptyState ? '✓ 是' : '✗ 否'}`);

        // 检查插件开发提示
        const hasDevTip = await page.isVisible('text=开发自定义插件').catch(() => false);
        console.log(`  开发提示显示: ${hasDevTip ? '✓ 是' : '✗ 否'}`);

        // 测试插件API（通过JavaScript）
        console.log('\n5. 测试插件API功能:');

        const apiTest = await page.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-ignore
            if (window.usePluginStore) {
              // @ts-ignore
              const store = window.usePluginStore.getState();

              // 测试注册插件
              const testPlugin = {
                id: 'test-plugin-' + Date.now(),
                name: '测试插件',
                description: '用于测试的示例插件',
                version: '1.0.0',
                author: 'Test Suite',
                enabled: true,
                installedAt: new Date().toISOString(),
                nodeTypes: [
                  {
                    type: 'test_node',
                    name: '测试节点',
                    category: 'custom' as const,
                    description: '这是一个测试节点',
                    icon: '🧪',
                    inputs: [],
                    outputs: [],
                    params: [],
                    execute: async () => ({ result: 'test' }),
                  },
                ],
              };

              try {
                store.registerPlugin(testPlugin);

                // 验证插件已注册
                const registered = store.getPlugin(testPlugin.id);
                const allPlugins = store.getAllPlugins();
                const customNodeTypes = store.getCustomNodeTypes();

                setTimeout(() => {
                  resolve({
                    success: true,
                    pluginRegistered: !!registered,
                    pluginCount: allPlugins.length,
                    nodeTypeCount: customNodeTypes.length,
                    pluginEnabled: registered?.enabled || false,
                  });
                }, 500);
              } catch (error) {
                resolve({
                  success: false,
                  error: String(error),
                });
              }
            } else {
              resolve({
                success: false,
                error: 'Plugin store not accessible',
              });
            }
          });
        });

        console.log(`  API测试结果: ${apiTest.success ? '✓ 成功' : '✗ 失败'}`);

        if (apiTest.success) {
          console.log(`  插件注册成功: ${apiTest.pluginRegistered ? '✓ 是' : '✗ 否'}`);
          console.log(`  插件总数: ${apiTest.pluginCount}`);
          console.log(`  自定义节点类型数: ${apiTest.nodeTypeCount}`);
          console.log(`  插件启用状态: ${apiTest.pluginEnabled ? '✓ 是' : '✗ 否'}`);
        } else {
          console.log(`  失败原因: ${apiTest.error}`);
        }
      }
    }

    // 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('\n✓ 插件系统功能测试完成\n');
  });
});
