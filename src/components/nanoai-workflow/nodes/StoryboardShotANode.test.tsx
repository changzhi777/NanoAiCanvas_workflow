import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithTheme, screen } from '@/test/test-utils'
import { StoryboardShotANode } from './StoryboardShotANode'
import type { StoryboardShotAData } from './StoryboardShotANode'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'

// ==================== Mocks ====================

vi.mock('reactflow', () => ({
  Handle: ({ id, type, position }: any) => (
    <div data-testid={`handle-${id}`} data-type={type} data-position={position} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}))

vi.mock('@reactflow/node-resizer', () => ({
  NodeResizer: () => null,
}))

vi.mock('@/config/glm', () => ({
  GLM_CONFIG: {
    API_KEY: 'test-glm-key',
    API_BASE_URL: 'https://mock-glm-api.test',
  },
}))

vi.mock('@/lib/api/adapters/SkillQueueAdapter', () => ({
  getSkillQueueAdapter: () => ({
    generateImage: vi.fn().mockResolvedValue(['https://mock-image.test/1.png']),
  }),
}))

vi.mock('@/components/TaskStepAnimation', () => ({
  TaskStepAnimation: () => <div data-testid="step-animation" />,
}))

// ==================== Helpers ====================

const defaultData: StoryboardShotAData = {
  label: '故事板分镜A',
  params: {
    inputText: '',
    size: '1024x1024',
    quality: 'standard',
    style: 'realistic',
    batchCount: 1,
    shotCount: 6,
    layoutDirection: 'horizontal' as const,
    temperature: 0.8,
    systemPromptTemplate: 'storyboard',
    model: 'glm-4.5-air',
    aspectRatio: '1:1',
  },
  inputs: [
    { id: 'text-in', name: '文本', type: 'text', required: true },
  ],
  outputs: [
    { id: 'result-out', name: '结果', type: 'image', required: false },
  ],
  status: NodeStatus.IDLE,
}

// ==================== Tests ====================

describe('StoryboardShotANode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNanoaiWorkflowStore.setState({
      nodes: [],
      edges: [],
    })
  })

  it('renders with idle status', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    expect(screen.getByText('未开始')).toBeInTheDocument()
    expect(screen.getAllByText('故事板分镜A').length).toBeGreaterThanOrEqual(1)
  })

  it('shows textarea when no upstream text', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    const textarea = screen.getByPlaceholderText('输入故事描述...')
    expect(textarea).toBeInTheDocument()
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
            status: NodeStatus.IDLE,
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
  })

  it('disables execute button when no prompt', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={defaultData} />)
    const btn = screen.getByText('执行生成')
    expect(btn).toBeDisabled()
  })

  it('shows step animation when running', () => {
    renderWithTheme(<StoryboardShotANode id="test-node" data={{
      ...defaultData,
      status: NodeStatus.RUNNING,
    }} />)

    expect(screen.getByTestId('step-animation')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
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
