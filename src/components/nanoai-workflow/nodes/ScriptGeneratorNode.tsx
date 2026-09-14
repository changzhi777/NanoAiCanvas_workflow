import { useCallback, useEffect } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';

export interface ScriptGeneratorData extends WorkflowNodeData {
  params: {
    inputText: string;
    style: string;
    model: 'glm-5' | 'glm-4';
    temperature: number;
    maxLength: number;
  };
}

const SCRIPT_STYLES = [
  { label: '现代都市', value: 'modern' },
  { label: '古代武侠', value: 'wuxia' },
  { label: '科幻未来', value: 'scifi' },
  { label: '童话奇幻', value: 'fantasy' },
  { label: '悬疑推理', value: 'mystery' },
];

const SCRIPT_MODELS = [
  { label: 'GLM-5（推荐）', value: 'glm-5' },
  { label: 'GLM-4', value: 'glm-4' },
];

export const ScriptGeneratorNode = ({ id, data }: NodeProps<ScriptGeneratorData>) => {
  const { updateNodeParams, executeNode } = useNanoaiWorkflowStore();

  // 参数配置
  const paramSchema = [
    {
      key: 'inputText',
      label: '输入文案',
      type: 'textarea' as const,
      placeholder: '请输入故事梗概或创作灵感...',
      required: true,
    },
    {
      key: 'style',
      label: '风格选择',
      type: 'select' as const,
      options: SCRIPT_STYLES,
      defaultValue: 'modern',
    },
    {
      key: 'model',
      label: '模型选择',
      type: 'select' as const,
      options: SCRIPT_MODELS,
      defaultValue: 'glm-5',
    },
    {
      key: 'temperature',
      label: '创意程度',
      type: 'number' as const,
      defaultValue: 0.7,
      description: '0-1之间，越高越有创意',
    },
    {
      key: 'maxLength',
      label: '最大长度',
      type: 'number' as const,
      defaultValue: 2000,
      description: '脚本最大字符数',
    },
  ];

  // 处理参数变化（实时响应）
  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  // 当参数变化时自动重新执行（如果节点已成功执行过）
  useEffect(() => {
    if (data.status === NodeStatus.SUCCESS && data.params.inputText) {
      const timer = setTimeout(() => {
        executeNode(id);
      }, 800); // 防抖 800ms

      return () => clearTimeout(timer);
    }
  }, [data.params, data.status, id, executeNode]);

  // 执行节点
  const handleExecute = useCallback(() => {
    executeNode(id);
  }, [id, executeNode]);

  return (
    <BaseNode
      data={data}
      icon={<FileText className="w-4 h-4" />}
      headerAction={
        <button
          className="p-1 hover:bg-white/50 rounded transition-colors"
          title="配置选项"
        >
          <Sparkles className="w-4 h-4 text-blue-600" />
        </button>
      }
    >
      {/* 参数编辑器 */}
      <ParamEditor
        params={data.params}
        onChange={handleParamsChange}
        schema={paramSchema}
      />

      {/* 执行按钮 */}
      <ExecuteButton
        onExecute={handleExecute}
        status={data.status}
        label="生成脚本"
      />

      {/* 结果预览 */}
      {data.result && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-2">✓ 脚本生成成功</div>
          <div className="text-xs text-gray-600">
            {data.result.scenes?.length || 0} 个场景 · {data.result.characters?.length || 0} 个角色
          </div>
        </div>
      )}
    </BaseNode>
  );
};

export default ScriptGeneratorNode;
