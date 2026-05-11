import { test, expect } from '@playwright/test'

const MOCK_USER = {
  id: 'e2e-chat-user-001',
  username: 'ChatTester',
  email: 'tester@caohua.com',
  role: 'user',
  is_verified: true,
}
const MOCK_TOKEN = 'e2e-test-token'

const CHAT_API = {
  conversations: '**/api/chat/conversations',
  users: '**/api/chat/users',
  onlineUsers: '**/api/chat/online-users',
  convMessages: (id: string) => `**/api/chat/conversations/${id}/messages**`,
  convRead: (id: string) => `**/api/chat/conversations/${id}/read`,
}

async function mockLogin(page: import('@playwright/test').Page) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('nanoai_token', token)
    localStorage.setItem('nanoai_user', user)
  }, { token: MOCK_TOKEN, user: JSON.stringify(MOCK_USER) })
}

async function setupPage(page: import('@playwright/test').Page) {
  await page.goto('/')
  await mockLogin(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function openChatDialog(page: import('@playwright.test').Page) {
  const chatBtn = page.locator('button[title="消息"]')
  await expect(chatBtn).toBeVisible({ timeout: 10000 })
  await chatBtn.click()
  await page.waitForTimeout(800)
}

function mockEmptyUsers(page: import('@playwright/test').Page) {
  return page.route(CHAT_API.users, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [] }),
    })
  })
}

function mockEmptyConversations(page: import('@playwright/test').Page) {
  return page.route(CHAT_API.conversations, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

// ============ 基础测试 ============

test.describe('对话功能 - ChatDialog 基础', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('工具栏消息按钮可见（登录后）', async ({ page }) => {
    await expect(page.locator('button[title="消息"]')).toBeVisible({ timeout: 10000 })
  })

  test('未登录时消息按钮不显示', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('nanoai_token')
      localStorage.removeItem('nanoai_user')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[title="消息"]')).toBeHidden({ timeout: 5000 })
  })

  test('点击消息按钮打开对话框', async ({ page }) => {
    await openChatDialog(page)
    await expect(page.locator('button:has-text("交流")')).toBeVisible({ timeout: 5000 })
  })

  test('对话框包含交流和通知两个 tab', async ({ page }) => {
    await openChatDialog(page)
    await expect(page.locator('button:has-text("交流")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("通知")')).toBeVisible({ timeout: 5000 })
  })

  test('默认选中交流 tab', async ({ page }) => {
    await openChatDialog(page)
    const chatTab = page.locator('button:has-text("交流")')
    const classes = await chatTab.getAttribute('class')
    expect(classes).toMatch(/bg-(blue-500|primary)/)
  })

  test('点击通知 tab 切换', async ({ page }) => {
    await openChatDialog(page)
    const notifTab = page.locator('button:has-text("通知")')
    await notifTab.click()
    await expect(page.locator('text=系统通知').first()).toBeVisible({ timeout: 5000 })
  })

  test('按 Escape 关闭对话框', async ({ page }) => {
    await openChatDialog(page)
    await expect(page.locator('button:has-text("交流")')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.locator('text=发起新对话')).toBeHidden({ timeout: 3000 })
  })
})

// ============ 用户列表与刷新 ============

