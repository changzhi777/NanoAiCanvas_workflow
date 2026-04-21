/**
 * 里程碑节点 - 预览和展示节点
 * 功能：展示角色设计、分镜头、场景等成果
 */

import { memo, useState } from 'react';
import { Flag, Image as ImageIcon, Users, Film, Sparkles } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { getNodeColorScheme, getDarkNodeColorScheme } from './nodeColors';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

interface MilestoneNodeData extends WorkflowNodeData {
  milestoneType?: 'character' | 'storyboard' | 'scene' | 'mixed';
  previewData?: any[];
}

const MilestoneNode = memo((props: { data: MilestoneNodeData }) => {
  const { data } = props;
  const { isDark } = useTheme();
  const colorScheme = isDark
    ? getDarkNodeColorScheme('milestone')
    : getNodeColorScheme('milestone');

  const [activeTab, setActiveTab] = useState<'preview' | 'info'>('preview');
  const milestoneType = data.milestoneType || 'mixed';

  // 根据类型显示不同的图标
  const getIcon = () => {
    switch (milestoneType) {
      case 'character':
        return <Users className="w-5 h-5" />;
      case 'storyboard':
        return <Film className="w-5 h-5" />;
      case 'scene':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <Flag className="w-5 h-5" />;
    }
  };

  // 模拟预览数据
  const mockPreviews = [
    {
      id: 1,
      type: 'character',
      title: '角色三立面',
      description: '正面、侧面、背面视图',
      image: '🧑‍🎤',
      status: 'done'
    },
    {
      id: 2,
      type: 'storyboard',
      title: '分镜头001',
      description: '场景：办公室 - 日景',
      image: '🎬',
      status: 'done'
    }
  ];

  return (
    <BaseNode
      data={data}
      icon={getIcon()}
      headerAction={
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium transition-all',
              activeTab === 'preview'
                ? colorScheme.iconBg + ' text-white'
                : isDark
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-600'
            )}
          >
            预览
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium transition-all',
              activeTab === 'info'
                ? colorScheme.iconBg + ' text-white'
                : isDark
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-600'
            )}
          >
            信息
          </button>
        </div>
      }
    >
      {/* 里程碑说明 */}
      <div className={cn(
        'p-3 rounded-lg border mb-3',
        isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-orange-400' : 'text-orange-700'
          )}>
            里程碑 - 成果展示节点
          </span>
        </div>
        <div className={cn(
          'text-xs',
          isDark ? 'text-orange-300/80' : 'text-orange-600/80'
        )}>
          <p>• 角色设计：三立面 + 头像</p>
          <p>• 分镜头：线稿风格场景 + 人物</p>
          <p>• 场景设计：环境氛围展示</p>
        </div>
      </div>

      {/* 预览/信息切换 */}
      {activeTab === 'preview' ? (
        <div className="space-y-3">
          <div className={cn(
            'p-3 rounded-lg border',
            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          )}>
            <h4 className={cn(
              'text-sm font-semibold mb-2',
              isDark ? 'text-white' : 'text-gray-700'
            )}>
              预览展示
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {mockPreviews.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative group cursor-pointer rounded-lg overflow-hidden',
                    'border-2 transition-all duration-200',
                    isDark
                      ? 'border-white/10 hover:border-blue-500/50'
                      : 'border-gray-200 hover:border-blue-300'
                  )}
                >
                  {/* 预览图片区域 */}
                  <div className={cn(
                    'aspect-square flex items-center justify-center text-4xl',
                    isDark ? 'bg-white/5' : 'bg-gray-100'
                  )}>
                    {item.image}
                  </div>

                  {/* 悬停时显示信息 */}
                  <div className={cn(
                    'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                    'flex items-end p-2'
                  )}>
                    <div className="text-white text-xs">
                      <div className="font-medium">{item.title}</div>
                      <div className="opacity-80 text-[10px]">{item.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={cn(
            'p-3 rounded-lg border',
            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          )}>
            <h4 className={cn(
              'text-sm font-semibold mb-2',
              isDark ? 'text-white' : 'text-gray-700'
            )}>
              里程碑信息
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>类型:</span>
                <span className={cn(
                  'font-medium',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  {milestoneType === 'character' ? '角色设计' :
                   milestoneType === 'storyboard' ? '分镜头' :
                   milestoneType === 'scene' ? '场景' : '混合'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>状态:</span>
                <span className={cn(
                  'font-medium',
                  data.status === 'success' ? 'text-green-500' :
                  data.status === 'running' ? 'text-blue-500' :
                  'text-gray-500'
                )}>
                  {data.status === 'success' ? '已完成' :
                   data.status === 'running' ? '进行中' : '待处理'}
                </span>
              </div>
              {data.result && (
                <div className="pt-2 border-t border-gray-200/50">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    生成结果: {data.result.images?.length || 0} 项
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
});

MilestoneNode.displayName = 'MilestoneNode';

export default MilestoneNode;
