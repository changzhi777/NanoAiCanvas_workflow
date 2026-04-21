/**
 * 插件系统类型定义
 * 支持用户自定义节点类型和功能扩展
 */

/** 节点端口定义 */
export interface PluginNodePort {
  id: string;
  name: string;
  type: 'text' | 'image' | 'audio' | 'json' | 'array' | 'any';
  required: boolean;
  description?: string;
}

/** 节点参数定义 */
export interface PluginNodeParam {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'code';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  required?: boolean;
  placeholder?: string;
}

/** 自定义节点类型定义 */
export interface PluginNodeType {
  /** 节点类型ID（唯一标识） */
  type: string;

  /** 节点显示名称 */
  name: string;

  /** 节点分类 */
  category: 'ai' | 'io' | 'processing' | 'custom';

  /** 节点描述 */
  description?: string;

  /** 节点图标（emoji或图标名称） */
  icon?: string;

  /** 输入端口定义 */
  inputs: PluginNodePort[];

  /** 输出端口定义 */
  outputs: PluginNodePort[];

  /** 参数定义 */
  params: PluginNodeParam[];

  /** 节点执行函数 */
  execute: (params: Record<string, any>, inputs: Record<string, any>) => Promise<any>;

  /** 自定义渲染组件（可选） */
  component?: React.ComponentType<any>;

  /** 节点颜色主题 */
  color?: string;

  /** 插件元数据 */
  metadata?: {
    author?: string;
    version?: string;
    homepage?: string;
    license?: string;
  };
}

/** 插件定义 */
export interface Plugin {
  /** 插件ID */
  id: string;

  /** 插件名称 */
  name: string;

  /** 插件描述 */
  description?: string;

  /** 插件版本 */
  version: string;

  /** 插件作者 */
  author?: string;

  /** 插件包含的节点类型 */
  nodeTypes: PluginNodeType[];

  /** 插件启用状态 */
  enabled: boolean;

  /** 安装时间 */
  installedAt: string;
}

/** 插件状态 */
export interface PluginState {
  plugins: Plugin[];
  customNodeTypes: PluginNodeType[];

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

/** 插件上下文 - 提供给插件执行的API */
export interface PluginContext {
  /** 获取节点数据 */
  getNodeData: (nodeId: string) => any;

  /** 更新节点数据 */
  updateNodeData: (nodeId: string, data: any) => void;

  /** 获取连接的节点 */
  getConnectedNodes: (nodeId: string) => any[];

  /** 日志输出 */
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;

  /** 进度报告 */
  reportProgress: (progress: number, message?: string) => void;
}
