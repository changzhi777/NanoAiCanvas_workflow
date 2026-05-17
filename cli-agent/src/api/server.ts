import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { runPipeline } from '../core/pipeline.js'
import type { VideoClip } from '../types.js'
import { logInfo, logSuccess, logError } from '../cli/utils.js'

// In-memory task store
const tasks = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  error?: string
  createdAt: string
  completedAt?: string
}>()

export async function startApiServer(port: number): Promise<void> {
  const app = Fastify({ logger: false })

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
    tasks: tasks.size,
  }))

  // Compose task
  app.post('/api/compose', async (req, reply) => {
    const body = req.body as any

    if (!body?.clips?.length) {
      return reply.code(400).send({ error: 'clips is required and non-empty' })
    }

    const clips: VideoClip[] = body.clips.map((src: string) => ({ src }))
    const taskId = randomUUID()

    tasks.set(taskId, { status: 'pending', createdAt: new Date().toISOString() })

    // Run async — errors are caught and stored in task
    runPipeline({
      clips,
      subtitles: body.subtitles,
      bgmUrl: body.bgmUrl,
      bgmVolume: body.bgmVolume,
      compare: body.compare,
      outputPreset: body.outputPreset || '1080p',
      outputFormats: body.outputFormats || ['1080p'],
      outputPath: body.outputPath,
    }).then((result) => {
      tasks.set(taskId, {
        status: 'completed',
        result,
        createdAt: tasks.get(taskId)!.createdAt,
        completedAt: new Date().toISOString(),
      })
    }).catch((err) => {
      tasks.set(taskId, {
        status: 'failed',
        error: (err as Error).message,
        createdAt: tasks.get(taskId)!.createdAt,
        completedAt: new Date().toISOString(),
      })
    })

    return { taskId, status: 'pending' }
  })

  // Get task status
  app.get('/api/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = tasks.get(id)
    if (!task) return reply.code(404).send({ error: 'Task not found' })
    return task
  })

  // List tasks
  app.get('/api/tasks', async () => {
    return Array.from(tasks.entries()).map(([id, t]) => ({ id, ...t }))
  })

  try {
    await app.listen({ port, host: '0.0.0.0' })
    logSuccess(`HTTP API 服务已启动: http://localhost:${port}`)
    logInfo(`端点: POST /api/compose | GET /api/tasks | GET /api/health`)
  } catch (err) {
    logError(`API 服务启动失败: ${(err as Error).message}`)
    process.exit(1)
  }
}
