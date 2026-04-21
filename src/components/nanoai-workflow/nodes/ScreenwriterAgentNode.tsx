/**
 * 编剧Agent节点 - 创意逻辑处理节点
 * 功能：创意生成、内容优化、质量评估
 */

import { memo } from 'react';
import { PenTool, Lightbulb, Wand2 } from 'lucide-react';
import { BaseNode, ExecuteButton, ParamEditor } from './BaseNode';
import type { WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { getNodeColorScheme, getDarkNodeColorScheme } from './nodeColors';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

interface ScreenwriterAgentNodeData extends WorkflowNodeData {
  creativeMode?: 'enhance' | 'polish' | 'evaluate';
}

const ScreenwriterAgentNode = memo((props: { data: ScreenwriterAgentNodeData }) => {
  const { data } = props;
  const { isDark } = useTheme();
  const colorScheme = isDark
    ? getDarkNodeColorScheme('screenwriter_agent')
    : getNodeColorScheme('screenwriter_agent');

  // 参数配置
  const paramSchema = [
    {
      key: 'creativeMode',
      label: '创意模式',
      type: 'select' as const,
      defaultValue: 'enhance',
      options: [
        { label: '增强创意', value: 'enhance' },
        { label: '内容优化', value: 'polish' },
        { label: '质量评估', value: 'evaluate' }
      ],
      description: '选择创意处理方式'
    },
    {
      key: 'styleGuide',
      label: '风格指南',
      type: 'text' as const,
      placeholder: '例如：科幻、幽默、正式',
      description: '指定内容风格（可选）'
    },
    {
      key: 'qualityThreshold',
      label: '质量阈值',
      type: 'number' as const,
      defaultValue: 80,
      description: '通过质量评估的最低分数（0-100）'
    }
  ];

  return (
    <BaseNode
      data={data}
      icon={<PenTool className="w-5 h-5" />}
      headerAction={
        <div className={cn('px-2 py-1 rounded-md', colorScheme.iconBg)}>
          <Wand2 className="w-4 h-4" style={{ color: colorScheme.iconText }} />
        </div>
      }
    >
      {/* 创意逻辑说明 */}
      <div className={cn(
        'p-3 rounded-lg border mb-3',
        isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-green-500" />
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-green-400' : 'text-green-700'
          )}>
            编剧Agent - 创意处理节点
          </span>
        </div>
        <div className={cn(
          'text-xs space-y-1',
          isDark ? 'text-green-300/80' : 'text-green-600/80'
        )}>
          <p>• 创意增强：提升内容创意度</p>
          <p>• 内容优化：改进表达和流畅性</p>
          <p>• 质量评估：自动评分和建议</p>
        </div>
      </div>

      <ParamEditor
        params={data.params || {}}
        onChange={(newParams) => {
          console.log('更新参数:', newParams);
        }}
        schema={paramSchema}
      />

      <ExecuteButton
        onExecute={() => {
          console.log('执行编剧Agent处理');
        }}
        status={data.status}
        label="执行处理"
      />
    </BaseNode>
  );
});

ScreenwriterAgentNode.displayName = 'ScreenwriterAgentNode';

export default ScreenwriterAgentNode;
