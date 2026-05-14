import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mocks
const mockUpdateNodeParams = vi.fn()
const mockUpdateNode = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockGenerateScript = vi.fn()
const mockEstimatePoints = vi.fn()
const mockSubmitTask = vi.fn()

vi.mock('@/stores/nanoaiWorkflowStore', () => ({
  useNanoaiWorkflowStore: () => ({
    updateNodeParams: mockUpdateNodeParams,
    updateNode: mockUpdateNode,
  }),
  NodeStatus: { RUNNING: 'running', SUCCESS: 'success', ERROR: 'error', IDLE: 'idle' },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: mockToastSuccess, error: mockToastError } }),
}))

vi.mock('@/lib/api/tvc-api', () => ({
  tvcApi: {
    generateScript: (...args: any[]) => mockGenerateScript(...args),
    estimatePoints: (...args: any[]) => mockEstimatePoints(...args),
    submitTask: (...args: any[]) => mockSubmitTask(...args),
  },
}))

vi.mock('@/config/glm', () => ({
  GLM_CONFIG: {
    TVC_MODEL_LABELS: {
      tvc_deep: { label: '深度分析优化', model: 'glm-5.1', thinking: true },
      tvc_fast: { label: '快速优化', model: 'glm-4.5-air', thinking: false },
      tvc_minimax: { label: 'MiniMax 2.7', model: 'MiniMax-M2.7', provider: 'minimax' },
      tvc_vision: { label: '参考图优化', model: 'glm-5v-turbo', thinking: true },
    },
  },
}))

import { useTvcExecution, getTvcModelConfig } from './useTvcExecution'

const defaultData = {
  params: {
    inputText: '30秒咖啡品牌TVC',
    referenceImage: null,
    optimizeMode: 'tvc_deep',
    executionMode: 'step' as const,
    style: 'realistic',
    quality: 'hd',
    temperature: 1.0,
    maxLength: 8192,
    shotCount: 6,
    shotDuration: 5,
    totalDuration: 30,
  },
  result: {},
  status: 'idle',
}

describe('getTvcModelConfig', () => {
  it('returns correct config for tvc_deep', () => {
    const config = getTvcModelConfig('tvc_deep')
    expect(config.model).toBe('glm-5.1')
    expect(config.provider).toBe('glm')
    expect(config.thinking).toBe(true)
  })

  it('returns minimax provider for tvc_minimax', () => {
    const config = getTvcModelConfig('tvc_minimax')
    expect(config.provider).toBe('minimax')
  })

  it('returns default for unknown mode', () => {
    const config = getTvcModelConfig('unknown')
    expect(config.model).toBe('glm-5.1')
    expect(config.provider).toBe('glm')
  })
})

describe('useTvcExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeStep', () => {
    it('calls generateScript and updates node on success', async () => {
      const mockScript = { tvc_title: 'Test TVC', shots: [] }
      mockGenerateScript.mockResolvedValue({ script: mockScript })

      const { result } = renderHook(() =>
        useTvcExecution('node-1', defaultData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeStep()
      })

      expect(mockGenerateScript).toHaveBeenCalledWith(expect.objectContaining({
        prompt: '30秒咖啡品牌TVC',
        modelProvider: 'glm',
        model: 'glm-5.1',
      }))
      expect(mockUpdateNode).toHaveBeenCalledWith('node-1', expect.objectContaining({
        status: 'success',
      }))
      expect(mockToastSuccess).toHaveBeenCalledWith('TVC 脚本生成完成')
    })

    it('shows error toast on empty input', async () => {
      const emptyData = { ...defaultData, params: { ...defaultData.params, inputText: '' } }

      const { result } = renderHook(() =>
        useTvcExecution('node-1', emptyData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeStep()
      })

      expect(mockToastError).toHaveBeenCalledWith('请先输入 TVC 描述')
      expect(mockGenerateScript).not.toHaveBeenCalled()
    })

    it('handles API error', async () => {
      mockGenerateScript.mockRejectedValue(new Error('GLM timeout'))

      const { result } = renderHook(() =>
        useTvcExecution('node-1', defaultData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeStep()
      })

      expect(mockUpdateNode).toHaveBeenCalledWith('node-1', expect.objectContaining({
        status: 'error',
        error: 'GLM timeout',
      }))
      expect(mockToastError).toHaveBeenCalledWith('脚本生成失败: GLM timeout')
    })
  })

  describe('executeAuto', () => {
    it('submits task after passing points check', async () => {
      mockEstimatePoints.mockResolvedValue({ total: 100, balance: 200, sufficient: true })
      mockSubmitTask.mockResolvedValue({ task_id: 'tvc_abc123', status: 'submitted' })

      const { result } = renderHook(() =>
        useTvcExecution('node-1', defaultData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeAuto()
      })

      expect(mockEstimatePoints).toHaveBeenCalledWith({ shotCount: 6, includeBgm: true })
      expect(mockSubmitTask).toHaveBeenCalled()
      expect(mockToastSuccess).toHaveBeenCalledWith('TVC 后台任务已提交')
    })

    it('blocks when points insufficient', async () => {
      mockEstimatePoints.mockResolvedValue({ total: 500, balance: 100, sufficient: false })

      const { result } = renderHook(() =>
        useTvcExecution('node-1', defaultData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeAuto()
      })

      expect(mockToastError).toHaveBeenCalledWith('积分不足：需要 500，当前余额 100')
      expect(mockSubmitTask).not.toHaveBeenCalled()
    })

    it('proceeds when points service unavailable', async () => {
      mockEstimatePoints.mockRejectedValue(new Error('service down'))
      mockSubmitTask.mockResolvedValue({ task_id: 'tvc_xyz', status: 'submitted' })

      const { result } = renderHook(() =>
        useTvcExecution('node-1', defaultData as any, mockUpdateNodeParams, mockUpdateNode)
      )

      await act(async () => {
        await result.current.executeAuto()
      })

      expect(mockSubmitTask).toHaveBeenCalled()
    })
  })
})
