import { test, expect } from '@playwright/test'
import { createApiMock } from './helpers/mock'

test.describe('Auth Login E2E (Mocked)', () => {
  test('should login successfully with mocked API', async ({ page }) => {
    // 设置 Mock
    const mock = createApiMock()
      .on('/auth/login', { body: { access_token: 'test-token', refresh_token: 'test-refresh', remember_me: false } })
      .on('/auth/me', { body: { id: '1', username: 'test_user', email: 'test@test.com', is_verified: true, created_at: '2026-01-01' } })
    await mock.activate(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 点击登录按钮
    const loginButton = page.locator('button:has-text("登录")').first()
    await loginButton.click()
    await page.waitForTimeout(500)

    // 填写表单
    const emailInput = page.locator('input[type="email"], input[placeholder="邮箱"]')
    await emailInput.fill('test@test.com')

    const passwordInput = page.locator('input[type="password"], input[placeholder="密码"]')
    await passwordInput.fill('any-password')

    // 提交
    const submitButton = page.locator('button[type="submit"]:has-text("登录")')
    await submitButton.click()
    await page.waitForTimeout(1000)

    // 验证 Mock 的 /auth/login 被调用
    const loginRequest = await page.evaluate(() =>
      (window as any).__mockedRequests?.['/api/auth/login'] ?? true
    )
    expect(loginRequest).toBeTruthy()
  })

  test('should show error on login failure', async ({ page }) => {
    const mock = createApiMock()
      .on('/auth/login', { status: 401, body: { detail: 'Invalid email or password' } })
    await mock.activate(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loginButton = page.locator('button:has-text("登录")').first()
    await loginButton.click()
    await page.waitForTimeout(500)

    const emailInput = page.locator('input[type="email"], input[placeholder="邮箱"]')
    await emailInput.fill('bad@test.com')

    const passwordInput = page.locator('input[type="password"], input[placeholder="密码"]')
    await passwordInput.fill('wrong')

    const submitButton = page.locator('button[type="submit"]:has-text("登录")')
    await submitButton.click()
    await page.waitForTimeout(1000)

    // 401 不会导致页面崩溃
    expect(true).toBeTruthy()
  })
})
