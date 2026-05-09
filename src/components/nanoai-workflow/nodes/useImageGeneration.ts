/**
 * useImageGeneration — 节点生图共享 hook
 * 封装进度追踪、中止控制、实时推送等通用逻辑
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { TaskStepInfo } from '@/lib/api/adapters/SkillQueueAdapter'

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
  const lastSyncedProgRef = useRef(0)

  useEffect(() => {
    const handler = () => { abortRef.current?.abort() }
    window.addEventListener('workflow:abort-all', handler)
    return () => window.removeEventListener('workflow:abort-all', handler)
  }, [])

  const syncStepToStore = useCallback((step: string, progress: number, message: string) => {
    if (Math.abs(progress - lastSyncedProgRef.current) < 2) return
    lastSyncedProgRef.current = progress
    updateNode(nodeId, { _stepInfo: { step, progress, message } })
  }, [nodeId, updateNode])

  const emitStep = useCallback((step: string, progress: number, message: string) => {
    setCurrentStep(step)
    setStepProgress(progress)
    setStepMessage(message)
    lastSyncedProgRef.current = progress
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

  /** 为单张图生成进度回调 */
  const createProgressCallbacks = useCallback((startProg: number, totalItems: number, label: string) => {
    return {
      onProgress: (progress: number) => {
        const overall = startProg + Math.floor((progress / 100) * (90 / totalItems))
        setStepProgress(overall)
        syncStepToStore('generating', overall, `${label} 生成中 ${progress}%`)
      },
      onStep: (stepInfo: TaskStepInfo) => {
        const overall = startProg + Math.floor((stepInfo.progress / 100) * (90 / totalItems))
        setStepProgress(overall)
        setStepMessage(`${label} ${stepInfo.message}`)
        syncStepToStore('generating', overall, `${label} ${stepInfo.message}`)
      },
    }
  }, [syncStepToStore])

  return {
    localError, setLocalError,
    currentStep, stepProgress, stepMessage, setStepMessage,
    abortRef, stopExecution,
    emitStep, startGeneration, finishGeneration,
    handleError, handleAbort,
    createProgressCallbacks,
    // 暴露 updateNode 的引用用于实时推送
    updateNode,
  }
}
