/**
 * 节点结果自动保存到资产库
 * 在 updateNode 检测到 SUCCESS 状态时 fire-and-forget 调用
 */

import { assets } from './client'

const MAX_CONCURRENT_SAVES = 5

const NODE_ASSET_TYPE_MAP: Record<string, string> = {
  nano_banana_2: 'image',
  nano_banana_pro: 'image',
  gpt_image_2: 'image',
  jimeng_image: 'image',
  minimax_image: 'image',
  storyboard_generator: 'storyboard_image',
  storyboard_shot_a: 'storyboard_image',
  storyboard_v2: 'storyboard_image',
  shot_ref_image: 'storyboard_image',
  character_design_image: 'storyboard_image',
  character_designer: 'storyboard_image',
  scene_design_image: 'storyboard_image',
  scene_designer: 'storyboard_image',
  skills_task: 'image',
  video_generator: 'video',
  storyboard_video: 'storyboard_video',
  minimax_video: 'video',
  jimeng_video: 'video',
  glm_video: 'video',
  tvc_script: 'tvc',
  background_music: 'audio',
}

const EXCLUDED_NODES = new Set(['image_preview'])

function extractUrls(result: any): string[] {
  if (!result) return []
  if (Array.isArray(result.images) && result.images.length > 0) {
    return result.images.filter((u: string) => typeof u === 'string' && u.startsWith('http'))
  }
  const single = result.imageUrl || result.videoUrl || result.composedUrl || result.musicUrl
  if (typeof single === 'string' && single.startsWith('http')) return [single]
  return []
}

export function shouldAutoSave(nodeType: string, result: any): boolean {
  if (EXCLUDED_NODES.has(nodeType)) return false
  if (result?.savedToAsset) return false
  if (!NODE_ASSET_TYPE_MAP[nodeType]) return false
  return extractUrls(result).length > 0
}

// 并发限制的批量执行
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  let next = 0
  async function runNext(): Promise<void> {
    while (next < tasks.length) {
      const i = next++
      try {
        const val = await tasks[i]()
        results[i] = { status: 'fulfilled', value: val }
      } catch (e) {
        results[i] = { status: 'rejected', reason: e }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => runNext()))
  return results
}

export async function autoSaveNodeResult(
  nodeId: string,
  nodeType: string,
  result: any,
): Promise<boolean> {
  const assetType = NODE_ASSET_TYPE_MAP[nodeType]
  const urls = extractUrls(result)
  if (!assetType || urls.length === 0) return false

  const token = localStorage.getItem('nanoai_token')
  if (!token) return false

  const prompt = result?.prompt || result?.rawPrompt || ''
  const tvcProjectId = result?.tvcProjectId || ''

  const tasks = urls.map(url => () =>
    assets.create({
      type: assetType,
      name: prompt?.slice(0, 50) || `Generated ${assetType}`,
      url,
      tags: ['generated'],
      metadata: {
        prompt,
        enhancedPrompt: result?.enhancedPrompt || '',
        params: { model: result?.model || nodeType, ...(result?.params || {}) },
        ...(tvcProjectId ? { tvc_project_id: tvcProjectId } : {}),
      },
      source_node_id: nodeId,
    }, token)
  )

  const results = await parallelLimit(tasks, MAX_CONCURRENT_SAVES)
  return results.some(r => r.status === 'fulfilled')
}
