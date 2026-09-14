import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAgentStore } from '@/stores/agentStore'
import * as agentApi from '@/lib/api/agent-api'

// Mock agent-api module
vi.mock('@/lib/api/agent-api', () => ({
  getAgentAbout: vi.fn(),
  startPipeline: vi.fn(),
  getPipelineStatus: vi.fn(),
  agentChat: vi.fn(),
  connectAgentWS: vi.fn(),
}))

const mockGetAgentAbout = agentApi.getAgentAbout as ReturnType<typeof vi.fn>
const mockStartPipeline = agentApi.startPipeline as ReturnType<typeof vi.fn>
const mockGetPipelineStatus = agentApi.getPipelineStatus as ReturnType<typeof vi.fn>
const mockAgentChat = agentApi.agentChat as ReturnType<typeof vi.fn>
const mockConnectAgentWS = agentApi.connectAgentWS as ReturnType<typeof vi.fn>

describe('AgentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useAgentStore.setState({
      about: null,
      loading: false,
      pipelineStatus: null,
      pipelineLoading: false,
      chatMessages: [],
      chatLoading: false,
      ws: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have correct initial state', () => {
    const state = useAgentStore.getState()
    expect(state.about).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.pipelineStatus).toBeNull()
    expect(state.pipelineLoading).toBe(false)
    expect(state.chatMessages).toEqual([])
    expect(state.chatLoading).toBe(false)
    expect(state.ws).toBeNull()
  })

  describe('fetchAbout', () => {
    it('should fetch and set about data', async () => {
      const mockAbout = { version: 'V0.3.0', agents: [], name: 'Nanoai Team8', copyright: '', agents_detail: [], model_mode: 'cloud', health: { local: false, cloud: true }, skills_count: 0, users_count: 0 }
      mockGetAgentAbout.mockResolvedValue(mockAbout)

      await useAgentStore.getState().fetchAbout()

      expect(useAgentStore.getState().about).toEqual(mockAbout)
      expect(useAgentStore.getState().loading).toBe(false)
    })

    it('should set about to null on fetch failure', async () => {
      mockGetAgentAbout.mockRejectedValue(new Error('Network error'))

      await useAgentStore.getState().fetchAbout()

      expect(useAgentStore.getState().about).toBeNull()
      expect(useAgentStore.getState().loading).toBe(false)
    })
  })

  describe('startPipelineTask', () => {
    it('should start pipeline and return task id', async () => {
      mockStartPipeline.mockResolvedValue({ task_id: 'task-123', status: 'started' })
      mockGetPipelineStatus.mockResolvedValue({ status: 'running', current_stage: 1, total_stages: 8 })

      const taskId = await useAgentStore.getState().startPipelineTask({ prompt: 'test' })

      expect(taskId).toBe('task-123')
      expect(useAgentStore.getState().pipelineLoading).toBe(true)
    })

    it('should return null on failure', async () => {
      mockStartPipeline.mockRejectedValue(new Error('Failed'))

      const taskId = await useAgentStore.getState().startPipelineTask({})

      expect(taskId).toBeNull()
      expect(useAgentStore.getState().pipelineLoading).toBe(false)
    })
  })

  describe('pollPipelineStatus', () => {
    it('should poll and update status, stopping on completed', async () => {
      mockGetPipelineStatus
        .mockResolvedValueOnce({ status: 'running', current_stage: 2, total_stages: 8 })
        .mockResolvedValueOnce({ status: 'completed', current_stage: 8, total_stages: 8 })

      useAgentStore.getState().pollPipelineStatus('task-1', 1000)

      // First tick
      await vi.advanceTimersByTimeAsync(1100)
      expect(useAgentStore.getState().pipelineStatus?.status).toBe('running')

      // Second tick - should stop
      await vi.advanceTimersByTimeAsync(1100)
      expect(useAgentStore.getState().pipelineStatus?.status).toBe('completed')
      expect(useAgentStore.getState().pipelineLoading).toBe(false)
    })

    it('should stop polling on error', async () => {
      mockGetPipelineStatus.mockRejectedValue(new Error('Network'))

      useAgentStore.getState().pollPipelineStatus('task-1', 1000)

      await vi.advanceTimersByTimeAsync(1100)
      expect(useAgentStore.getState().pipelineLoading).toBe(false)
    })
  })

  describe('sendChat', () => {
    it('should add user message and call agentChat', async () => {
      mockAgentChat.mockResolvedValue({})

      await useAgentStore.getState().sendChat([{ role: 'user', content: 'Hello' }], 'producer')

      expect(useAgentStore.getState().chatMessages).toHaveLength(1)
      expect(useAgentStore.getState().chatMessages[0].content).toBe('Hello')
      expect(mockAgentChat).toHaveBeenCalled()
    })

    it('should set chatLoading false on error', async () => {
      mockAgentChat.mockRejectedValue(new Error('Failed'))

      await useAgentStore.getState().sendChat([{ role: 'user', content: 'Hi' }])

      expect(useAgentStore.getState().chatLoading).toBe(false)
    })
  })

  describe('connectWS / disconnectWS', () => {
    it('should connect and store ws instance', () => {
      const mockWs = { close: vi.fn(), addEventListener: vi.fn() } as any
      mockConnectAgentWS.mockReturnValue(mockWs)

      useAgentStore.getState().connectWS('user-1')

      expect(mockConnectAgentWS).toHaveBeenCalledWith('user-1', expect.any(Function))
      expect(useAgentStore.getState().ws).toBe(mockWs)
    })

    it('should close existing ws before connecting new one', () => {
      const oldWs = { close: vi.fn(), addEventListener: vi.fn() } as any
      const newWs = { close: vi.fn(), addEventListener: vi.fn() } as any
      mockConnectAgentWS.mockReturnValue(newWs)

      useAgentStore.setState({ ws: oldWs })
      useAgentStore.getState().connectWS('user-1')

      expect(oldWs.close).toHaveBeenCalled()
    })

    it('should disconnect and clear ws', () => {
      const mockWs = { close: vi.fn() } as any
      useAgentStore.setState({ ws: mockWs })

      useAgentStore.getState().disconnectWS()

      expect(mockWs.close).toHaveBeenCalled()
      expect(useAgentStore.getState().ws).toBeNull()
    })
  })

  describe('clearChat', () => {
    it('should clear chat messages', () => {
      useAgentStore.setState({ chatMessages: [{ role: 'user', content: 'test' }] as any })
      useAgentStore.getState().clearChat()
      expect(useAgentStore.getState().chatMessages).toEqual([])
    })
  })
})
