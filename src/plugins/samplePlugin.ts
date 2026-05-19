/**
 * 示例插件：文本处理工具集
 * 演示如何使用插件API创建自定义节点类型
 */

import { Plugin, PluginNodeType } from '@/types/plugin';

/**
 * 文本反转节点
 */
const textReverserNode: PluginNodeType = {
  type: 'text_reverser',
  name: '文本反转',
  category: 'processing',
  description: '将输入的文本反转',
  icon: '🔄',
  inputs: [
    {
      id: 'input',
      name: '输入文本',
      type: 'text',
      required: true,
      description: '要反转的文本',
    },
  ],
  outputs: [
    {
      id: 'output',
      name: '反转结果',
      type: 'text',
      description: '反转后的文本',
      required: true,
    },
  ],
  params: [],
  execute: async (_params, inputs) => {
    const text = inputs.input || '';
    return {
      output: text.split('').reverse().join(''),
    };
  },
};

/**
 * 文本统计节点
 */
const textStatsNode: PluginNodeType = {
  type: 'text_stats',
  name: '文本统计',
  category: 'processing',
  description: '统计文本的字符数、单词数等信息',
  icon: '📊',
  inputs: [
    {
      id: 'input',
      name: '输入文本',
      type: 'text',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'stats',
      name: '统计结果',
      type: 'json',
      required: true,
    },
  ],
  params: [
    {
      name: 'includeSpaces',
      type: 'boolean',
      label: '包含空格',
      description: '统计时是否包含空格',
      defaultValue: true,
    },
  ],
  execute: async (params, inputs) => {
    const text = inputs.input || '';
    const includeSpaces = params.includeSpaces !== false;

    let charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const lineCount = text.split('\n').length;

    if (!includeSpaces) {
      charCount = text.replace(/\s/g, '').length;
    }

    return {
      stats: {
        charCount,
        wordCount,
        lineCount,
        byteCount: new Blob([text]).size,
      },
    };
  },
};

/**
 * 文本拼接节点
 */
const textConcatNode: PluginNodeType = {
  type: 'text_concat',
  name: '文本拼接',
  category: 'processing',
  description: '将多个文本拼接在一起',
  icon: '🔗',
  inputs: [
    {
      id: 'text1',
      name: '文本1',
      type: 'text',
      required: true,
    },
    {
      id: 'text2',
      name: '文本2',
      type: 'text',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'output',
      name: '拼接结果',
      type: 'text',
      required: true,
    },
  ],
  params: [
    {
      name: 'separator',
      type: 'text',
      label: '分隔符',
      description: '文本之间的分隔符',
      defaultValue: ' ',
    },
  ],
  execute: async (params, inputs) => {
    const text1 = inputs.text1 || '';
    const text2 = inputs.text2 || '';
    const separator = params.separator || ' ';

    return {
      output: text1 + separator + text2,
    };
  },
};

/**
 * 示例插件定义
 */
export const textProcessingPlugin: Plugin = {
  id: 'text-processing-tools',
  name: '文本处理工具集',
  description: '提供常用的文本处理功能，包括反转、统计、拼接等',
  version: '1.0.0',
  author: 'NanoAI Team',
  enabled: true,
  installedAt: new Date().toISOString(),
  nodeTypes: [textReverserNode, textStatsNode, textConcatNode],
};

/**
 * 安装示例插件的辅助函数
 */
export function installSamplePlugin() {
  // 这个函数可以在开发控制台中调用，用于快速测试插件
  if (typeof window !== 'undefined' && (window as any).usePluginStore) {
    const store = (window as any).usePluginStore.getState();
    store.registerPlugin(textProcessingPlugin);
    // plugin installed
  }
}
