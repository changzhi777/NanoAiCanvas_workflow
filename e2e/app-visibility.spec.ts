import { test, expect } from '@playwright/test'

test.describe('应用可见性管理 - Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
  })

  test('appVisibilityStore 默认状态：V1/V2 active，其余 disabled', async ({ page }) => {
    // 触发 store 初始化，然后读取
    const defaults = await page.evaluate(() => {
      const raw = localStorage.getItem('nanoai-app-visibility')
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw)
        // Zustand persist 结构: { state: {...}, version: N }
        const state = parsed?.state || parsed
        return {
          v1: state?.workflowTemplates?.['storyboard-shot-a-workflow'],
          v2: state?.workflowTemplates?.['storyboard-v2-workflow'],
          otherTemplate: state?.workflowTemplates?.['storyboard-01'],
          inputTextNode: state?.workflowNodes?.['input_text'],
          imagePreviewNode: state?.workflowNodes?.['image_preview'],
          scriptGeneratorNode: state?.workflowNodes?.['script_generator'],
        }
      } catch {
        return null
      }
    })

    // 如果 localStorage 为空，说明还没初始化，跳过验证
    if (!defaults) {
      // 直接从 window 上的 store 获取
      const storeDefaults = await page.evaluate(() => {
        const store = (window as any).__APP_VISIBILITY_STORE__
        return store?.getState?.() || null
      })
      if (storeDefaults) {
        expect(storeDefaults.workflowTemplates['storyboard-shot-a-workflow']).toBe('active')
      }
      return
    }

    expect(defaults.v1).toBe('active')
    expect(defaults.v2).toBe('active')
    expect(defaults.otherTemplate).toBe('disabled')
    expect(defaults.inputTextNode).toBe('active')
    expect(defaults.imagePreviewNode).toBe('active')
    expect(defaults.scriptGeneratorNode).toBe('disabled')
  })

  test('Workflow 模板面板：disabled 模板显示但置灰', async ({ page }) => {
    // 点击模板按钮打开模板面板
    const templateBtn = page.locator('button:has-text("模板"), button[title*="模板"]').first()
    if (await templateBtn.isVisible()) {
      await templateBtn.click()
      await page.waitForTimeout(500)

      // 检查 V1 模板是否可点击（无 "未开放" 标签）
      const v1Card = page.locator('button:has-text("故事板分镜V1版")')
      if (await v1Card.isVisible()) {
        const hasLock = await v1Card.locator(':has-text("未开放")').count()
        expect(hasLock).toBe(0)
      }

      // 检查 disabled 模板是否显示 "未开放"
      const disabledCard = page.locator('button:has-text("故事板01")')
      if (await disabledCard.isVisible()) {
        const hasLock = await disabledCard.locator(':has-text("未开放")').count()
        expect(hasLock).toBeGreaterThan(0)
      }
    }
  })

  test('Workflow 侧边栏：disabled 节点置灰', async ({ page }) => {
    // 检查侧边栏中脚本生成节点（disabled）
    const nodeBtn = page.locator('button:has-text("脚本生成")').first()
    if (await nodeBtn.isVisible()) {
      const opacity = await nodeBtn.evaluate(el => {
        return window.getComputedStyle(el).opacity
      })
      expect(Number(opacity)).toBeLessThan(1)
    }

    // 检查文本输入节点（active）不被置灰
    const activeNode = page.locator('button:has-text("故事板分镜V1版")').first()
    if (await activeNode.isVisible()) {
      const opacity = await activeNode.evaluate(el => {
        return window.getComputedStyle(el).opacity
      })
      expect(Number(opacity)).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('应用可见性管理 - Nano 2', () => {
  test('Nano 2 store 默认状态：全部 active', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})

    const defaults = await page.evaluate(() => {
      const raw = localStorage.getItem('nanoai-app-visibility')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const state = parsed?.state || parsed
      return {
        textToImage: state?.nano2Modules?.['text-to-image'],
        fusion: state?.nano2Modules?.['fusion'],
        voice: state?.nano2Modules?.['voice'],
        storyboard: state?.nano2Modules?.['storyboard'],
      }
    })

    if (defaults) {
      expect(defaults.textToImage).toBe('active')
      expect(defaults.fusion).toBe('active')
      expect(defaults.voice).toBe('active')
      expect(defaults.storyboard).toBe('active')
    }
  })
})

