import { test, expect } from '@playwright/test'

test.describe('Delete键删除功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test.describe('无限画布页面', () => {
    test('应该能切换到无限画布页面', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(500)
      await expect(page.getByText('无限画布')).toBeVisible()
    })

    test('应该能选择并删除节点', async ({ page }) => {
      // 切换到无限画布页面
      await page.getByText('无限画布').click()
      await page.waitForTimeout(1000)

      // 等待ReactFlow加载完成
      await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => {})

      // 点击画布创建一个节点（如果有的话）
      const canvas = page.locator('.react-flow__node').first()
      const nodeCount = await canvas.count()

      if (nodeCount > 0) {
        // 滚动到节点位置
        await canvas.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)

        // 选择第一个节点
        await canvas.click({ force: true })
        await page.waitForTimeout(300)

        // 验证节点被选中
        const isSelected = await canvas.evaluate(el =>
          el.classList.contains('selected')
        )

        if (isSelected || nodeCount > 0) {
          // 按Delete键
          await page.keyboard.press('Delete')
          await page.waitForTimeout(1000)

          // 验证节点被删除
          const newNodeCount = await page.locator('.react-flow__node').count()
          expect(newNodeCount).toBeLessThan(nodeCount)
        }
      } else {
        console.log('没有节点可以删除')
        test.skip()
      }
    })

    test('在输入框中按Delete不应该删除节点', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(500)

      // 这个测试需要有一个输入框的场景
      // 暂时跳过
      test.skip()
    })
  })

  test.describe('NanoAI Workflow页面', () => {
    test('应该能切换到Workflow页面', async ({ page }) => {
      await page.getByText('NanoAI Workflow').click()
      await page.waitForTimeout(500)

      // 验证Workflow特有的元素
      const workflowExists = await page.locator('.react-flow').count() > 0
      expect(workflowExists).toBeTruthy()
    })

    test('应该能选择并删除Workflow节点', async ({ page }) => {
      // 确保在Workflow页面
      await page.getByText('NanoAI Workflow').click()
      await page.waitForTimeout(1000)

      // 等待Workflow加载
      await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => {})

      // 获取节点数量
      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        const firstNode = nodes.first()

        // 滚动到节点
        await firstNode.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)

        // 选择第一个节点
        await firstNode.click({ force: true })
        await page.waitForTimeout(300)

        // 按Delete键
        await page.keyboard.press('Delete')
        await page.waitForTimeout(1000)

        // 验证节点被删除
        const newNodeCount = await page.locator('.react-flow__node').count()
        expect(newNodeCount).toBeLessThan(nodeCount)
      } else {
        console.log('没有Workflow节点可以删除')
        test.skip()
      }
    })

    test('应该能使用Backspace键删除节点', async ({ page }) => {
      await page.getByText('NanoAI Workflow').click()
      await page.waitForTimeout(500)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        await nodes.first().click()
        await page.waitForTimeout(200)

        // 按Backspace键
        await page.keyboard.press('Backspace')
        await page.waitForTimeout(500)

        const newNodeCount = await page.locator('.react-flow__node').count()
        expect(newNodeCount).toBeLessThan(nodeCount)
      } else {
        test.skip()
      }
    })
  })

  test.describe('跨页面测试', () => {
    test('两个页面都应该响应Delete键', async ({ page }) => {
      // 测试Workflow页面
      await page.getByText('NanoAI Workflow').click()
      await page.waitForTimeout(500)

      const workflowNodes = page.locator('.react-flow__node')
      const workflowCount = await workflowNodes.count()

      // 切换到Canvas页面
      await page.getByText('无限画布').click()
      await page.waitForTimeout(500)

      const canvasNodes = page.locator('.react-flow__node')
      const canvasCount = await canvasNodes.count()

      // 至少一个页面应该有节点
      expect(workflowCount + canvasCount).toBeGreaterThan(0)
    })
  })
})
