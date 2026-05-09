/**
 * useImageGeneration — 节点生图共享 hook
 * 封装进度追踪、中止控制、实时推送等通用逻辑
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'

interface UseImageGenerationOptions {
  nodeId: string
}

export function useImageGeneration({ nodeId }: UseImageGenerationOptions) {
  const updateNode = useNanoaiWorkflowStore(s => s.updateNode)
  const stopExecution = useNanoaiWorkflowStore(s => s.stopExecution)
  const [localError, setLocalError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState('idle')
  const [stepProgress, setStepProgress] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const handler = () => { abortRef.current?.abort() }
    window.addEventListener('workflow:abort-all', handler)
    return () => window.removeEventListener('workflow:abort-all', handler)
  }, [])

  const emitStep = useCallback((step: string, progress: number, message: string) => {
    setCurrentStep(step)
    setStepProgress(progress)
    setStepMessage(message)
    updateNode(nodeId, { _stepInfo: { step, progress, message } })
  }, [nodeId, updateNode])

  const startGeneration = useCallback(() => {
    setLocalError(null)
    window.dispatchEvent(new CustomEvent('properties-panel-toggle', { detail: { open: false } }))
    const startedAt = new Date().toISOString()
    updateNode(nodeId, { status: NodeStatus.RUNNING, error: undefined, result: { startedAt }, _stepInfo: undefined })

    const abortController = new AbortController()
    abortRef.current = abortController
    return { abortController, startedAt }
  }, [nodeId, updateNode])

  const finishGeneration = useCallback(<T extends Record<string, any>>(result: T) => {
    updateNode(nodeId, {
      status: NodeStatus.SUCCESS,
      _stepInfo: undefined,
      result: { ...result, completedAt: new Date().toISOString() },
    })
    setCurrentStep('completed')
    setStepProgress(100)
    setStepMessage(`完成！`)
  }, [nodeId, updateNode])

  const handleAbort = useCallback(() => {
    setCurrentStep('cancelled')
    setStepMessage('已终止')
    setStepProgress(0)
    updateNode(nodeId, { _stepInfo: undefined })
  }, [nodeId, updateNode])

  const handleError = useCallback((error: any) => {
    if (error.name === 'AbortError') {
      handleAbort()
      return true
    }
    const errorMsg = error.message || '生成失败'
    setLocalError(errorMsg)
    setCurrentStep('failed')
    setStepMessage(errorMsg)
    updateNode(nodeId, { status: NodeStatus.ERROR, error: errorMsg, _stepInfo: undefined })
    return false
  }, [nodeId, updateNode, handleAbort])

  /**
   * 并行执行多个生图任务，实时汇报总体进度
   * 使用 index-based 数组避免并发 push 竞态
   */
  const runParallel = useCallback(async <T>(tasks: Array<{ label: string; execute: () => Promise<T | null> }>): Promise<T[]> => {
    const total = tasks.length
    let failCount = 0
    let doneCount = 0
    const slots: (T | null)[] = new Array(total).fill(null)

    const reportProgress = () => {
      const overallProg = 5 + Math.floor((doneCount / total) * 90)
      emitStep('generating', overallProg, `${doneCount}/${total} 完成`)
    }

    const promises = tasks.map((task, idx) =>
      task.execute()
        .then((result) => {
          slots[idx] = result
          if (result === null) failCount++
          doneCount++
          reportProgress()
        })
        .catch(() => {
          failCount++
          doneCount++
          reportProgress()
        })
    )

    await Promise.allSettled(promises)

    const results = slots.filter((r): r is T => r !== null)
    if (results.length === 0) {
      throw new Error(`所有任务失败 (${failCount}/${total})`)
    }

    return results
  }, [emitStep])

  return {
    localError, setLocalError,
    currentStep, stepProgress, stepMessage, setStepMessage,
    abortRef, stopExecution,
    emitStep, startGeneration, finishGeneration,
    handleError, handleAbort,
    runParallel,
    updateNode,
  }
}
