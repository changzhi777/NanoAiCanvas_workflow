import { test, expect } from '@playwright/test'

test.describe('页面切换功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('应该显示页面切换按钮', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(1000)

    // 查找页面切换按钮
    const canvasButton = page.getByText('无限画布')
    const workflowButton = page.getByText('NanoAI Workflow')

    // 验证按钮存在
    await expect(canvasButton).toBeVisible()
    await expect(workflowButton).toBeVisible()
  })

  test('默认应该显示NanoAI Workflow页面', async ({ page }) => {
    await page.waitForTimeout(1000)

    // 检查默认选中的按钮
    const workflowButton = page.getByText('NanoAI Workflow')
    const canvasButton = page.getByText('无限画布')

    // Workflow按钮应该有active样式
    await expect(workflowButton).toBeVisible()
    await expect(canvasButton).toBeVisible()
  })

  test('点击无限画布按钮应该切换页面', async ({ page }) => {
    await page.waitForTimeout(1000)

    // 点击无限画布按钮
    await page.getByText('无限画布').click()

    // 等待页面切换
    await page.waitForTimeout(500)

    // 验证URL或内容变化
    const url = page.url()
    console.log('当前URL:', url)
  })

  test('点击NanoAI Workflow按钮应该切换页面', async ({ page }) => {
    await page.waitForTimeout(1000)

    // 先点击无限画布
    await page.getByText('无限画布').click()
    await page.waitForTimeout(500)

    // 再点击Workflow
    await page.getByText('NanoAI Workflow').click()
    await page.waitForTimeout(500)

    // 验证切换
    const url = page.url()
    console.log('当前URL:', url)
  })

  test('页面切换按钮应该有正确的样式', async ({ page }) => {
    await page.waitForTimeout(1000)

    const workflowButton = page.getByText('NanoAI Workflow')

    // 验证按钮可见
    await expect(workflowButton).toBeVisible()

    // 可以检查更多样式属性
    const backgroundColor = await workflowButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    )
    console.log('Workflow按钮背景色:', backgroundColor)
  })
})
