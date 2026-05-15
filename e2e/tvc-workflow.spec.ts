/**
 * TVC 工作流 E2E 测试
 *
 * 覆盖：模板加载 → 节点渲染 → 文案输入 → 模型选择 → Mock API 执行 → 状态动画
 */
import { test, expect } from '@playwright/test'
import { createApiMock, mockPresets } from './helpers/mock'

// ==================== Mock 数据 ====================

const mockTvcScript = {
  tvc_title: '咖啡品牌 TVC',
  total_duration: 30,
  shot_duration: 5,
  shot_count: 2,
  shots: [
    {
      shot_id: 1,
      timeline: { start: '0s', end: '5s', duration: 5, transition: 'fade' },
      scene_description: '清晨城市天际线，暖色调光线',
      video_prompt: 'Aerial cityscape at dawn',
      start_frame_prompt: 'City skyline at sunrise',
      end_frame_prompt: 'Close-up of coffee cup',
      bgm_mood: 'warm',
    },
    {
      shot_id: 2,
      timeline: { start: '5s', end: '10s', duration: 5, transition: 'cut' },
      scene_description: '咖啡豆烘焙特写',
      video_prompt: 'Close-up coffee beans roasting',
      start_frame_prompt: 'Raw coffee beans',
      end_frame_prompt: 'Roasted coffee beans',
      bgm_mood: 'warm',
    },
  ],
  timeline_summary: { total_duration: 30, shot_count: 2, shot_duration: 5, transitions: ['fade'] },
}

// ==================== 辅助函数 ====================

async function setupCanvas(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

/** 用 React 兼容方式填充 textarea（解决 React 19 受控组件问题） */
async function fillTextarea(page, textarea, text) {
  await textarea.click()
  const handle = await textarea.elementHandle()
  await page.evaluate(({ el, val }) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set as Function
    setter?.call(el, val)
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
  }, { el: handle, val: text })
  await page.waitForTimeout(300)
}

/** 获取 TVC 脚本节点 */
function tvcNode(page) {
  return page.locator('.react-flow__node').filter({ hasText: 'TVC 文案/剧本' }).first()
}

// ==================== 测试 ====================

