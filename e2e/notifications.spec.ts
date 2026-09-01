import { test, expect } from '@playwright/test'

async function mockLogin(page: import('@playwright/test').Page) {
  const mockToken = 'e2e-test-token'
  const mockUser = JSON.stringify({
    id: 'e2e-user-001',
    username: 'E2E Tester',
    email: 'e2e@test.com',
    role: 'user',
    is_verified: true,
  })
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('nanoai_token', token)
    localStorage.setItem('nanoai_user', user)
  }, { token: mockToken, user: mockUser })
}

async function openPopover(page: import('@playwright/test').Page) {
  const bell = page.locator('button[aria-label="通知"]')
  await expect(bell).toBeVisible({ timeout: 10000 })
  await bell.click()
  await page.waitForTimeout(500)
}

async function navigateToNotificationsPage(page: import('@playwright/test').Page) {
  await openPopover(page)
  // router.push → window.location.href = '/nanoai/notifications'
  await Promise.all([
    page.waitForURL('**/nanoai/notifications', { timeout: 15000 }),
    page.locator('text=查看全部通知').evaluate(el => (el as HTMLElement).click()),
  ])
  await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

test.describe('消息通知模块 - Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await mockLogin(page)
    await page.reload()
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
  })

  test('小铃铛按钮可见', async ({ page }) => {
    const bell = page.locator('button[aria-label="通知"]')
    await expect(bell).toBeVisible({ timeout: 10000 })
  })

  test('点击铃铛展开 Popover', async ({ page }) => {
    await openPopover(page)
    const content = page.locator('text=通知').or(page.locator('text=暂无通知'))
    await expect(content.first()).toBeVisible({ timeout: 5000 })
  })

  test('Popover 底部有"查看全部通知"', async ({ page }) => {
    await openPopover(page)
    await expect(page.locator('text=查看全部通知')).toBeVisible({ timeout: 5000 })
  })

  test('点击 Popover 外部区域关闭', async ({ page }) => {
    await openPopover(page)
    await expect(page.locator('text=查看全部通知')).toBeVisible({ timeout: 5000 })
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.waitForTimeout(500)
    await expect(page.locator('text=查看全部通知')).toBeHidden({ timeout: 3000 })
  })

  test('WebSocket 状态指示器（绿/灰点）', async ({ page }) => {
    const bell = page.locator('button[aria-label="通知"]')
    const dot = bell.locator('span').first()
    await expect(dot).toBeVisible({ timeout: 5000 })
    const bgClass = await dot.getAttribute('class')
    expect(bgClass).toMatch(/bg-(green|gray)-/)
  })

  test('未登录时铃铛不显示', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('nanoai_token')
      localStorage.removeItem('nanoai_user')
    })
    await page.reload()
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    const bell = page.locator('button[aria-label="通知"]')
    await expect(bell).toBeHidden({ timeout: 5000 })
  })
})

test.describe('消息通知模块 - 通知页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await mockLogin(page)
    await page.reload()
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await navigateToNotificationsPage(page)
  })

  test('页面标题"消息通知"显示', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('消息通知', { timeout: 10000 })
  })

  test('筛选 tab 全部显示', async ({ page }) => {
    await expect(page.locator('button:has-text("全部")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("系统")').first()).toBeVisible()
    await expect(page.locator('button:has-text("积分")').first()).toBeVisible()
    await expect(page.locator('button:has-text("团队")').first()).toBeVisible()
  })

  test('筛选 tab 切换高亮', async ({ page }) => {
    const pointsTab = page.locator('button:has-text("积分")').first()
    await pointsTab.click()
    const classes = await pointsTab.getAttribute('class')
    expect(classes).toContain('bg-primary')
  })

  test('清空已读按钮可见', async ({ page }) => {
    await expect(page.locator('button:has-text("清空已读")')).toBeVisible({ timeout: 10000 })
  })

  test('连接状态显示', async ({ page }) => {
    const status = page.locator('text=已连接').or(page.locator('text=未连接'))
    await expect(status.first()).toBeVisible({ timeout: 15000 })
  })

  test('未登录用户不显示铃铛', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('nanoai_token')
      localStorage.removeItem('nanoai_user')
    })
    await page.goto('http://localhost:3000')
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('button[aria-label="通知"]')).toBeHidden({ timeout: 5000 })
  })
})
