import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Plugin, PluginNodeType, PluginState } from '@/types/plugin';

interface PluginStore extends PluginState {
  // 内部状态
  _plugins: Record<string, Plugin>;
  _customNodeTypes: Record<string, PluginNodeType>;

  // Actions
  registerPlugin: (plugin: Plugin) => void;
  unregisterPlugin: (pluginId: string) => void;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  getPlugin: (pluginId: string) => Plugin | undefined;
  getAllPlugins: () => Plugin[];
  getEnabledPlugins: () => Plugin[];
  getCustomNodeTypes: () => PluginNodeType[];
  isNodeTypeEnabled: (nodeType: string) => boolean;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      _plugins: {},
      _customNodeTypes: {},
      plugins: [],
      customNodeTypes: [],

      registerPlugin: (plugin) => {
        set((state) => {
          // 验证插件ID唯一性
          if (state._plugins[plugin.id]) {
            console.warn(`Plugin ${plugin.id} already registered, skipping...`);
            return state;
          }

          // 注册插件
          const newPlugins = {
            ...state._plugins,
            [plugin.id]: {
              ...plugin,
              installedAt: new Date().toISOString(),
            },
          };

          // 注册所有节点类型
          const newNodeTypes = { ...state._customNodeTypes };
          plugin.nodeTypes.forEach((nodeType) => {
            newNodeTypes[nodeType.type] = nodeType;
          });

          // 更新列表
          const pluginsList = Object.values(newPlugins);
          const nodeTypesList = Object.values(newNodeTypes);

          console.log(`Plugin ${plugin.id} registered successfully with ${plugin.nodeTypes.length} node types`);

          return {
            _plugins: newPlugins,
            _customNodeTypes: newNodeTypes,
            plugins: pluginsList,
            customNodeTypes: nodeTypesList,
          };
        });
      },

      unregisterPlugin: (pluginId) => {
        set((state) => {
          const plugin = state._plugins[pluginId];
          if (!plugin) {
            console.warn(`Plugin ${pluginId} not found`);
            return state;
          }

          // 移除插件
          const newPlugins = { ...state._plugins };
          delete newPlugins[pluginId];

          // 移除相关节点类型
          const newNodeTypes = { ...state._customNodeTypes };
          plugin.nodeTypes.forEach((nodeType) => {
            delete newNodeTypes[nodeType.type];
          });

          // 更新列表
          const pluginsList = Object.values(newPlugins);
          const nodeTypesList = Object.values(newNodeTypes);

          console.log(`Plugin ${pluginId} unregistered successfully`);

          return {
            _plugins: newPlugins,
            _customNodeTypes: newNodeTypes,
            plugins: pluginsList,
            customNodeTypes: nodeTypesList,
          };
        });
      },

      enablePlugin: (pluginId) => {
        set((state) => {
          const plugin = state._plugins[pluginId];
          if (!plugin) return state;

          const newPlugins = {
            ...state._plugins,
            [pluginId]: { ...plugin, enabled: true },
          };

          return {
            _plugins: newPlugins,
            plugins: Object.values(newPlugins),
          };
        });
      },

      disablePlugin: (pluginId) => {
        set((state) => {
          const plugin = state._plugins[pluginId];
          if (!plugin) return state;

          const newPlugins = {
            ...state._plugins,
            [pluginId]: { ...plugin, enabled: false },
          };

          return {
            _plugins: newPlugins,
            plugins: Object.values(newPlugins),
          };
        });
      },

      getPlugin: (pluginId) => {
        return get()._plugins[pluginId];
      },

      getAllPlugins: () => {
        return Object.values(get()._plugins);
      },

      getEnabledPlugins: () => {
        return Object.values(get()._plugins).filter((p) => p.enabled);
      },

      getCustomNodeTypes: () => {
        return get().getEnabledPlugins().flatMap((p) => p.nodeTypes);
      },

      isNodeTypeEnabled: (nodeType) => {
        const nodeTypes = get().getCustomNodeTypes();
        return nodeTypes.some((nt) => nt.type === nodeType);
      },
    }),
    {
      name: 'plugin-storage',
      partialize: (state) => ({
        _plugins: state._plugins,
        _customNodeTypes: state._customNodeTypes,
      }),
    }
  )
);
