import { test, expect } from '@playwright/test'

test.describe('撤销/重做功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
  })

  test.describe('无限画布页面', () => {
    test('应该能切换到无限画布页面', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(500)
      await expect(page.getByText('无限画布')).toBeVisible()
    })

    test('应该能使用Ctrl+Z撤销删除操作', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(1000)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        // 删除一个节点
        await nodes.first().click({ force: true })
        await page.waitForTimeout(300)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(500)

        const afterDeleteCount = await nodes.count()
        expect(afterDeleteCount).toBeLessThan(nodeCount)

        // 撤销删除
        await page.keyboard.press('Meta+z') // Mac用Meta
        await page.waitForTimeout(500)

        const afterUndoCount = await nodes.count()
        expect(afterUndoCount).toBeGreaterThan(afterDeleteCount)
      } else {
        test.skip()
      }
    })

    test('应该能使用Ctrl+Shift+Z重做', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(1000)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        // 删除节点
        await nodes.first().click({ force: true })
        await page.waitForTimeout(300)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(500)

        const afterDeleteCount = await nodes.count()

        // 撤销
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(500)

        const afterUndoCount = await nodes.count()

        // 重做
        await page.keyboard.press('Meta+Shift+z')
        await page.waitForTimeout(500)

        const afterRedoCount = await nodes.count()
        expect(afterRedoCount).toBe(afterDeleteCount)
      } else {
        test.skip()
      }
    })

    test('应该能使用Ctrl+Y重做', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(1000)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        // 删除节点
        await nodes.first().click({ force: true })
        await page.waitForTimeout(300)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(500)

        // 撤销
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(500)

        const afterUndoCount = await nodes.count()

        // 使用Ctrl+Y重做
        await page.keyboard.press('Meta+y')
        await page.waitForTimeout(500)

        const afterRedoCount = await nodes.count()
        expect(afterRedoCount).toBeLessThan(afterUndoCount)
      } else {
        test.skip()
      }
    })
  })

  test.describe('NanoAI Workflow页面', () => {
    test('应该能在Workflow页面使用Cmd+Z撤销', async ({ page }) => {
      await page.getByText('NanoAI Workflow').click()
      await page.waitForTimeout(1000)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount > 0) {
        // 删除节点
        await nodes.first().click({ force: true })
        await page.waitForTimeout(300)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(500)

        const afterDeleteCount = await nodes.count()

        // 撤销
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(500)

        const afterUndoCount = await nodes.count()
        expect(afterUndoCount).toBeGreaterThan(afterDeleteCount)
      } else {
        test.skip()
      }
    })
  })

  test.describe('快捷键组合测试', () => {
    test('多个撤销操作应该依次回退', async ({ page }) => {
      await page.getByText('无限画布').click()
      await page.waitForTimeout(1000)

      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()

      if (nodeCount >= 2) {
        // 删除两个节点
        await nodes.nth(0).click({ force: true })
        await page.waitForTimeout(200)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(300)

        await nodes.nth(0).click({ force: true })
        await page.waitForTimeout(200)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(500)

        const afterDeleteCount = await nodes.count()

        // 撤销两次
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(300)
        const afterFirstUndo = await nodes.count()

        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(300)
        const afterSecondUndo = await nodes.count()

        expect(afterSecondUndo).toBeGreaterThan(afterFirstUndo)
        expect(afterSecondUndo).toBe(nodeCount)
      } else {
        test.skip()
      }
    })
  })
})
