import { useCallback, useState } from 'react';
import { Mountain, Sun } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import {
  generateNanoaiImageWithPolling,
  buildScenePrompt,
} from '@/lib/api/suchuang-api';

export interface SceneDesignerData extends WorkflowNodeData {
  params: {
    sceneDescription: string;
    style: string;
    timeOfDay: string;
    weather: string;
    mood: string;
    angle: string;
  };
}

const SCENE_STYLES = [
  { label: '写实摄影', value: 'photorealistic' },
  { label: '油画风格', value: 'oilpainting' },
  { label: '水彩风格', value: 'watercolor' },
  { label: '赛博朋克', value: 'cyberpunk' },
  { label: '蒸汽朋克', value: 'steampunk' },
  { label: '奇幻风格', value: 'fantasy' },
];

const TIMES_OF_DAY = [
  { label: '黎明', value: 'dawn' },
  { label: '早晨', value: 'morning' },
  { label: '中午', value: 'noon' },
  { label: '黄昏', value: 'dusk' },
  { label: '夜晚', value: 'night' },
];

const WEATHERS = [
  { label: '晴朗', value: 'sunny' },
  { label: '多云', value: 'cloudy' },
  { label: '雨天', value: 'rainy' },
  { label: '雪天', value: 'snowy' },
  { label: '雾天', value: 'foggy' },
  { label: '风暴', value: 'stormy' },
];

const MOODS = [
  { label: '温馨', value: 'warm' },
  { label: '神秘', value: 'mysterious' },
  { label: '紧张', value: 'tense' },
  { label: '宁静', value: 'peaceful' },
  { label: '史诗', value: 'epic' },
  { label: '恐怖', value: 'horror' },
];

const ANGLES = [
  { label: '平视', value: 'eyelevel' },
  { label: '俯视', value: 'highangle' },
  { label: '仰视', value: 'lowangle' },
  { label: '鸟瞰', value: 'birdseye' },
  { label: '虫视', value: 'wormseye' },
];

export const SceneDesignerNode = ({ id, data }: NodeProps<SceneDesignerData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore();
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleExecute = useCallback(async () => {
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined });
      setProgress(0);
      setProgressMessage('设计场景中...');

      // 构建场景设计提示词
      const prompt = buildScenePrompt(
        data.params.sceneDescription || 'scene',
        data.params.style,
        data.params.timeOfDay,
        data.params.weather,
        data.params.mood
      );

      // 调用速创API
      const images = await generateNanoaiImageWithPolling(
        {
          prompt,
          size: '2K',
          aspectRatio: '16:9',
        },
        (message, progress) => {
          setProgressMessage(message);
          setProgress(progress);
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
      setProgressMessage('场景设计完成！');
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
      key: 'sceneDescription',
      label: '场景描述',
      type: 'textarea' as const,
      placeholder: '请描述场景的环境、氛围、细节等...',
      required: true,
    },
    {
      key: 'style',
      label: '风格',
      type: 'select' as const,
      options: SCENE_STYLES,
      defaultValue: 'photorealistic',
    },
    {
      key: 'timeOfDay',
      label: '时间',
      type: 'select' as const,
      options: TIMES_OF_DAY,
      defaultValue: 'morning',
    },
    {
      key: 'weather',
      label: '天气',
      type: 'select' as const,
      options: WEATHERS,
      defaultValue: 'sunny',
    },
    {
      key: 'mood',
      label: '氛围',
      type: 'select' as const,
      options: MOODS,
      defaultValue: 'warm',
    },
    {
      key: 'angle',
      label: '视角',
      type: 'select' as const,
      options: ANGLES,
      defaultValue: 'eyelevel',
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params);
  }, [id, updateNodeParams]);

  return (
    <BaseNode
      data={data}
      icon={<Mountain className="w-5 h-5" />}
      headerAction={
        <button className="p-1 hover:bg-white/50 rounded transition-colors" title="配置">
          <Sun className="w-4 h-4 text-blue-600" />
        </button>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="设计场景" />

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
          <div className="text-sm font-semibold text-blue-800 mb-2">✓ 场景设计完成</div>
          <img src={data.result.imageUrl} alt="场景设计" className="rounded w-full" />
        </div>
      )}
    </BaseNode>
  );
};

export default SceneDesignerNode;