test.describe('对话功能 - 用户列表与刷新', () => {
  test.beforeEach(async ({ page }) => {
    await mockEmptyConversations(page)
    await mockEmptyUsers(page)
    await setupPage(page)
    await openChatDialog(page)
  })

  test.afterEach(async ({ page }) => {
    await page.unroute(CHAT_API.users).catch(() => {})
    await page.unroute(CHAT_API.conversations).catch(() => {})
  })

  test('发起新对话按钮可见', async ({ page }) => {
    await expect(page.locator('text=发起新对话')).toBeVisible({ timeout: 5000 })
  })

  test('点击展开用户搜索区域', async ({ page }) => {
    await page.locator('text=发起新对话').click()
    await expect(page.locator('input[placeholder="搜索用户..."]')).toBeVisible({ timeout: 3000 })
  })

  test('刷新按钮可见且可点击', async ({ page }) => {
    await page.locator('text=发起新对话').click()
    await expect(page.locator('input[placeholder="搜索用户..."]')).toBeVisible({ timeout: 3000 })
    const refreshBtn = page.locator('button[title="刷新用户列表"]')
    await expect(refreshBtn).toBeVisible({ timeout: 3000 })
    await refreshBtn.click()
    await page.waitForTimeout(1000)
  })

  test('刷新按钮点击后有旋转动画', async ({ page }) => {
    await page.locator('text=发起新对话').click()
    await expect(page.locator('input[placeholder="搜索用户..."]')).toBeVisible({ timeout: 3000 })

    // 覆盖为延迟响应保持 loading 状态
    await page.unroute(CHAT_API.users).catch(() => {})
    await page.route(CHAT_API.users, async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: [] }),
      })
    })
    const refreshBtn = page.locator('button[title="刷新用户列表"]')
    await refreshBtn.click()
    await page.waitForTimeout(300)
    const svgInBtn = refreshBtn.locator('svg')
    const classAttr = await svgInBtn.getAttribute('class')
    expect(classAttr).toContain('animate-spin')
    await page.unroute(CHAT_API.users).catch(() => {})
  })

  test('搜索框输入过滤用户', async ({ page }) => {
    // 先关闭 Dialog
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    // 重新注册带用户的 mock
    await page.unroute(CHAT_API.users).catch(() => {})
    await page.route(CHAT_API.users, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            { id: 'u1', username: 'Alice', avatar_url: null, online: true },
            { id: 'u2', username: 'Bob', avatar_url: null, online: false },
            { id: 'u3', username: 'Charlie', avatar_url: null, online: true },
          ],
        }),
      })
    })
    // 重新打开 Dialog，触发 getChatUsers
    await openChatDialog(page)
    await page.locator('text=发起新对话').click()
    await page.waitForTimeout(800)
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Bob')).toBeVisible({ timeout: 5000 })
    // 搜索过滤
    await page.locator('input[placeholder="搜索用户..."]').fill('ali')
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Bob')).toBeHidden({ timeout: 3000 })
    await page.unroute(CHAT_API.users).catch(() => {})
  })
})

// ============ 会话列表 ============