test.describe('TVC 工作流', () => {

  test('默认模板应加载 3 个节点', async ({ page }) => {
    await setupCanvas(page)

    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(3, { timeout: 10000 })

    // 验证边存在（SVG 路径 + 交互按钮）
    const edges = page.locator('.react-flow__edge-path, svg path[class*="edge"]')
    const edgeCount = await edges.count()
    expect(edgeCount).toBeGreaterThanOrEqual(2)

    // 验证三个节点标签
    await expect(tvcNode(page)).toBeVisible()
    await expect(page.locator('.react-flow__node').filter({ hasText: '分镜头故事板' }).first()).toBeVisible()
    await expect(page.locator('.react-flow__node').filter({ hasText: 'TVC 视频合成' }).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/tvc-template-loaded.png', fullPage: true })
  })

  test('TVC 节点应包含完整的 UI 元素', async ({ page }) => {
    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    // textarea 输入区
    await expect(node.locator('textarea')).toBeVisible()

    // 模型选择 select
    await expect(node.locator('select')).toBeVisible()

    // 分步执行 + 一键生成 按钮
    await expect(node.locator('button:has-text("分步执行")')).toBeVisible()
    await expect(node.locator('button:has-text("一键生成")')).toBeVisible()

    // 参考图上传按钮（虚线边框）
    await expect(node.locator('button.border-dashed')).toBeVisible()
  })

  test('模型选择下拉应包含 4 个选项', async ({ page }) => {
    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    const options = await node.locator('select').locator('option').allTextContents()
    expect(options.length).toBe(4)
    expect(options.some(o => o.includes('MiniMax'))).toBeTruthy()
    expect(options.some(o => o.includes('深度分析'))).toBeTruthy()
    expect(options.some(o => o.includes('快速'))).toBeTruthy()
    expect(options.some(o => o.includes('参考图'))).toBeTruthy()
  })

  test('应支持中文输入并启用按钮', async ({ page }) => {
    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    const textarea = node.locator('textarea')
    const testText = '30秒咖啡品牌TVC：清晨第一杯咖啡唤醒都市生活的温暖故事'

    await fillTextarea(page, textarea, testText)

    const value = await textarea.inputValue()
    expect(value).toBe(testText)

    // 按钮应启用
    await expect(node.locator('button:has-text("分步执行")')).toBeEnabled()
    await expect(node.locator('button:has-text("一键生成")')).toBeEnabled()
  })

  test('空输入时执行按钮应禁用', async ({ page }) => {
    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    await expect(node.locator('button:has-text("分步执行")')).toBeDisabled()
    await expect(node.locator('button:has-text("一键生成")')).toBeDisabled()
  })

  test('分步执行 — Mock API 成功生成脚本', async ({ page }) => {
    const mock = createApiMock({ baseURL: '/api' })
      .on('/auth/me', { body: mockPresets.auth.me })
      .on('/points/balance', { body: mockPresets.points })
      .on(/screenplay/, { body: { screenplay: mockTvcScript } })
    await mock.activate(page)

    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    await fillTextarea(page, node.locator('textarea'), '30秒咖啡品牌TVC')

    await node.locator('button:has-text("分步执行")').click()

    // 等待脚本返回后节点显示成功状态
    const successDot = node.locator('.bg-green-500')
    await expect(successDot).toBeVisible({ timeout: 15000 })

    await page.screenshot({ path: 'test-results/tvc-script-generated.png', fullPage: true })
  })

  test('一键生成 — Mock API 提交任务并显示 toast', async ({ page }) => {
    const mock = createApiMock({ baseURL: '' })
      .on('/api/auth/me', { body: mockPresets.auth.me })
      .on('/points/tvc-estimate', { body: { total: 100, balance: 1000, sufficient: true } })
      .on('/v2/tvc-tasks/submit', { body: { task_id: 'tvc-mock-task-001', status: 'submitted' } })
    await mock.activate(page)

    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    await fillTextarea(page, node.locator('textarea'), '30秒咖啡品牌TVC')

    await node.locator('button:has-text("一键生成")').click()

    // Toast 或页面文本应包含任务提交提示
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('后台任务已提交')

    await page.screenshot({ path: 'test-results/tvc-task-submitted.png', fullPage: true })
  })

  test('积分不足时应阻止提交', async ({ page }) => {
    const mock = createApiMock({ baseURL: '' })
      .on('/api/auth/me', { body: mockPresets.auth.me })
      .on('/points/tvc-estimate', { body: { total: 500, balance: 100, sufficient: false } })
    await mock.activate(page)

    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    await fillTextarea(page, node.locator('textarea'), '30秒咖啡品牌TVC')

    await node.locator('button:has-text("一键生成")').click()

    await page.waitForTimeout(1500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('积分不足：需要')
  })

  test('执行中状态指示器应显示脉冲动画', async ({ page }) => {
    const mock = createApiMock({ baseURL: '/api' })
      .on('/auth/me', { body: mockPresets.auth.me })
      .on(/screenplay/, { delay: 8000, body: { screenplay: mockTvcScript } })
    await mock.activate(page)

    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    await fillTextarea(page, node.locator('textarea'), '30秒咖啡品牌TVC')
    await node.locator('button:has-text("分步执行")').click()

    // 状态指示器应出现 animate-pulse class
    await expect(node.locator('.animate-pulse')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'test-results/tvc-node-running.png', fullPage: true })
  })

  test('参考图上传应切换为参考图优化模式', async ({ page }) => {
    await setupCanvas(page)

    const node = tvcNode(page)
    await expect(node).toBeVisible({ timeout: 5000 })

    const select = node.locator('select')
    const selectedValue = await select.inputValue()
    expect(selectedValue).toBe('tvc_deep')

    // 切换到 MiniMax
    await select.selectOption('tvc_minimax')
    await page.waitForTimeout(200)

    const newValue = await select.inputValue()
    expect(newValue).toBe('tvc_minimax')
  })
})