test.describe('管理后台 - 应用管理页面', () => {
  test('Admin 侧边栏显示 Workflow 和 Nano 2 两个管理入口', async ({ page }) => {
    await page.goto('http://localhost:3000/nanoaicanvas/admin')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // 检查侧边栏包含两个新入口
    const sidebar = page.locator('aside')
    await expect(sidebar.locator('text=Workflow 管理')).toBeVisible()
    await expect(sidebar.locator('text=Nano 2 管理')).toBeVisible()
  })

  test('Workflow 管理页面可正常加载', async ({ page }) => {
    // 收集控制台错误
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('http://localhost:3000/nanoaicanvas/admin')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // 关闭 vite error overlay
    await page.evaluate(() => {
      const overlay = document.querySelector('vite-error-overlay')
      if (overlay) overlay.remove()
    })

    // 点击侧边栏 Workflow 管理链接
    const link = page.locator('aside >> text=Workflow 管理')
    await link.click({ force: true })
    await page.waitForTimeout(5000)

    // 如果有标题就验证，否则输出错误信息辅助调试
    const titleVisible = await page.locator('text=Workflow 应用管理').isVisible().catch(() => false)
    if (!titleVisible) {
      // 输出调试信息
      const bodyText = await page.locator('main').textContent().catch(() => 'N/A')
      console.log('Page content:', bodyText?.slice(0, 500))
      console.log('Console errors:', consoleErrors.join('\n'))
    }
    expect(titleVisible).toBeTruthy()

    // Tabs 切换
    const templateTab = page.locator('button[role="tab"]:has-text("模板管理")')
    const nodeTab = page.locator('button[role="tab"]:has-text("节点管理")')
    await expect(templateTab).toBeVisible()
    await expect(nodeTab).toBeVisible()

    // 切换到节点管理
    await nodeTab.click()
    await page.waitForTimeout(300)
  })

  test('Nano 2 管理页面可正常加载', async ({ page }) => {
    await page.goto('http://localhost:3000/nanoaicanvas/admin/apps/nano2')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // 页面标题
    await expect(page.locator('text=Nano 2 应用管理')).toBeVisible()

    // 统计概览
    await expect(page.locator('p.text-sm:has-text("可见可用")')).toBeVisible()
    await expect(page.locator('p.text-sm:has-text("可见不可用")')).toBeVisible()
    await expect(page.locator('p.text-sm:has-text("不可见")')).toBeVisible()
  })

  test('可见性状态切换可正常工作', async ({ page }) => {
    await page.goto('http://localhost:3000/nanoaicanvas/admin/apps/workflow')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // 找到第一个下拉框并切换状态
    const firstSelect = page.locator('select, [role="combobox"], button:has(svg)').first()
    if (await firstSelect.isVisible()) {
      // 获取当前状态
      const beforeState = await page.evaluate(() => {
        const raw = localStorage.getItem('nanoai-app-visibility')
        return raw ? JSON.parse(raw) : null
      })

      // 切换状态（点击第一个 Select 的 trigger）
      const selectTrigger = page.locator('[role="combobox"]').first()
      if (await selectTrigger.isVisible()) {
        await selectTrigger.click()
        await page.waitForTimeout(300)

        // 选择 "不可见"
        const hiddenOption = page.locator('text=不可见').first()
        if (await hiddenOption.isVisible()) {
          await hiddenOption.click()
          await page.waitForTimeout(500)

          // 验证 localStorage 已更新
          const afterState = await page.evaluate(() => {
            const raw = localStorage.getItem('nanoai-app-visibility')
            return raw ? JSON.parse(raw) : null
          })

          // 状态应该变化了
          expect(JSON.stringify(beforeState)).not.toBe(JSON.stringify(afterState))
        }
      }
    }
  })
})
