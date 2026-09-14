/**
 * 故事板生成流水线
 * 完整的 4 步生成流程 + 断点续传 + 错误处理
 */

import path from 'path'
import { generateScript, generateStoryboard, generateImagePrompts, analyzeError } from '../services/glm5.js'
import { generateImages, downloadImage } from '../services/nanobanana2.js'
import { getTask, updateTask, completeTask, failTask, activateTask } from '../services/redis.js'
import { getTaskOutputDir, writeToFile, getScriptFilename, getStoryboardJsonFilename, getImageFilename } from '../utils/file.js'
import { logger } from '../utils/logger.js'
import type { Task, TaskStep, StoryboardStyle, ProgressCallback } from '../types/index.js'

/**
 * 执行单个步骤
 */
async function executeStep(
  step: TaskStep,
  task: Task,
  onProgress?: ProgressCallback
): Promise<Partial<Task>> {
  const updates: Partial<Task> = {}

  switch (step) {
    case 'script': {
      // Step 1: 文案转剧本
      onProgress?.({ step, progress: 0, message: '正在生成剧本...', taskId: task.taskId })

      const script = await generateScript(task.inputText, task.style as StoryboardStyle)

      // 保存剧本文件
      const outputDir = await getTaskOutputDir(task.taskId)
      const scriptPath = path.join(outputDir, getScriptFilename())
      await writeToFile(scriptPath, script)

      updates.script = script
      updates.outputDir = outputDir
      updates.currentStep = 'storyboard'
      updates.progress = 30
      updates.progressMessage = '剧本生成完成，准备生成分镜头...'

      onProgress?.({ step, progress: 30, message: '剧本生成完成', taskId: task.taskId })
      break
    }

    case 'storyboard': {
      // Step 2: 剧本转分镜头脚本
      if (!task.script) {
        throw new Error('缺少剧本内容，无法生成分镜头')
      }

      onProgress?.({ step, progress: 30, message: '正在生成分镜头脚本...', taskId: task.taskId })

      const storyboard = await generateStoryboard(task.script, task.style as StoryboardStyle)

      // 保存分镜头 JSON
      const outputDir = task.outputDir || await getTaskOutputDir(task.taskId)
      const jsonPath = path.join(outputDir, getStoryboardJsonFilename())
      await writeToFile(jsonPath, JSON.stringify(storyboard, null, 2))

      updates.storyboard = storyboard
      updates.currentStep = 'images'
      updates.progress = 50
      updates.progressMessage = `分镜头生成完成，共 ${storyboard.scenes.length} 个镜头`

      onProgress?.({ step, progress: 50, message: `分镜头生成完成，共 ${storyboard.scenes.length} 个镜头`, taskId: task.taskId })
      break
    }

    case 'images': {
      // Step 3: 生成图片
      const storyboard = task.storyboard
      if (!storyboard) {
        throw new Error('缺少分镜头数据，无法生成图片')
      }

      onProgress?.({ step, progress: 50, message: '正在生成故事板图片...', taskId: task.taskId })

      const prompts = generateImagePrompts(storyboard, task.style as StoryboardStyle)
      const outputDir = task.outputDir || await getTaskOutputDir(task.taskId)
      const imagesDir = path.join(outputDir, 'images')

      // 并行生成所有图片
      const totalPrompts = prompts.length
      let completedCount = 0

      onProgress?.({
        step,
        progress: 50,
        message: `正在并行生成 ${totalPrompts} 张图片...`,
        taskId: task.taskId,
      })

      const imagePromises = prompts.map(async (prompt, i) => {
        try {
          const imageUrl = await generateImage(prompt, '9:16', () => {})

          // 下载图片到本地
          const localPath = path.join(imagesDir, getImageFilename(i))
          await downloadImage(imageUrl, localPath)

          completedCount++
          const progress = 50 + Math.round((completedCount / totalPrompts) * 45)
          onProgress?.({
            step,
            progress,
            message: `图片生成进度 ${completedCount}/${totalPrompts}`,
            taskId: task.taskId,
          })

          return { index: i, url: imageUrl }
        } catch (error) {
          logger.warn(`图片 ${i + 1} 生成失败:`, error)
          completedCount++
          return { index: i, url: '' }
        }
      })

      const results = await Promise.all(imagePromises)

      // 按原始顺序排列
      const images = results
        .sort((a, b) => a.index - b.index)
        .map((r) => r.url)

      updates.images = images
      updates.currentStep = 'completed'
      updates.progress = 100
      updates.progressMessage = '全部生成完成！'

      onProgress?.({ step: 'completed', progress: 100, message: '全部生成完成！', taskId: task.taskId })
      break
    }

    case 'completed': {
      // 已完成，无需处理
      break
    }
  }

  return updates
}

