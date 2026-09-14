/**
 * TVC 生产环境 E2E 实测
 */
import { test, expect } from '@playwright/test'

const PROD_URL = 'https://91zm.com.cn/nanoai'
const EMAIL = 'cz@nanoai.fun'
const PASSWORD = 'cz777777+'
const TVC_SCRIPT = '李小龙真人大战游戏恐龙快打的真人角色,场景是在游戏厅内'

test.describe('TVC 生产环境实测', () => {
  test.setTimeout(120000)

  test('Step 1: 登录', async ({ page }) => {
    await page.goto(`${PROD_URL}/login/`)
    await page.waitForTimeout(2000)

    await page.locator('input[placeholder="请输入邮箱/手机号"]').fill(EMAIL)
    await page.locator('input[placeholder="请输入密码"]').fill(PASSWORD)
    await page.locator('button:has-text("登录") >> nth=0').click()
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/prod-01-login.png', fullPage: true })

    const url = page.url()
    console.log('After login URL:', url)
    expect(url).not.toContain('/login/')
  })

  test('Step 2: 进入工作流并加载TVC模板', async ({ page }) => {
    await page.goto(`${PROD_URL}/login/`)
    await page.waitForTimeout(2000)
    await page.locator('input[placeholder="请输入邮箱/手机号"]').fill(EMAIL)
    await page.locator('input[placeholder="请输入密码"]').fill(PASSWORD)
    await page.locator('button:has-text("登录") >> nth=0').click()
    await page.waitForTimeout(3000)

    await page.goto(`${PROD_URL}/nano2/`)
    await page.waitForTimeout(5000)

    await page.screenshot({ path: 'test-results/prod-02-nano2-page.png', fullPage: true })

    // 查找并点击TVC模板
    const tvcSelectors = ['text=TVC视频V1', 'text=TVC视频', 'text=TVC']
    let templateLoaded = false
    for (const sel of tvcSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click()
        templateLoaded = true
        console.log(`TVC template found: ${sel}`)
        break
      }
    }

    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/prod-03-tvc-template.png', fullPage: true })

    if (templateLoaded) {
      // 验证3个节点加载
      const nodes = page.locator('.react-flow__node')
      const nodeCount = await nodes.count()
      console.log('Nodes loaded:', nodeCount)
      expect(nodeCount).toBeGreaterThanOrEqual(3)
    }
  })

  test('Step 3: 输入脚本并一键生成', async ({ page }) => {
    await page.goto(`${PROD_URL}/login/`)
    await page.waitForTimeout(2000)
    await page.locator('input[placeholder="请输入邮箱/手机号"]').fill(EMAIL)
    await page.locator('input[placeholder="请输入密码"]').fill(PASSWORD)
    await page.locator('button:has-text("登录") >> nth=0').click()
    await page.waitForTimeout(3000)

    await page.goto(`${PROD_URL}/nano2/`)
    await page.waitForTimeout(5000)

    // 加载TVC模板
    for (const sel of ['text=TVC视频V1', 'text=TVC视频', 'text=TVC']) {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click()
        break
      }
    }
    await page.waitForTimeout(3000)

    // 输入脚本
    const textarea = page.locator('.react-flow__node textarea').first()
    await textarea.waitFor({ state: 'visible', timeout: 10000 })
    await textarea.fill(TVC_SCRIPT)
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'test-results/prod-04-script-input.png', fullPage: true })

    // 点击一键生成
    const autoBtn = page.locator('button:has-text("一键生成")').first()
    if (await autoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await autoBtn.click()
      console.log('一键生成 clicked')
      await page.waitForTimeout(10000)
    }

    await page.screenshot({ path: 'test-results/prod-05-auto-generate.png', fullPage: true })

    const bodyText = await page.locator('body').textContent()
    console.log('Page text (first 500):', bodyText?.substring(0, 500))
  })
})
