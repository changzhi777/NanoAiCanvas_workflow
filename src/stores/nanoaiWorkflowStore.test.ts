import { describe, it, expect, beforeEach } from 'vitest'
import { useNanoaiWorkflowStore, WorkflowNodeType, NodeStatus, type WorkflowNode } from '@/stores/nanoaiWorkflowStore'

const mockNode = (id: string, type = WorkflowNodeType.INPUT_TEXT, pos = { x: 0, y: 0 }): WorkflowNode => ({
  id,
  type,
  position: pos,
  data: {
    label: `Node ${id}`,
    params: {},
    inputs: [],
    outputs: [],
    status: NodeStatus.IDLE,
  },
})

describe('nanoaiWorkflowStore', () => {
  beforeEach(() => {
    useNanoaiWorkflowStore.getState().clearWorkflow()
    // Reset templates to built-in
    useNanoaiWorkflowStore.getState().resetTemplates()
    useNanoaiWorkflowStore.setState({
      versions: [],
      selectedNodeId: null,
      isExecuting: false,
      executionLog: [],
    })
  })

  // ==================== Node CRUD ====================

  describe('addNode / removeNode', () => {
    it('should add a node', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      expect(useNanoaiWorkflowStore.getState().nodes).toHaveLength(1)
      expect(useNanoaiWorkflowStore.getState().nodes[0].id).toBe('n1')
    })

    it('should remove a node and its connected edges', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().addNode(mockNode('n2'))
      useNanoaiWorkflowStore.getState().addEdge({
        id: 'e1', source: 'n1', target: 'n2',
      })
      useNanoaiWorkflowStore.getState().removeNode('n1')
      const state = useNanoaiWorkflowStore.getState()
      expect(state.nodes).toHaveLength(1)
      expect(state.edges).toHaveLength(0)
    })
  })

  describe('updateNode', () => {
    it('should update node data', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().updateNode('n1', { label: 'Updated' })
      expect(useNanoaiWorkflowStore.getState().nodes[0].data.label).toBe('Updated')
    })

    it('should not affect other nodes', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().addNode(mockNode('n2'))
      useNanoaiWorkflowStore.getState().updateNode('n1', { label: 'Changed' })
      expect(useNanoaiWorkflowStore.getState().nodes[1].data.label).toBe('Node n2')
    })
  })

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().updateNodePosition('n1', { x: 100, y: 200 })
      const node = useNanoaiWorkflowStore.getState().nodes[0]
      expect(node.position).toEqual({ x: 100, y: 200 })
    })
  })

  describe('updateNodeParams', () => {
    it('should merge params', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().updateNodeParams('n1', { prompt: 'test' })
      useNanoaiWorkflowStore.getState().updateNodeParams('n1', { model: 'glm' })
      const params = useNanoaiWorkflowStore.getState().nodes[0].data.params
      expect(params).toEqual({ prompt: 'test', model: 'glm' })
    })
  })

  // ==================== Edge CRUD ====================

  describe('addEdge / removeEdge', () => {
    it('should add and remove edges', () => {
      useNanoaiWorkflowStore.getState().addEdge({ id: 'e1', source: 'a', target: 'b' })
      expect(useNanoaiWorkflowStore.getState().edges).toHaveLength(1)
      useNanoaiWorkflowStore.getState().removeEdge('e1')
      expect(useNanoaiWorkflowStore.getState().edges).toHaveLength(0)
    })
  })

  // ==================== Template Management ====================

  describe('templates', () => {
    it('should have built-in templates', () => {
      expect(useNanoaiWorkflowStore.getState().templates.length).toBeGreaterThan(0)
    })

    it('saveTemplate should add a new template', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      const before = useNanoaiWorkflowStore.getState().templates.length
      useNanoaiWorkflowStore.getState().saveTemplate('Test', 'A test template', 'custom')
      expect(useNanoaiWorkflowStore.getState().templates.length).toBe(before + 1)
      const saved = useNanoaiWorkflowStore.getState().templates.at(-1)!
      expect(saved.name).toBe('Test')
      expect(saved.nodes).toHaveLength(1)
    })

    it('deleteTemplate should remove template', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveTemplate('ToDelete', 'desc', 'custom')
      const saved = useNanoaiWorkflowStore.getState().templates.at(-1)!
      useNanoaiWorkflowStore.getState().deleteTemplate(saved.id)
      const found = useNanoaiWorkflowStore.getState().templates.find(t => t.id === saved.id)
      expect(found).toBeUndefined()
    })

    it('resetTemplates should restore built-in templates', () => {
      const builtInCount = useNanoaiWorkflowStore.getState().templates.length
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveTemplate('Extra', 'desc', 'custom')
      useNanoaiWorkflowStore.getState().resetTemplates()
      expect(useNanoaiWorkflowStore.getState().templates.length).toBe(builtInCount)
    })
  })

  // ==================== Version Management ====================

  describe('versions', () => {
    it('saveVersion should create a version snapshot', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveVersion('v1')
      const versions = useNanoaiWorkflowStore.getState().versions
      expect(versions).toHaveLength(1)
      expect(versions[0].description).toBe('v1')
      expect(versions[0].snapshot.nodes).toHaveLength(1)
      expect(versions[0].nodeCount).toBe(1)
    })

    it('restoreVersion should restore nodes and edges', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveVersion('v1')
      useNanoaiWorkflowStore.getState().addNode(mockNode('n2'))
      expect(useNanoaiWorkflowStore.getState().nodes).toHaveLength(2)

      const versionId = useNanoaiWorkflowStore.getState().versions[0].id
      useNanoaiWorkflowStore.getState().restoreVersion(versionId)
      expect(useNanoaiWorkflowStore.getState().nodes).toHaveLength(1)
      expect(useNanoaiWorkflowStore.getState().nodes[0].id).toBe('n1')
    })

    it('deleteVersion should remove version', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveVersion('v1')
      const vId = useNanoaiWorkflowStore.getState().versions[0].id
      useNanoaiWorkflowStore.getState().deleteVersion(vId)
      expect(useNanoaiWorkflowStore.getState().versions).toHaveLength(0)
    })

    it('listVersions should return all versions', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().saveVersion('v1')
      useNanoaiWorkflowStore.getState().saveVersion('v2')
      expect(useNanoaiWorkflowStore.getState().listVersions()).toHaveLength(2)
    })

    it('should cap versions at 50', () => {
      for (let i = 0; i < 55; i++) {
        useNanoaiWorkflowStore.getState().saveVersion(`v${i}`)
      }
      expect(useNanoaiWorkflowStore.getState().versions.length).toBe(50)
    })
  })

  // ==================== Selection ====================

  describe('selectNode', () => {
    it('should set selected node', () => {
      useNanoaiWorkflowStore.getState().selectNode('n1')
      expect(useNanoaiWorkflowStore.getState().selectedNodeId).toBe('n1')
    })

    it('should clear selection with null', () => {
      useNanoaiWorkflowStore.getState().selectNode('n1')
      useNanoaiWorkflowStore.getState().selectNode(null)
      expect(useNanoaiWorkflowStore.getState().selectedNodeId).toBeNull()
    })
  })

  // ==================== Export / Import ====================

  describe('exportWorkflow / importWorkflow', () => {
    it('should export and import workflow JSON', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().addNode(mockNode('n2', WorkflowNodeType.IMAGE_PREVIEW))
      const json = useNanoaiWorkflowStore.getState().exportWorkflow()

      useNanoaiWorkflowStore.getState().clearWorkflow()
      expect(useNanoaiWorkflowStore.getState().nodes).toHaveLength(0)

      useNanoaiWorkflowStore.getState().importWorkflow(json)
      expect(useNanoaiWorkflowStore.getState().nodes).toHaveLength(2)
    })
  })

  // ==================== clearWorkflow ====================

  describe('clearWorkflow', () => {
    it('should clear nodes and edges', () => {
      useNanoaiWorkflowStore.getState().addNode(mockNode('n1'))
      useNanoaiWorkflowStore.getState().addNode(mockNode('n2'))
      useNanoaiWorkflowStore.getState().addEdge({ id: 'e1', source: 'n1', target: 'n2' })
      useNanoaiWorkflowStore.getState().clearWorkflow()
      const state = useNanoaiWorkflowStore.getState()
      expect(state.nodes).toHaveLength(0)
      expect(state.edges).toHaveLength(0)
    })
  })

  // ==================== AutoSave Toggle ====================

  describe('toggleAutoSave', () => {
    it('should toggle autoSaveEnabled', () => {
      const before = useNanoaiWorkflowStore.getState().autoSaveEnabled
      useNanoaiWorkflowStore.getState().toggleAutoSave()
      expect(useNanoaiWorkflowStore.getState().autoSaveEnabled).toBe(!before)
    })
  })

  // ==================== WorkflowNodeType Enum ====================

  describe('WorkflowNodeType enum', () => {
    it('should have all expected node types', () => {
      expect(WorkflowNodeType.INPUT_TEXT).toBe('input_text')
      expect(WorkflowNodeType.TVC_SCRIPT).toBe('tvc_script')
      expect(WorkflowNodeType.STORYBOARD_SHOT_A).toBe('storyboard_shot_a')
      expect(WorkflowNodeType.OUTPUT_NODE).toBe('output_node')
    })
  })
})
