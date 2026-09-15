/**
 * TVC 真实任务验证 — 槟榔产品 15s 广告切片
 *
 * 一次性用例：模拟真实用户行为跑通全链路（提交→SSE→入库）
 *
 * 运行：
 *   PROD_URL=https://app.nanoai.fun/nanoai npx playwright test e2e/tvc-betel-promo.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test'
import {
  loginZhy,
  apiCall,
  saveAssetToLibrary,
  watchSseProgress,
  newRunId,
  resetErrors,
  flushErrors,
  recordError,
} from './helpers/tvc'
import * as fs from 'fs'
import * as path from 'path'

const PROD = process.env.PROD_URL || 'https://app.nanoai.fun/nanoai'
const REPORTS_DIR = path.resolve('e2e/reports')
const RUN_ID = newRunId()

const PROMPT = '一个关于槟榔的产品展示宣传广告切片15秒'
const SHOT_COUNT = 3
const SHOT_DURATION = 5
const TOTAL_DURATION = 15

let zhyToken = ''
let zhyCtx: any
let taskId = ''

test.beforeAll(async () => {
  resetErrors()
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  console.log(`🥥 槟榔 TVC 实跑 | RUN_ID=${RUN_ID} | PROD=${PROD}`)
  zhyCtx = await (await import('@playwright/test')).request.newContext({ baseURL: PROD })
  zhyToken = await loginZhy(zhyCtx)
  console.log(`✅ zhy 登录成功`)
})

test.afterAll(async () => {
  await flushErrors(RUN_ID)
  await zhyCtx.dispose()
})

test('槟榔产品 15s TVC 全链路（提交→SSE→入库）', async () => {
  // Step 1. 余额预检
  const balanceCheck = await apiCall(zhyCtx, zhyToken, 'balance-check', 'GET',
    '/api/points/balance')
  console.log(`💰 zhy 余额: ${JSON.stringify(balanceCheck.body).slice(0, 200)}`)

  // Step 2. 积分预估
  const estimate = await apiCall(zhyCtx, zhyToken, 'estimate', 'POST',
    '/api/points/tvc-estimate', {
      shot_count: SHOT_COUNT,
      include_bgm: true,
    })
  console.log(`💵 预估积分: ${JSON.stringify(estimate.body)}`)
  expect([200, 422]).toContain(estimate.status)
  if (estimate.status === 200) {
    console.log(`📊 余额=${estimate.body.balance} 需=${estimate.body.total} 够=${estimate.body.sufficient}`)
  }

  // Step 3. 提交任务（前端用 wf-tvc-{nodeId} 占位 workflow_id）
  // 按用户要求：image_model=gpt-image-2 生图，video_model=MiniMax-H3 生视频
  // step-optimize 用 GLM-5.3-Flash（Coding Plan 额度 3 倍 + 原生多模态，规避 glm-4.5-air 1113 配额限制）
  const submit = await apiCall(zhyCtx, zhyToken, 'submit', 'POST',
    '/api/v2/tvc-tasks/submit', {
      workflow_id: `wf-tvc-betel-${RUN_ID}`,
      prompt: PROMPT,
      shot_count: SHOT_COUNT,
      shot_duration: SHOT_DURATION,
      total_duration: TOTAL_DURATION,
      execution_mode: 'auto',
      optimize_mode: 'tvc_deep',
      image_model: 'gpt-image-2',
      video_model: 'minimax-H3',
      optimize_model: 'glm-5.3-flash',
      force_personal_points: true,
      style: 'cinematic',
    })
  console.log(`📋 提交结果: ${submit.status}`)
  console.log(`📦 响应: ${JSON.stringify(submit.body).slice(0, 500)}`)

  // 兼容字段名
  taskId = submit.body?.task_id
    ?? submit.body?.id
    ?? submit.body?.taskId
    ?? submit.body?.data?.task_id
  expect(submit.status).toBe(200)
  expect(taskId, '必须返回 task_id').toBeTruthy()
  console.log(`✅ 任务已提交: ${taskId}`)

  // Step 4. 入库（任务本身 — type=text 是合法值，避开 tvc_project）
  await saveAssetToLibrary(zhyCtx, zhyToken, {
    name: `betel-promo-task-${taskId}`,
    type: 'text',
    url: `${PROD}/nanoai/tvc-task/${taskId}`,
    meta: {
      task_id: taskId,
      prompt: PROMPT,
      shot_count: SHOT_COUNT,
      total_duration: TOTAL_DURATION,
      submit_status: submit.body?.status,
      submit_response: submit.body,
    },
  })

  // Step 5. SSE 监听（最长 8 分钟）
  console.log(`📡 监听 SSE 进度流…`)
  let progressUpdates: any[] = []
  let finalState: any = null
  try {
    const { lastState, durationMs } = await watchSseProgress(
      taskId, zhyToken, s => {
        const u = {
          ts: new Date().toISOString(),
          status: s.status,
          step: s.current_step,
          progress: s.progress,
          message: s.message,
        }
        progressUpdates.push(u)
        if (progressUpdates.length % 5 === 0) {
          console.log(`📡 [${progressUpdates.length}] ${s.status} step=${s.current_step ?? '-'} ${s.progress ?? 0}%`)
        }
      }, 480_000) // 8 分钟
    finalState = lastState
    console.log(`✅ SSE 完成: ${lastState.status} 用时 ${(durationMs / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.log(`⚠️ SSE 异常: ${e.message}`)
    recordError({
      testName: 'betel-promo', timestamp: new Date().toISOString(),
      endpoint: `/api/v2/tvc-tasks/${taskId}/progress`,
      status: 0, message: e.message,
    })
  }

  // Step 6. 最终状态查询
  const final = await apiCall(zhyCtx, zhyToken, 'final-status', 'GET',
    `/api/v2/tvc-tasks/${taskId}`)
  console.log(`📊 最终状态: ${final.body?.status}`)
  console.log(`📦 最终响应: ${JSON.stringify(final.body).slice(0, 800)}`)
  expect([200]).toContain(final.status)

  // Step 7. 把 progress 时间线 + 最终结果入库
  const assetId = await saveAssetToLibrary(zhyCtx, zhyToken, {
    name: `betel-promo-result-${taskId}`,
    type: 'text',
    url: `${PROD}/nanoai/tvc-task/${taskId}`,
    meta: {
      task_id: taskId,
      final_status: final.body?.status,
      final_state: finalState,
      progress_updates_count: progressUpdates.length,
      progress_first_5: progressUpdates.slice(0, 5),
      progress_last_5: progressUpdates.slice(-5),
      task_full_response: final.body,
      run_id: RUN_ID,
    },
  })

  // Step 8. 落本地报告（即使 push 挂了也有存档）
  const reportFile = path.join(REPORTS_DIR, `betel-promo-${RUN_ID}.json`)
  fs.writeFileSync(reportFile, JSON.stringify({
    run_id: RUN_ID,
    task_id: taskId,
    prompt: PROMPT,
    shot_count: SHOT_COUNT,
    total_duration: TOTAL_DURATION,
    submit_response: submit.body,
    final_state: finalState,
    final_response: final.body,
    progress_updates: progressUpdates,
    asset_id: assetId,
    timestamp: new Date().toISOString(),
  }, null, 2), 'utf8')
  console.log(`📝 完整报告: ${reportFile}`)

  // Step 9. 若任务成功，把生成的视频/图片入库
  if (final.body?.status === 'completed' || finalState?.status === 'completed') {
    const outputs = final.body?.outputs ?? final.body?.shots ?? finalState?.shots ?? []
    console.log(`🎬 产物数: ${Array.isArray(outputs) ? outputs.length : 0}`)
    if (Array.isArray(outputs)) {
      for (let i = 0; i < outputs.length; i++) {
        const o = outputs[i]
        const url = o.video_url ?? o.image_url ?? o.url
        if (url) {
          await saveAssetToLibrary(zhyCtx, zhyToken, {
            name: `betel-promo-shot-${i + 1}-${taskId}`,
            type: o.video_url ? 'video' : 'image',
            url,
            meta: { task_id: taskId, shot_index: i + 1, shot: o },
          })
        }
      }
    }
  } else {
    console.log(`⚠️ 任务未完成: ${final.body?.status ?? finalState?.status}`)
  }
})
