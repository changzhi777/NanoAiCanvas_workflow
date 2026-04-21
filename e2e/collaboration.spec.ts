import { test, expect } from '@playwright/test';

test.describe('协作功能测试', () => {
  test('验证协作功能界面和基础操作', async ({ page }) => {
    console.log('\n=== 协作功能测试 ===\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 切换到 Workflow 页面
    console.log('1. 切换到 Workflow 页面:');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("NanoAI Workflow")').click();
    await page.waitForTimeout(6000);

    // 检查协作按钮
    console.log('\n2. 检查协作按钮:');
    const collabButtonExists = await page.locator('button[title*="协作"]').count();
    console.log(`  协作按钮存在: ${collabButtonExists > 0 ? '✓ 是' : '✗ 否'}`);

    if (collabButtonExists > 0) {
      // 点击协作按钮
      console.log('\n3. 打开协作面板:');

      try {
        await page.locator('button[title*="协作"]').click({ force: true, timeout: 10000 });
      } catch (error) {
        console.log('  force点击失败，使用JavaScript直接点击...');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const collabBtn = buttons.find(b => b.getAttribute('title')?.includes('协作'));
          if (collabBtn) {
            (collabBtn as HTMLButtonElement).click();
          }
        });
      }

      await page.waitForTimeout(1500);

      // 检查协作面板是否打开
      const dialogVisible = await page.isVisible('text=多人协作').catch(() => false);
      console.log(`  协作面板显示: ${dialogVisible ? '✓ 是' : '✗ 否'}`);

      if (dialogVisible) {
        console.log('  ✓ 协作面板已打开');

        // 检查协作面板内容
        const panelContent = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';

          return {
            hasJoinInfo: bodyText.includes('加入协作会话') || bodyText.includes('实时协作'),
            hasSessionInput: bodyText.includes('会话 ID') || bodyText.includes('Session ID'),
            hasUserName: bodyText.includes('用户名') || bodyText.includes('Username'),
            hasOnlineUsers: bodyText.includes('在线用户') || bodyText.includes('Online users'),
            hasFeatures: bodyText.includes('实时同步') || bodyText.includes('Real-time sync'),
          };
        });

        console.log('\n4. 检查协作面板内容:');
        console.log(`  有加入信息: ${panelContent.hasJoinInfo ? '✓ 是' : '✗ 否'}`);
        console.log(`  会话输入框: ${panelContent.hasSessionInput ? '✓ 是' : '✗ 否'}`);
        console.log(`  用户名输入框: ${panelContent.hasUserName ? '✓ 是' : '✗ 否'}`);
        console.log(`  在线用户区域: ${panelContent.hasOnlineUsers ? '✓ 是' : '✗ 否'}`);
        console.log(`  功能说明: ${panelContent.hasFeatures ? '✓ 是' : '✗ 否'}`);

        // 测试加入会话功能
        console.log('\n5. 测试加入协作会话:');

        const joinResult = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const sessionIdInput = inputs.find(input => {
            const placeholder = input.getAttribute('placeholder') || '';
            return placeholder.includes('会话') || placeholder.includes('Session');
          });
          const userNameInput = inputs.find(input => {
            const placeholder = input.getAttribute('placeholder') || '';
            return placeholder.includes('用户') || placeholder.includes('name');
          });

          if (sessionIdInput && userNameInput) {
            // 输入测试数据
            sessionIdInput.value = 'test-session-' + Date.now();
            userNameInput.value = 'Test User';

            // 查找加入按钮
            const buttons = Array.from(document.querySelectorAll('button'));
            const joinButton = buttons.find(btn => {
              const text = btn.textContent || '';
              return text.includes('加入协作') || text.includes('Join');
            });

            if (joinButton) {
              (joinButton as HTMLButtonElement).click();
              return { success: true };
            }
          }

          return { success: false, reason: 'Inputs or button not found' };
        });

        console.log(`  加入会话测试: ${joinResult.success ? '✓ 成功' : '✗ 失败'}`);

        if (joinResult.success) {
          await page.waitForTimeout(2000);

          // 检查是否成功加入
          const afterJoin = await page.evaluate(() => {
            const bodyText = document.body.textContent || '';
            return {
              hasLeaveButton: bodyText.includes('退出协作') || bodyText.includes('Leave'),
              hasOnlineUsers: bodyText.includes('在线用户') || bodyText.includes('Online users'),
              hasSessionInfo: bodyText.includes('会话ID') || bodyText.includes('Session ID'),
            };
          });

          console.log('\n6. 验证加入后的状态:');
          console.log(`  有退出按钮: ${afterJoin.hasLeaveButton ? '✓ 是' : '✗ 否'}`);
          console.log(`  显示会话信息: ${afterJoin.hasSessionInfo ? '✓ 是' : '✗ 否'}`);
        }

        // 检查在线用户指示器
        console.log('\n7. 检查在线用户指示器:');

        // 关闭对话框
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        const hasIndicator = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          // 查找包含数字的用户指示器
          const userIndicators = Array.from(document.querySelectorAll('div')).filter(div => {
            const text = div.textContent || '';
            return text.includes('👤') && /\d+/.test(text);
          });

          return {
            hasIndicator: userIndicators.length > 0,
            indicatorCount: userIndicators.length,
            indicators: userIndicators.slice(0, 3).map(el => el.textContent?.trim().substring(0, 30)),
          };
        });

        console.log(`  有用户指示器: ${hasIndicator ? '✓ 是' : '✗ 否'}`);
        if (hasIndicator) {
          console.log(`  指示器数量: ${hasIndicator.indicatorCount}`);
          console.log(`  指示器示例: ${hasIndicator.indicators.join(', ')}`);
        }
      }
    }

    // 测试协作API
    console.log('\n8. 测试协作API功能:');

    const apiTest = await page.evaluate(() => {
      // @ts-ignore
      if (window.useCollaborationStore) {
        // @ts-ignore
        const store = window.useCollaborationStore.getState();

        // 测试启用协作
        store.enableCollaboration('test-session', 'Test User');

        // @ts-ignore
        const isEnabled = store.isEnabled;
        // @ts-ignore
        const isConnected = store.isConnected;
        // @ts-ignore
        const sessionId = store.sessionId;
        // @ts-ignore
        const userId = store.userId;

        return {
          success: true,
          isEnabled,
          isConnected,
          sessionId,
          userId,
          hasStore: true,
        };
      } else {
        return {
          success: false,
          error: 'Collaboration store not accessible',
        };
      }
    });

    console.log(`  API测试结果: ${apiTest.success ? '✓ 成功' : '✗ 失败'}`);

    if (apiTest.success) {
      console.log(`  协作功能已启用: ${apiTest.isEnabled ? '✓ 是' : '✗ 否'}`);
      console.log(`  会话ID: ${apiTest.sessionId}`);
      console.log(`  用户ID: ${apiTest.userId}`);
    }

    console.log('\n✓ 协作功能测试完成\n');
  });
});
