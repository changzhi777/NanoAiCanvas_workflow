import { describe, it, expect, beforeEach } from 'vitest'
import { usePluginStore } from '@/stores/pluginStore'
import type { Plugin } from '@/types/plugin'

const createMockPlugin = (id: string, nodeTypes: string[] = []): Plugin => ({
  id,
  name: `Plugin ${id}`,
  version: '1.0.0',
  description: `Description for ${id}`,
  enabled: true,
  author: 'test',
  nodeTypes: nodeTypes.map(type => ({
    type,
    label: `Node ${type}`,
    category: 'test',
    component: 'div' as unknown as React.ComponentType,
  })),
})

describe('pluginStore', () => {
  beforeEach(() => {
    // Reset store to empty state
    usePluginStore.setState({
      _plugins: {},
      _customNodeTypes: {},
      plugins: [],
      customNodeTypes: [],
    })
  })

  describe('registerPlugin', () => {
    it('should register a new plugin', () => {
      const plugin = createMockPlugin('p1', ['nt1', 'nt2'])
      usePluginStore.getState().registerPlugin(plugin)
      const state = usePluginStore.getState()
      expect(state.plugins).toHaveLength(1)
      expect(state.plugins[0].id).toBe('p1')
      expect(state.plugins[0].installedAt).toBeDefined()
    })

    it('should register custom node types', () => {
      const plugin = createMockPlugin('p1', ['nt1', 'nt2'])
      usePluginStore.getState().registerPlugin(plugin)
      expect(usePluginStore.getState().customNodeTypes).toHaveLength(2)
    })

    it('should skip duplicate plugin registration', () => {
      const plugin = createMockPlugin('p1')
      usePluginStore.getState().registerPlugin(plugin)
      usePluginStore.getState().registerPlugin(plugin)
      expect(usePluginStore.getState().plugins).toHaveLength(1)
    })
  })

  describe('unregisterPlugin', () => {
    it('should remove plugin and its node types', () => {
      const plugin = createMockPlugin('p1', ['nt1'])
      usePluginStore.getState().registerPlugin(plugin)
      usePluginStore.getState().unregisterPlugin('p1')
      const state = usePluginStore.getState()
      expect(state.plugins).toHaveLength(0)
      expect(state.customNodeTypes).toHaveLength(0)
    })

    it('should handle non-existent plugin gracefully', () => {
      usePluginStore.getState().unregisterPlugin('non-existent')
      expect(usePluginStore.getState().plugins).toHaveLength(0)
    })
  })

  describe('enablePlugin / disablePlugin', () => {
    it('should enable a disabled plugin', () => {
      const plugin = createMockPlugin('p1')
      plugin.enabled = false
      usePluginStore.getState().registerPlugin(plugin)
      usePluginStore.getState().enablePlugin('p1')
      expect(usePluginStore.getState().getPlugin('p1')?.enabled).toBe(true)
    })

    it('should disable an enabled plugin', () => {
      usePluginStore.getState().registerPlugin(createMockPlugin('p1'))
      usePluginStore.getState().disablePlugin('p1')
      expect(usePluginStore.getState().getPlugin('p1')?.enabled).toBe(false)
    })

    it('should not crash on non-existent plugin', () => {
      expect(() => usePluginStore.getState().enablePlugin('non-existent')).not.toThrow()
    })
  })

  describe('query methods', () => {
    beforeEach(() => {
      usePluginStore.getState().registerPlugin(createMockPlugin('p1', ['nt1']))
      const p2 = createMockPlugin('p2', ['nt2'])
      p2.enabled = false
      usePluginStore.getState().registerPlugin(p2)
    })

    it('getPlugin should return registered plugin', () => {
      expect(usePluginStore.getState().getPlugin('p1')).toBeDefined()
      expect(usePluginStore.getState().getPlugin('p1')?.name).toBe('Plugin p1')
    })

    it('getPlugin should return undefined for unknown', () => {
      expect(usePluginStore.getState().getPlugin('unknown')).toBeUndefined()
    })

    it('getAllPlugins should return all plugins', () => {
      expect(usePluginStore.getState().getAllPlugins()).toHaveLength(2)
    })

    it('getEnabledPlugins should return only enabled', () => {
      expect(usePluginStore.getState().getEnabledPlugins()).toHaveLength(1)
      expect(usePluginStore.getState().getEnabledPlugins()[0].id).toBe('p1')
    })

    it('getCustomNodeTypes should return only enabled node types', () => {
      // p1 is enabled with nt1, p2 is disabled
      expect(usePluginStore.getState().getCustomNodeTypes()).toHaveLength(1)
    })

    it('isNodeTypeEnabled should check correctly', () => {
      expect(usePluginStore.getState().isNodeTypeEnabled('nt1')).toBe(true)
      expect(usePluginStore.getState().isNodeTypeEnabled('nt2')).toBe(false)
      expect(usePluginStore.getState().isNodeTypeEnabled('nt3')).toBe(false)
    })
  })
})