/**
 * 获取下一个步骤
 */
function getNextStep(currentStep: TaskStep): TaskStep | null {
  const steps: TaskStep[] = ['script', 'storyboard', 'images', 'completed']
  const index = steps.indexOf(currentStep)
  if (index === -1 || index === steps.length - 1) {
    return null
  }
  return steps[index]
}

/**
 * 判断是否需要执行某个步骤
 */
function shouldExecuteStep(step: TaskStep, task: Task): boolean {
  switch (step) {
    case 'script':
      return !task.script
    case 'storyboard':
      return !!task.script && !task.storyboard
    case 'images':
      return !!task.storyboard && task.images.length === 0
    case 'completed':
      return false
    default:
      return false
  }
}

/**
 * 运行完整流水线
 */
export async function runStoryboardPipeline(
  taskId: string,
  onProgress?: ProgressCallback
): Promise<Task> {
  // 获取任务
  let task = await getTask(taskId)
  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  // 标记为执行中
  await activateTask(taskId)

  const steps: TaskStep[] = ['script', 'storyboard', 'images']
  const maxRetries = 3

  try {
    // 断点续传：从当前步骤开始
    let currentStep = task.currentStep

    for (const step of steps) {
      // 检查是否需要执行
      if (steps.indexOf(step) < steps.indexOf(currentStep)) {
        continue
      }

      // 重试逻辑
      let retryCount = 0
      let lastError: Error | null = null

      while (retryCount < maxRetries) {
        try {
          // 重新获取任务状态
          task = (await getTask(taskId))!

          logger.step(step, `开始执行步骤: ${step}`)

          // 执行步骤
          const updates = await executeStep(step, task, onProgress)

          // 更新任务
          await updateTask(taskId, updates)
          task = (await getTask(taskId))!

          break // 成功，跳出重试循环
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          retryCount++

          logger.warn(`步骤 ${step} 失败 (重试 ${retryCount}/${maxRetries}):`, lastError.message)

          if (retryCount < maxRetries) {
            // 等待后重试
            await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount))
          }
        }
      }

      // 重试耗尽，分析错误
      if (retryCount >= maxRetries && lastError) {
        logger.error(`步骤 ${step} 最终失败，正在分析错误...`)

        // 调用 GLM-5 分析错误
        const errorAnalysis = await analyzeError(lastError.message, {
          step,
          input: step === 'script' ? task.inputText : task.script || undefined,
        })

        // 更新任务失败状态
        await failTask(taskId, lastError.message, errorAnalysis)

        throw new Error(`步骤 ${step} 失败: ${lastError.message}\n\n分析: ${errorAnalysis}`)
      }
    }

    // 全部完成
    await completeTask(taskId)
    task = (await getTask(taskId))!

    logger.success(`任务 ${taskId} 完成！`)

    return task
  } catch (error) {
    logger.error(`流水线执行失败:`, error)
    throw error
  }
}

/**
 * 从指定步骤恢复任务
 */
export async function resumeStoryboardPipeline(
  taskId: string,
  fromStep: TaskStep,
  onProgress?: ProgressCallback
): Promise<Task> {
  // 获取任务
  const task = await getTask(taskId)
  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  // 重置当前步骤
  await updateTask(taskId, {
    currentStep: fromStep,
    status: 'pending',
    error: null,
    errorAnalysis: null,
  })

  // 运行流水线
  return runStoryboardPipeline(taskId, onProgress)
}
