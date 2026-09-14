import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { Button } from '@/components/ui/button';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = React.useState<'quickstart' | 'shortcuts' | 'nodes' | 'features'>('quickstart');

  const shortcuts = [
    { key: 'Meta + T', description: '打开模板对话框' },
    { key: 'Meta + Shift + X', description: '清空工作流' },
    { key: 'Escape', description: '关闭对话框/取消操作' },
    { key: 'Delete / Backspace', description: '删除选中的节点' },
    { key: 'Meta + S', description: '保存当前工作流' },
    { key: 'Meta + E', description: '执行工作流' },
  ];

  const features = [
    {
      title: '节点拖拽',
      description: '从侧边栏拖拽节点到画布，自由组合工作流',
      icon: '🎨',
    },
    {
      title: '智能连线',
      description: '连接节点输出端口到下游节点输入端口，建立数据流',
      icon: '🔗',
    },
    {
      title: '模板系统',
      description: '提供预置模板，一键加载常用工作流配置',
      icon: '📋',
    },
    {
      title: '实时执行',
      description: '执行工作流并实时查看每个节点的运行状态和结果',
      icon: '⚡',
    },
    {
      title: '版本管理',
      description: '保存工作流版本快照，随时回溯到历史版本',
      icon: '📚',
    },
    {
      title: '导入导出',
      description: '导出工作流为JSON文件，或从文件导入工作流',
      icon: '📦',
    },
  ];

  const nodeTypes = [
    { type: 'input_text', name: '文本输入', description: '输入文案或描述文本' },
    { type: 'script_generator', name: '脚本生成', description: '使用GLM-5生成脚本内容' },
    { type: 'storyboard_generator', name: '分镜头生成', description: '生成故事板分镜图片' },
    { type: 'dialogue_generator', name: '对白生成', description: '生成角色对白音频' },
    { type: 'character_designer', name: '角色设计', description: '生成角色设计图' },
    { type: 'scene_designer', name: '场景设计', description: '生成场景设计图' },
    { type: 'output_preview', name: '预览输出', description: '预览生成的内容' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-3xl dialog-glass rounded-3xl'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            'text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
            isDark ? 'from-blue-400 to-cyan-400' : 'from-blue-600 to-cyan-600'
          )}>
            帮助中心
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : ''}>
            了解如何使用 NanoAI Workflow 工作流系统
          </DialogDescription>
        </DialogHeader>

        {/* Tab 按钮 */}
        <div className={cn(
          'flex gap-2 mb-4',
          isDark ? 'bg-slate-800 p-1 rounded-lg' : 'bg-gray-100 p-1 rounded-lg'
        )}>
          {[
            { value: 'quickstart', label: '快速开始' },
            { value: 'shortcuts', label: '快捷键' },
            { value: 'nodes', label: '节点类型' },
            { value: 'features', label: '功能特性' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.value as any)}
              className={cn(
                'flex-1',
                activeTab === tab.value
                  ? isDark
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-gray-900 shadow'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className={cn(
          'h-[400px] overflow-y-auto rounded-lg p-4',
          isDark ? 'bg-slate-800/50' : 'bg-gray-50'
        )}>
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div>
                <h3 className={cn(
                  'text-lg font-semibold mb-3',
                  isDark ? 'text-slate-200' : 'text-gray-900'
                )}>
                  🚀 3步创建你的第一个工作流
                </h3>
                <div className="space-y-3">
                  <Step
                    number={1}
                    title="选择模板或创建空白画布"
                    description="按 Meta+T 打开模板对话框，选择预置模板，或在空白画布上自由创作"
                    isDark={isDark}
                  />
                  <Step
                    number={2}
                    title="添加和连接节点"
                    description="从侧边栏拖拽节点到画布，连接输出端口到输入端口建立数据流"
                    isDark={isDark}
                  />
                  <Step
                    number={3}
                    title="配置参数并执行"
                    description="设置每个节点的参数，点击工具栏的「执行工作流」按钮开始运行"
                    isDark={isDark}
                  />
                </div>
              </div>

              <div className={cn(
                'p-4 rounded-lg border',
                isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'
              )}>
                <h4 className={cn(
                  'font-semibold mb-2 flex items-center gap-2',
                  isDark ? 'text-slate-200' : ''
                )}>
                  💡 小贴士
                </h4>
                <ul className={cn(
                  'text-sm space-y-1',
                  isDark ? 'text-slate-300' : 'text-gray-700'
                )}>
                  <li>• 节点参数改变后会自动触发下游节点重新执行</li>
                  <li>• 可以保存常用工作流为自定义模板</li>
                  <li>• 版本历史功能帮你回溯到任意历史状态</li>
                  <li>• 导出工作流JSON文件可以在团队成员间共享</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isDark
                      ? 'bg-slate-700/50 border-white/5'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <span className={cn(
                    'text-sm',
                    isDark ? 'text-slate-300' : 'text-gray-700'
                  )}>
                    {shortcut.description}
                  </span>
                  <kbd className={cn(
                    'px-3 py-1 text-xs font-mono rounded',
                    isDark
                      ? 'bg-slate-600 text-slate-200 border border-slate-500'
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  )}>
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-2">
              {nodeTypes.map((node, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-3 rounded-lg border',
                    isDark
                      ? 'bg-slate-700/50 border-white/5'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={cn(
                      'font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}>
                      {node.name}
                    </h4>
                    <code className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      isDark
                        ? 'bg-slate-600 text-slate-300'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {node.type}
                    </code>
                  </div>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    {node.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border',
                    isDark
                      ? 'bg-slate-700/50 border-white/5'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h4 className={cn(
                    'font-semibold mb-1',
                    isDark ? 'text-slate-200' : 'text-gray-900'
                  )}>
                    {feature.title}
                  </h4>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  isDark: boolean;
}

function Step({ number, title, description, isDark }: StepProps) {
  return (
    <div className="flex gap-3">
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        isDark
          ? 'bg-blue-600 text-white'
          : 'bg-blue-500 text-white'
      )}>
        {number}
      </div>
      <div className="flex-1">
        <h4 className={cn(
          'font-semibold mb-1',
          isDark ? 'text-slate-200' : 'text-gray-900'
        )}>
          {title}
        </h4>
        <p className={cn(
          'text-sm',
          isDark ? 'text-slate-400' : 'text-gray-600'
        )}>
          {description}
        </p>
      </div>
    </div>
  );
}
