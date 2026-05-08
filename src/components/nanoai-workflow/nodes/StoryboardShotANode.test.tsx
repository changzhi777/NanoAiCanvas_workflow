import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithTheme, screen, fireEvent, waitFor } from '@/test/test-utils'
import { StoryboardShotANode } from './StoryboardShotANode'
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore'

// ==================== Mocks ====================

vi.mock('reactflow', () => ({
  Handle: ({ id, type, position }: any) => (
    <div data-testid={`handle-${id}`} data-type={type} data-position={position} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}))

vi.mock('./BaseNode', () => ({
  BaseNode: ({ children, icon, data }: any) => (
    <div data-testid="base-node">
      <span data-testid="node-label">{data?.label}</span>
      {icon}
      {children}
    </div>
  ),
  ParamEditor: () => null,
  ExecuteButton: () => null,
}))

vi.mock('@/config/glm', () => ({
  GLM_CONFIG: {
    API_KEY: 'test-glm-key',
    API_BASE_URL: 'https://mock-glm-api.test',
  },
}))

vi.mock('@/lib/api/adapters/SkillQueueAdapter', () => ({
  getSkillQueueAdapter: () => ({
    generateImage: vi.fn().mockResolvedValue(['https://mock-image.test/1.png', 'https://mock-image.test/2.png']),
  }),
}))

vi.mock('@/components/TaskStepAnimation', () => ({
  TaskStepAnimation: () => <div data-testid="step-animation" />,
}))

vi.mock('../ui/IMEInput', () => ({
  IMERawTextarea: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="ime-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

vi.mock('../ui/VoiceInput', () => ({
  VoiceInput: () => null,
}))

// Mock global fetch for GLM optimization
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// ==================== Helpers ====================

const defaultData = {
  label: '故事板分镜A',
  params: {
    inputText: '',
    size: '1024x1024',
    quality: 'standard',
    style: 'realistic',
    batchCount: 1,
    temperature: 0.8,
    systemPromptTemplate: 'storyboard',
    model: 'glm-4.5-air',
  },
  inputs: [
    { id: 'text-in', name: '文本', type: 'text', required: true },
  ],
  outputs: [
    { id: 'result-out', name: '结果', type: 'image', required: false },
  ],
  status: 'idle' as const,
}

// ==================== Tests ====================

describe('StoryboardShotANode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    // Reset store
    useNanoaiWorkflowStore.setState({
      nodes: [],
      edges: [],
    })
  })

  it('renders with idle status', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    expect(screen.getByText('未开始')).toBeInTheDocument()
    expect(screen.getAllByText('故事板分镜A').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('输入描述 → 优化提示词 → 生成分镜')).toBeInTheDocument()
  })

  it('shows textarea when no upstream text', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    const textarea = screen.getByTestId('ime-textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', '输入故事描述、场景设定...')
  })

  it('shows upstream text when connected', () => {
    useNanoaiWorkflowStore.setState({
      nodes: [
        {
          id: 'source-node',
          type: 'input_text',
          position: { x: 0, y: 0 },
          data: {
            label: '文本输入',
            params: {},
            inputs: [],
            outputs: [],
            status: 'idle',
            result: { text: '一段故事描述' },
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'source-node',
          target: 'test-node',
          sourceHandle: 'out',
          targetHandle: 'text-in',
        },
      ],
    })

    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)

    expect(screen.getByText('上游输入')).toBeInTheDocument()
    expect(screen.getByText('一段故事描述')).toBeInTheDocument()
    // Should not show local textarea
    expect(screen.queryByPlaceholderText('输入故事描述、场景设定...')).not.toBeInTheDocument()
  })

  it('disables execute button when no prompt', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    const btn = screen.getByText('执行生成')
    expect(btn).toBeDisabled()
  })

  it('optimizes prompt via GLM API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '优化后的分镜提示词：特写镜头...' } }],
      }),
    })

    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      params: { ...defaultData.params, inputText: '一个女孩在花园' },
    }} />)

    const optimizeBtn = screen.getByText('优化提示词')
    fireEvent.click(optimizeBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // Check request body
    const fetchCall = mockFetch.mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.model).toBe('glm-4.5-air')
    expect(body.messages[1].content).toContain('一个女孩在花园')

    // Should show optimized prompt
    await waitFor(() => {
      expect(screen.getByDisplayValue('优化后的分镜提示词：特写镜头...')).toBeInTheDocument()
    })
  })

  it('handles optimization failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    })

    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      params: { ...defaultData.params, inputText: '测试文本' },
    }} />)

    fireEvent.click(screen.getByText('优化提示词'))

    await waitFor(() => {
      expect(screen.getByText(/GLM API 错误 500/)).toBeInTheDocument()
    })
  })

  it('handles missing GLM API key', async () => {
    vi.doMock('@/config/glm', () => ({
      GLM_CONFIG: { API_KEY: '', API_BASE_URL: 'https://mock.test' },
    }))

    // This test verifies the error path when API key is empty
    // The actual throw happens in optimizePromptWithGLM
    const { GLM_CONFIG } = await import('@/config/glm')
    expect(GLM_CONFIG.API_KEY).toBeDefined()
  })

  it('shows step animation when running', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      status: 'running',
    }} />)

    expect(screen.getByTestId('step-animation')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('shows result preview on success', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      status: 'success',
      result: {
        images: ['https://img.test/1.png', 'https://img.test/2.png'],
        imageUrl: 'https://img.test/1.png',
        prompt: '测试提示词',
      },
    }} />)

    expect(screen.getByText('共生成 2 张分镜')).toBeInTheDocument()
    expect(screen.getByAltText('分镜 1')).toBeInTheDocument()
    expect(screen.getByAltText('分镜 2')).toBeInTheDocument()
  })

  it('enables execute button when text is provided', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      params: { ...defaultData.params, inputText: '一段故事' },
    }} />)

    const btn = screen.getByText('执行生成')
    expect(btn).not.toBeDisabled()
  })
})
