/**
 * TVC Step 4 (生图) + Step 5 (视频) E2E
 * 直接调 API 端点，跳过 UI 慢路径。
 *
 * 运行：TVC_PROD_URL=https://91zm.com.cn/nanoai pnpm test:e2e e2e/tvc-step4-5.spec.ts
 */
import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.TVC_PROD_URL || 'https://91zm.com.cn/nanoai'
const USER = '14455975'
const PASS = 'cz777777+'

async function freshToken(request: APIRequestContext): Promise<string> {
  const r = await request.post(`${BASE}/api/auth/login`, {
    data: { username: USER, password: PASS },
  })
  if (r.status() !== 200) {
    throw new Error(`login failed status=${r.status()} body=${await r.text()}`)
  }
  return (await r.json()).access_token as string
}

test.describe('TVC Step 4-5 真实链路', () => {
  test.setTimeout(180000)

  test('Step 4: gpt-image-2 生图提交 + 轮询出 image_url', async ({ request }) => {
    const submit = await request.post(`${BASE}/v2/image/gpt-image-2/generate`, {
      headers: { 'X-API-Key': 'nanoai-prod-14455975' },
      data: {
        prompt: 'a calm fjord landscape for 30s TVC opening',
        size: '1K',
        aspect_ratio: '16:9',
        reference_image: 'https://scapi.net/f1d18b22c7c642a39423dddbbaad5273.png',
      },
    })
    expect(submit.status(), `submit ${submit.status()}`).toBe(200)
    const task = await submit.json()
    expect(task.task_id, 'task_id 存在').toBeTruthy()
    const taskId = task.task_id as string
    console.log(`  submitted task_id=${taskId}`)

    let imageUrl: string | null = null
    const deadline = Date.now() + 90_000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000))
      const r = await request.get(`${BASE}/v2/image/gpt-image-2/task/${taskId}`, {
        headers: { 'X-API-Key': 'nanoai-prod-14455975' },
      })
      if (r.status() !== 200) continue
      const j = await r.json()
      console.log(`  status=${j.status} progress=${j.progress ?? '?'}`)
      if (j.status === 'success') {
        const urls = j.images?.map((i: { url: string }) => i.url).filter(Boolean) ?? []
        imageUrl = urls[0] ?? null
        break
      }
      if (j.status === 'failed') {
        throw new Error(`image gen failed: ${j.error ?? 'unknown'}`)
      }
    }
    expect(imageUrl, 'image_url 应在 90s 内就绪').toMatch(/^https?:\/\//)
    console.log(`  image_url=${imageUrl}`)
  })

  test('TVC 任务提交可达（不跑完整编排）', async ({ request }) => {
    const token = await freshToken(request)
    const r = await request.post(`${BASE}/api/v2/tvc-tasks/submit`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        workflow_id: 'tvc-video-01',
        prompt: 'e2e step 5 提交可达性测试',
        shot_count: 1,
        shot_duration: 5,
        total_duration: 5,
        optimize_mode: 'tvc_deep',
        execution_mode: 'auto',
      },
    })
    expect(r.status(), `submit ${r.status()}`).toBe(200)
    const j = await r.json()
    expect(j.task_id).toBeTruthy()
    console.log(`  task_id=${j.task_id}`)
  })

  test('M3 缓存统计可达（验证面板端点）', async ({ request }) => {
    const token = await freshToken(request)
    const r = await request.get(`${BASE}/api/v2/tvc-config/cache-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(r.status(), `stats ${r.status()}`).toBe(200)
    const s = await r.json()
    expect(s).toHaveProperty('total_entries')
    expect(s).toHaveProperty('hit_rate')
    expect(s).toHaveProperty('redis_keys')
    expect(s.config).toHaveProperty('vision_endpoint')
    console.log(`  stats=${JSON.stringify(s).slice(0, 200)}`)
  })
})
