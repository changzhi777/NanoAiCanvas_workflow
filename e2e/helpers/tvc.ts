/**
 * TVC E2E 测试共享 helper
 *
 * 提供：
 * - zhy 登录 + token 持久化
 * - 错误码 + 截图捕获
 * - 产物入资产库
 * - SSE progress 监听
 */
import { APIRequestContext, Page, request } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PROD = process.env.PROD_URL || 'http://localhost:3000'
const ZHY = { username: 'zhy', password: 'zhy@2026' }
const REPORTS_DIR = path.resolve('e2e/reports')

export interface CapturedError {
  testName: string
  timestamp: string
  endpoint?: string
  method?: string
  status?: number
  code?: string
  message?: string
  screenshot?: string
  consoleLog?: string
}

let errorBuffer: CapturedError[] = []

/** 清空错误缓冲（新 run 开始时） */
export function resetErrors() {
  errorBuffer = []
}

/** 把当前缓冲写到 e2e/reports/errors-{runId}.json */
export async function flushErrors(runId: string) {
  if (errorBuffer.length === 0) return
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  const file = path.join(REPORTS_DIR, `errors-${runId}.json`)
  fs.writeFileSync(file, JSON.stringify(errorBuffer, null, 2), 'utf8')
  console.log(`📝 错误记录已写入: ${file} (${errorBuffer.length} 条)`)
}

/** 记录一条错误 */
export function recordError(err: CapturedError) {
  errorBuffer.push(err)
  console.log(`[ERROR] ${err.testName} | ${err.status ?? '?'} ${err.endpoint ?? '?'} | ${err.message ?? ''}`)
}

/** zhy 登录返回 token */
export async function loginZhy(req: APIRequestContext): Promise<string> {
  const r = await req.post(`${PROD}/api/auth/login`, { data: ZHY })
  if (r.status() !== 200) {
    throw new Error(`zhy 登录失败: ${r.status()} ${await r.text()}`)
  }
  const j = await r.json()
  return j.access_token
}

/** 用 zhy token 登录到浏览器 localStorage（前端用） */
export async function loginZhyInBrowser(page: Page, token: string) {
  await page.goto(`${PROD}/nanoai/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(t => localStorage.setItem('nanoai_token', t), token)
}

/** 创建带 zhy auth 的 APIRequestContext */
export async function newAuthedContext(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: PROD })
  const token = await loginZhy(ctx)
  return ctx
}

/** 生成唯一 run id */
export function newRunId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** 把测试产物（任意 URL）保存到资产库，返回 asset.id */
export async function saveAssetToLibrary(
  req: APIRequestContext,
  token: string,
  data: {
    name: string
    type: 'image' | 'video' | 'audio' | 'text' | 'workflow' | 'tvc_project'
    url?: string
    meta?: Record<string, unknown>
  },
): Promise<string | null> {
  try {
    const r = await req.post(`${PROD}/api/assets`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: data.name,
        type: data.type,
        url: data.url ?? '',
        metadata: data.meta ?? {},
      },
    })
    if (r.status() === 200 || r.status() === 201) {
      const j = await r.json()
      console.log(`📦 资产入库: ${data.name} → ${j.id}`)
      return j.id
    } else {
      recordError({
        testName: 'saveAssetToLibrary',
        timestamp: new Date().toISOString(),
        endpoint: '/api/assets',
        method: 'POST',
        status: r.status(),
        message: `资产入库失败: ${await r.text()}`,
      })
      return null
    }
  } catch (e: any) {
    recordError({
      testName: 'saveAssetToLibrary',
      timestamp: new Date().toISOString(),
      endpoint: '/api/assets',
      status: 0,
      message: e.message,
    })
    return null
  }
}

/** 包装 API 调用，统一记录错误码 */
export async function apiCall(
  req: APIRequestContext,
  token: string,
  testName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<{ status: number; body: any }> {
  try {
    const r = await req.fetch(`${PROD}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: data ? JSON.stringify(data) : undefined,
    })
    const body = await r.text()
    let parsed: any = body
    try { parsed = JSON.parse(body) } catch {}
    if (r.status() >= 400) {
      recordError({
        testName,
        timestamp: new Date().toISOString(),
        endpoint: path,
        method,
        status: r.status(),
        code: parsed?.code ?? parsed?.error_code,
        message: parsed?.message ?? parsed?.detail ?? body.slice(0, 200),
      })
    }
    return { status: r.status(), body: parsed }
  } catch (e: any) {
    recordError({
      testName,
      timestamp: new Date().toISOString(),
      endpoint: path,
      method,
      status: 0,
      message: e.message,
    })
    return { status: 0, body: null }
  }
}

/** 监听 SSE progress 流，返回 unsubscribe */
export function watchSseProgress(
  taskId: string,
  token: string,
  onUpdate: (state: any) => void,
  timeoutMs = 120_000,
): Promise<{ lastState: any; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const url = `${PROD}/api/v2/tvc-tasks/${taskId}/progress?token=${token}`
    const es = new EventSource(url)
    let lastState: any = null
    const timer = setTimeout(() => {
      es.close()
      reject(new Error(`SSE 超时 ${timeoutMs}ms`))
    }, timeoutMs)
    es.onmessage = ev => {
      try {
        const s = JSON.parse(ev.data)
        lastState = s
        onUpdate(s)
        if (['completed', 'failed', 'cancelled'].includes(s.status)) {
          clearTimeout(timer)
          es.close()
          resolve({ lastState: s, durationMs: Date.now() - start })
        }
      } catch {}
    }
    es.onerror = () => {
      clearTimeout(timer)
      es.close()
      // SSE 断了如果已有 lastState，认为软成功
      if (lastState) resolve({ lastState, durationMs: Date.now() - start })
      else reject(new Error('SSE 连接失败'))
    }
  })
}
