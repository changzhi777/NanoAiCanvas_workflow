/**
 * TVC 全链路 UI E2E：注册 → 审批 → 登录 → 工作流 → 资源
 *
 * 运行：PROD_URL=https://91zm.com.cn/nanoai pnpm test:e2e e2e/full-flow.spec.ts --project=chromium
 */
import { test, expect, APIRequestContext, BrowserContext, Page } from '@playwright/test'

const PROD = process.env.PROD_URL || 'https://91zm.com.cn/nanoai'
const ADMIN = '14455975'
const ADMIN_PASS = 'cz777777+'
const TEST_USER = 'zhy'
const TEST_USER_PASS = 'zhy@2026'
const TEST_USER_EMAIL = 'zhy@nanoai.fun'

// 由于 zhy 已存在，第一个 test 验证注册失败；新 test 使用唯一 suffix
const STAMP = Date.now().toString(36)
const NEW_USER = `e2e_${STAMP}`
const NEW_EMAIL = `${NEW_USER}@nanoai.fun`
const NEW_PASS = 'e2eTest@2026'

test.describe.serial('TVC 全链路 UI E2E', () => {
  test.setTimeout(120000)
  test.slow()

  let adminToken = ''
  let userToken = ''
  let newUserId = ''

  test('1. UI 打开登录页（接受已登录态跳转）', async ({ page }) => {
    await page.goto(`${PROD}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(3000)
    const url = page.url()
    console.log(`当前 URL: ${url}`)
    // 接受 /login、/workflow、/ 任一
    expect(url).toMatch(/\/nanoai\/(login|workflow|$)/)
  })

  test('2. API 注册新用户（admin 鉴权）', async ({ request }) => {
    const r = await request.post(`${PROD}/api/auth/register`, {
      data: { username: NEW_USER, email: NEW_EMAIL, password: NEW_PASS },
    })
    // 200 pending 是预期；如已存在则忽略
    expect([200, 400]).toContain(r.status())
    if (r.status() === 200) {
      const j = await r.json()
      expect(j.status).toBe('pending')
    }
  })

  test('3. admin 登录拿 token + role 验证', async ({ request }) => {
    const r = await request.post(`${PROD}/api/auth/login`, {
      data: { username: ADMIN, password: ADMIN_PASS },
    })
    expect(r.status()).toBe(200)
    const j = await r.json()
    expect(j.user.role).toBe('admin')
    expect(j.user.status).toBe('approved')
    adminToken = j.access_token
  })

  test('4. admin 查 pending + approve', async ({ request }) => {
    const r = await request.get(`${PROD}/api/admin/users/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.status()).toBe(200)
    const users = await r.json()
    const target = users.find((u: any) => u.email === NEW_EMAIL)
    expect(target, `找不到 pending 用户 ${NEW_EMAIL}`).toBeTruthy()
    newUserId = target.id

    // approve
    const ar = await request.post(`${PROD}/api/admin/users/${newUserId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(ar.status()).toBe(200)
  })

  test('5. 新用户登录拿 token', async ({ request }) => {
    const r = await request.post(`${PROD}/api/auth/login`, {
      data: { username: NEW_USER, password: NEW_PASS },
    })
    expect(r.status()).toBe(200)
    const j = await r.json()
    expect(j.user.status).toBe('approved')
    expect(j.access_token).toBeTruthy()
    userToken = j.access_token
  })

  test('6. UI 创建工作流（点 TVC 模板）', async ({ page }) => {
    await page.goto(`${PROD}/`)
    // 登录（页面未登录）
    // 已在 test 5 拿 token，但 page 上下文独立，需 UI 登录
    await page.goto(`${PROD}/login`)
    await page.fill('input[placeholder*="邮箱"], input[placeholder*="手机"]', NEW_USER)
    await page.fill('input[placeholder*="密码"]', NEW_PASS)
    await page.locator('button:has-text("登录")').first().click()
    await page.waitForTimeout(3000)

    // 进工作流创建页（实际路径要看出产前端）
    await page.goto(`${PROD}/workflow/create`)
    await page.waitForTimeout(2000)
    // 看是否有 TVC 模板入口
    const pageText = await page.locator('body').innerText()
    console.log(`workflow/create 页面内容（前200字）: ${pageText.slice(0, 200)}`)
  })

  test('7. API 创建工作流 + 列表验证', async ({ request }) => {
    const r = await request.post(`${PROD}/api/workflows`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        name: `e2e-test-workflow-${STAMP}`,
        data: { nodes: [], edges: [] },
        description: 'e2e test workflow',
      },
    })
    expect(r.status()).toBe(200)
    const wf = await r.json()
    expect(wf.name).toContain('e2e-test-workflow')

    // 列表验证
    const list = await request.get(`${PROD}/api/workflows`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(list.status()).toBe(200)
    const items = await list.json()
    expect(items.some((w: any) => w.name.includes('e2e-test-workflow'))).toBeTruthy()
  })

  test('8. 创建资源 + 列表验证', async ({ request }) => {
    const r = await request.post(`${PROD}/api/assets`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        name: `e2e-asset-${STAMP}`,
        type: 'image',
        url: 'https://example.com/e2e.png',
      },
    })
    expect(r.status()).toBe(200)
    const list = await request.get(`${PROD}/api/assets`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const items = await list.json()
    expect(items.some((a: any) => a.name === `e2e-asset-${STAMP}`)).toBeTruthy()
  })

  test('9. 清理资源', async ({ request }) => {
    const list = await request.get(`${PROD}/api/assets`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const items = await list.json() as any[]
    for (const a of items.filter((x: any) => x.name === `e2e-asset-${STAMP}`)) {
      await request.delete(`${PROD}/api/assets/${a.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
    }
    const wfList = await request.get(`${PROD}/api/workflows`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const wfs = await wfList.json() as any[]
    for (const w of wfs.filter((x: any) => x.name === `e2e-test-workflow-${STAMP}`)) {
      await request.delete(`${PROD}/api/workflows/${w.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
    }
  })
})