test.describe('对话功能 - 会话列表', () => {
  const MOCK_CONVS = [
    {
      id: 'conv-1',
      type: 'private',
      name: null,
      other_user: { id: 'u2', username: 'Bob', avatar_url: null, online: true },
      last_message: { id: 'm1', sender_id: 'u2', content: '你好！', message_type: 'text', created_at: '2026-05-11T10:00:00Z' },
      unread_count: 2,
      created_at: '2026-05-10T10:00:00Z',
      updated_at: '2026-05-11T10:00:00Z',
    },
    {
      id: 'conv-2',
      type: 'private',
      name: null,
      other_user: { id: 'u3', username: 'Charlie', avatar_url: null, online: false },
      last_message: { id: 'm2', sender_id: 'u3', content: '图片分享', message_type: 'image', created_at: '2026-05-10T08:00:00Z' },
      unread_count: 0,
      created_at: '2026-05-09T10:00:00Z',
      updated_at: '2026-05-10T08:00:00Z',
    },
  ]

  test.beforeEach(async ({ page }) => {
    await mockEmptyUsers(page)
    await page.route(CHAT_API.conversations, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONVS),
      })
    })
    await setupPage(page)
    await openChatDialog(page)
  })

  test.afterEach(async ({ page }) => {
    await page.unroute(CHAT_API.users).catch(() => {})
    await page.unroute(CHAT_API.conversations).catch(() => {})
  })

  test('会话列表显示用户名', async ({ page }) => {
    await expect(page.locator('text=Bob').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text=Charlie').first()).toBeVisible({ timeout: 5000 })
  })

  test('未读消息红点显示', async ({ page }) => {
    await expect(page.locator('text=Bob').first()).toBeVisible({ timeout: 8000 })
    const badge = page.locator('span.bg-red-500').first()
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('最后一条消息预览', async ({ page }) => {
    await expect(page.locator('text=Bob').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text=你好！').first()).toBeVisible({ timeout: 5000 })
  })

  test('在线状态绿点', async ({ page }) => {
    await expect(page.locator('text=Bob').first()).toBeVisible({ timeout: 8000 })
    const greenDot = page.locator('span.bg-green-500').first()
    await expect(greenDot).toBeVisible({ timeout: 5000 })
  })

  test('点击会话进入交流窗口', async ({ page }) => {
    await page.route(CHAT_API.convMessages('conv-1'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'm1',
            conversation_id: 'conv-1',
            sender_id: 'u2',
            sender_name: 'Bob',
            sender_avatar: null,
            content: '你好！',
            message_type: 'text',
            attachments: [],
            is_read: true,
            created_at: '2026-05-11T10:00:00Z',
          },
        ]),
      })
    })
    await page.route(CHAT_API.convRead('conv-1'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })

    // 用 evaluate 点击避免 toolbar overlay 阻挡
    await page.locator('text=Bob').first().evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(1000)
    await expect(page.locator('text=在线').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=你好！').first()).toBeVisible({ timeout: 5000 })

    await page.unroute(CHAT_API.convMessages('conv-1')).catch(() => {})
    await page.unroute(CHAT_API.convRead('conv-1')).catch(() => {})
  })

  test('空会话状态提示', async ({ page }) => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.unroute(CHAT_API.conversations).catch(() => {})
    await mockEmptyConversations(page)
    await openChatDialog(page)
    await expect(page.locator('text=暂无会话')).toBeVisible({ timeout: 8000 })
    await page.unroute(CHAT_API.conversations).catch(() => {})
  })
})

// ============ 消息发送 ============

test.describe('对话功能 - 消息发送', () => {
  test.beforeEach(async ({ page }) => {
    await mockEmptyUsers(page)
    await page.route(CHAT_API.conversations, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'conv-1',
            type: 'private',
            name: null,
            other_user: { id: 'u2', username: 'Bob', avatar_url: null, online: true },
            last_message: null,
            unread_count: 0,
            created_at: '2026-05-11T10:00:00Z',
            updated_at: '2026-05-11T10:00:00Z',
          },
        ]),
      })
    })
    await page.route(CHAT_API.convMessages('conv-1'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route(CHAT_API.convRead('conv-1'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })
    await setupPage(page)
    await openChatDialog(page)
  })

  test.afterEach(async ({ page }) => {
    await page.unroute(CHAT_API.users).catch(() => {})
    await page.unroute(CHAT_API.conversations).catch(() => {})
    await page.unroute(CHAT_API.convMessages('conv-1')).catch(() => {})
    await page.unroute(CHAT_API.convRead('conv-1')).catch(() => {})
  })

  test('未选中会话时显示占位提示', async ({ page }) => {
    await expect(page.locator('text=选择一个会话开始交流')).toBeVisible({ timeout: 5000 })
  })

  test('选中会话后输入框可见', async ({ page }) => {
    await page.locator('text=Bob').first().evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(1000)
    const input = page.locator('input[placeholder="输入消息..."]').or(page.locator('input[placeholder*="消息"]'))
    await expect(input).toBeVisible({ timeout: 5000 })
  })

  test('输入框为空时发送按钮禁用', async ({ page }) => {
    await page.locator('text=Bob').first().evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(1000)
    const sendBtn = page.locator('button:has(svg.lucide-send)')
    await expect(sendBtn.first()).toBeDisabled({ timeout: 5000 })
  })
})
