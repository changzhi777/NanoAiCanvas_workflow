import { useCallback, useState } from 'react';
import { User, Palette } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import {
  generateNanoaiImageWithPolling,
  buildCharacterPrompt,
} from '@/lib/api/suchuang-api';

export interface CharacterDesignerData extends WorkflowNodeData {
  params: {
    characterInfo: string;
    style: string;
    pose: string;
    expression: string;
    background: string;
    viewAngle: string;
  };
}

const CHARACTER_STYLES = [
  { label: '日系动漫', value: 'anime' },
  { label: '写实风格', value: 'realistic' },
  { label: '美漫风格', value: 'comic' },
  { label: 'Q版', value: 'chibi' },
  { label: '水墨风', value: 'ink' },
];

const POSES = [
  { label: '站立', value: 'standing' },
  { label: '坐姿', value: 'sitting' },
  { label: '行走', value: 'walking' },
  { label: '奔跑', value: 'running' },
  { label: '战斗', value: 'fighting' },
];

const EXPRESSIONS = [
  { label: '微笑', value: 'smile' },
  { label: '严肃', value: 'serious' },
  { label: '愤怒', value: 'angry' },
  { label: '悲伤', value: 'sad' },
  { label: '惊讶', value: 'surprised' },
];

const BACKGROUNDS = [
  { label: '简单', value: 'simple' },
  { label: '无', value: 'none' },
  { label: '室内', value: 'indoor' },
  { label: '室外', value: 'outdoor' },
  { label: '抽象', value: 'abstract' },
];

const VIEW_ANGLES = [
  { label: '正面', value: 'front' },
  { label: '侧面', value: 'side' },
  { label: '背面', value: 'back' },
  { label: '俯视', value: 'top' },
  { label: '仰视', value: 'bottom' },
];

export const CharacterDesignerNode = ({ id, data }: NodeProps<CharacterDesignerData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore();
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleExecute = useCallback(async () => {
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined });
      setProgress(0);
      setProgressMessage('设计角色中...');

      // 构建角色设计提示词
      const prompt = buildCharacterPrompt(
        data.params.characterInfo || 'character',
        data.params.style,
        data.params.pose,
        data.params.expression
      );

      // 调用速创API
      const images = await generateNanoaiImageWithPolling(
        {
          prompt,
          size: '2K',
          aspectRatio: '1:1',
        },
        (message, progress) => {
          setProgress(progress);
          setProgressMessage(message);
        }
      );

      // 更新节点状态
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          imageUrl: images[0],
          images,
        },
      });
      setProgress(100);
      setProgressMessage('角色设计完成！');
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '设计失败',
      });
      setProgress(0);
      setProgressMessage('');
    }
  }, [id, data, updateNode]);

  const paramSchema = [
    {
      key: 'characterInfo',
      label: '角色描述',
      type: 'textarea' as const,
      placeholder: '请描述角色的外貌、性格、服装等...',
      required: true,
    },
    {
      key: 'style',
      label: '风格',
      type: 'select' as const,
      options: CHARACTER_STYLES,
      defaultValue: 'anime',
    },
    {
      key: 'pose',
      label: '姿势',
      type: 'select' as const,
      options: POSES,
      defaultValue: 'standing',
    },
    {
      key: 'expression',
      label: '表情',
      type: 'select' as const,
      options: EXPRESSIONS,
      defaultValue: 'smile',
    },
    {
      key: 'background',
      label: '背景',
      type: 'select' as const,
      options: BACKGROUNDS,
      defaultValue: 'simple',
    },
    {
      key: 'viewAngle',
      label: '视角',
      type: 'select' as const,
      options: VIEW_ANGLES,
      defaultValue: 'front',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  return (
    <BaseNode
      data={data}
      icon={<User className="w-5 h-5" />}
      headerAction={
        <button className="p-1 hover:bg-white/50 rounded transition-colors" title="配置">
          <Palette className="w-4 h-4 text-blue-600" />
        </button>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="设计角色" />

      {/* 进度显示 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">{progressMessage}</span>
            <span className="text-sm text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {data.result && data.result.imageUrl && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-800 mb-2">✓ 角色设计完成</div>
          <img src={data.result.imageUrl} alt="角色设计" className="rounded w-full" />
        </div>
      )}
    </BaseNode>
  );
};

export default CharacterDesignerNode;
