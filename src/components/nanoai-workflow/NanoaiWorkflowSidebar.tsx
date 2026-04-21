import { useState, useEffect } from 'react';
import { useNanoaiWorkflowStore, WorkflowNodeType } from '@/stores/nanoaiWorkflowStore';
import {
  FileText,
  Film,
  Mic,
  User,
  Mountain,
  Plus,
  Search,
  Star,
  Clock,
  ChevronDown,
  ChevronRight,
  Brain,
  PenTool,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useTheme } from './ui/Theme';
import { useToast } from '@/hooks/useToast';

interface NodeTypeConfig {
  type: WorkflowNodeType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'input' | 'ai' | 'output';
  tags?: string[];
  isNew?: boolean;
  popular?: boolean;
}

const NODE_TYPES: NodeTypeConfig[] = [
  {
    type: WorkflowNodeType.SCRIPT_GENERATOR,
    label: '脚本生成',
    icon: <FileText className="w-5 h-5" />,
    description: '生成故事脚本',
    category: 'ai',
    tags: ['文本'],
    popular: true,
  },
  {
    type: WorkflowNodeType.STORYBOARD_GENERATOR,
    label: '分镜头生成',
    icon: <Film className="w-5 h-5" />,
    description: '生成分镜图片',
    category: 'ai',
    tags: ['图片'],
    popular: true,
  },
  {
    type: WorkflowNodeType.DIALOGUE_GENERATOR,
    label: '对白生成',
    icon: <Mic className="w-5 h-5" />,
    description: '生成语音',
    category: 'ai',
    tags: ['音频'],
  },
  {
    type: WorkflowNodeType.CHARACTER_DESIGNER,
    label: '角色设计',
    icon: <User className="w-5 h-5" />,
    description: '生成角色设计图',
    category: 'ai',
    tags: ['图片', '角色'],
    popular: true,
  },
  {
    type: WorkflowNodeType.SCENE_DESIGNER,
    label: '场景设计',
    icon: <Mountain className="w-5 h-5" />,
    description: '生成场景设计图',
    category: 'ai',
    tags: ['图片', '场景'],
    isNew: true,
  },
  {
    type: WorkflowNodeType.DIRECTOR_AGENT,
    label: '导演Agent',
    icon: <Brain className="w-5 h-5" />,
    description: '智能决策和流程控制',
    category: 'ai',
    tags: ['决策', '逻辑'],
    isNew: true,
  },
  {
    type: WorkflowNodeType.SCREENWRITER_AGENT,
    label: '编剧Agent',
    icon: <PenTool className="w-5 h-5" />,
    description: '创意处理和内容优化',
    category: 'ai',
    tags: ['创意', '优化'],
    isNew: true,
  },
  {
    type: WorkflowNodeType.MILESTONE,
    label: '里程碑',
    icon: <Flag className="w-5 h-5" />,
    description: '预览成果展示',
    category: 'output',
    tags: ['预览', '展示'],
    isNew: true,
  },
];

interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  nodes: NodeTypeConfig[];
  onAddNode: (type: WorkflowNodeType) => void;
  defaultExpanded?: boolean;
}

function CategorySection({
  title,
  icon,
  nodes,
  onAddNode,
  defaultExpanded = true,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isDark } = useTheme();

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 w-full p-2 rounded-lg transition-all duration-200',
          isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
        )}
      >
        {isExpanded ? (
          <ChevronDown className={cn(
            'w-4 h-4',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )} />
        ) : (
          <ChevronRight className={cn(
            'w-4 h-4',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )} />
        )}
        <div className="flex items-center gap-2 flex-1">
          <div className={cn(
            isDark ? 'text-blue-400' : 'text-blue-600'
          )}>{icon}</div>
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-slate-200' : 'text-gray-700'
          )}>{title}</span>
          <span className={cn(
            'text-xs ml-auto',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            ({nodes.length})
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {nodes.map((nodeType) => (
            <button
              key={nodeType.type}
              onClick={() => onAddNode(nodeType.type)}
              className={cn(
                'w-full p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-xl',
                'hover:shadow-md',
                'text-left group relative overflow-hidden',
                isDark
                  ? 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
                  : 'border-[#3ecf8e]-200 hover:border-[#3ecf8e]-400 hover:bg-gradient-to-r hover:from-[#3ecf8e]-50 hover:to-[#00c573]-50'
              )}
            >
              {/* 背景装饰 */}
              <div className={cn(
                'absolute inset-0 bg-gradient-to-r transition-all duration-300',
                isDark
                  ? 'from-[#3ecf8e]-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-[#3ecf8e]-500/10 group-hover:via-cyan-500/10 group-hover:to-blue-500/10'
                  : 'from-[#3ecf8e]-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-[#3ecf8e]-500/5 group-hover:via-cyan-500/5 group-hover:to-blue-500/5'
              )} />

              {/* 内容 */}
              <div className="relative flex items-start gap-3">
                <div className={cn(
                  'group-hover:scale-110 transition-all duration-200',
                  isDark
                    ? 'text-blue-400 group-hover:text-blue-300'
                    : 'text-blue-600 group-hover:text-blue-700'
                )}>
                  {nodeType.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'font-medium text-sm',
                      isDark ? 'text-slate-100' : 'text-gray-800'
                    )}>
                      {nodeType.label}
                    </span>

                    {/* 标签 */}
                    <div className="flex gap-1">
                      {nodeType.popular && (
                        <span className={cn(
                          'flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full',
                          isDark
                            ? 'text-yellow-400 bg-yellow-900/30'
                            : 'text-yellow-600 bg-yellow-50'
                        )}>
                          <Star className="w-2.5 h-2.5 fill-current" />
                          热门
                        </span>
                      )}
                      {nodeType.isNew && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          isDark
                            ? 'text-green-400 bg-green-900/30'
                            : 'text-green-600 bg-green-50'
                        )}>
                          NEW
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={cn(
                    'text-xs line-clamp-1',
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  )}>
                    {nodeType.description}
                  </p>

                  {/* 标签 */}
                  {nodeType.tags && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {nodeType.tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            isDark
                              ? 'text-slate-400 bg-slate-800'
                              : 'text-gray-500 bg-gray-100'
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 添加按钮 */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'border-2 transition-all duration-200',
                    'group-hover:scale-110',
                    isDark
                      ? 'bg-slate-900 border-white/10 group-hover:border-white/20 group-hover:bg-white/5'
                      : 'bg-white border-[#3ecf8e]-200 group-hover:border-[#3ecf8e]-400 group-hover:bg-blue-50'
                  )}>
                    <Plus className={cn(
                      'w-4 h-4',
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NanoaiWorkflowSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function NanoaiWorkflowSidebar({
  isCollapsed = false,
  onToggle,
}: NanoaiWorkflowSidebarProps) {
  const { addNode } = useNanoaiWorkflowStore();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // 从 localStorage 恢复折叠状态
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved && onToggle) {
      const collapsed = JSON.parse(saved);
      // 只在初始加载时同步状态
      if (collapsed !== isCollapsed) {
        onToggle();
      }
    }
  }, []);

  // 保存折叠状态到 localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const handleAddNode = (nodeType: WorkflowNodeType) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: NODE_TYPES.find(n => n.type === nodeType)?.label || nodeType,
        params: {},
        inputs: [],
        outputs: [],
        status: 'idle' as any,
      },
      draggable: true,
      // 添加入场动画类名
      className: 'animate-node-enter',
    };
    addNode(newNode);
    const nodeLabel = NODE_TYPES.find(n => n.type === nodeType)?.label || nodeType;
    toast.success(`已添加节点：${nodeLabel}`);
  };

  // 过滤节点
  const filteredNodes = NODE_TYPES.filter(node =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const aiNodes = filteredNodes.filter(n => n.category === 'ai');

  return (
    <div className={cn(
      'flex flex-col shadow-lg border-r backdrop-blur-xl transition-all duration-300 ease-in-out',
      // 不使用 fixed 定位，在 flex 容器中正常布局
      'h-full',
      isDark
        ? 'bg-slate-900/80 border-white/10'
        : 'bg-white border-gray-200',
      // 可折叠宽度
      isCollapsed ? 'w-16' : 'w-72'
    )}>
      {/* 头部 */}
      <div className={cn(
        'p-4 border-b bg-gradient-to-r backdrop-blur-xl transition-all duration-300',
        isDark
          ? 'border-white/10 from-[#3ecf8e]-900/40 to-[#00c573]-900/40'
          : 'border-gray-200 from-[#3ecf8e]-50 to-[#00c573]-50',
        isCollapsed ? 'p-2' : ''
      )}>
        <div className={cn(
          'flex items-center gap-2 mb-3 transition-all duration-300',
          isCollapsed ? 'justify-center' : ''
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3ecf8e]-500 to-[#00c573]-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-200">
              <h2 className={cn(
                'text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent',
                isDark
                  ? 'from-[#3ecf8e]-400 to-[#00c573]-400'
                  : 'from-[#3ecf8e]-600 to-[#00c573]-600'
              )}>
                节点库
              </h2>
              <p className={cn(
                'text-xs',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>拖拽或点击添加节点</p>
            </div>
          )}
        </div>

        {/* 搜索框 - 折叠时隐藏 */}
        {!isCollapsed && (
          <div className="relative">
            <Search className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-slate-400' : 'text-gray-400'
            )} />
            <Input
              type="text"
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'pl-9 h-9 text-sm border transition-colors',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-[#3ecf8e]-500 focus:ring-blue-500'
                  : 'bg-white border-gray-200 focus:border-[#3ecf8e]-400 focus:ring-blue-400'
              )}
            />
          </div>
        )}
      </div>

      {/* 节点列表 */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 生成节点 */}
          <CategorySection
            title="生成节点"
            icon={<span className="text-2xl">⚡</span>}
            nodes={aiNodes}
            onAddNode={handleAddNode}
            defaultExpanded={true}
          />

          {/* 搜索结果为空 */}
          {searchQuery && filteredNodes.length === 0 && (
            <div className="text-center py-8">
              <p className={cn(
                'text-sm',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>未找到匹配的节点</p>
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  'mt-2 text-sm transition-colors',
                  isDark
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-blue-600 hover:text-blue-700'
                )}
              >
                清除搜索
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 折叠状态：只显示图标 */
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {aiNodes.map((nodeType, index) => {
            // 为每个节点类型分配彩色
            const colorSchemes = [
              {
                bg: 'from-blue-500/20 to-blue-600/20',
                border: 'border-blue-500/50',
                icon: 'text-blue-400',
                hover: 'hover:bg-blue-500/30 hover:border-blue-500/70'
              },
              {
                bg: 'from-[#002FA7]/20 to-[#0038D0]/20',
                border: 'border-[#002FA7]/50',
                icon: 'text-[#0038D0]',
                hover: 'hover:bg-[#002FA7]/30 hover:border-[#002FA7]/70'
              },
              {
                bg: 'from-green-500/20 to-green-600/20',
                border: 'border-green-500/50',
                icon: 'text-green-400',
                hover: 'hover:bg-green-500/30 hover:border-green-500/70'
              },
              {
                bg: 'from-orange-500/20 to-orange-600/20',
                border: 'border-orange-500/50',
                icon: 'text-orange-400',
                hover: 'hover:bg-orange-500/30 hover:border-orange-500/70'
              },
              {
                bg: 'from-pink-500/20 to-pink-600/20',
                border: 'border-pink-500/50',
                icon: 'text-pink-400',
                hover: 'hover:bg-pink-500/30 hover:border-pink-500/70'
              },
            ];

            const scheme = colorSchemes[index % colorSchemes.length];

            return (
              <button
                key={nodeType.type}
                onClick={() => handleAddNode(nodeType.type)}
                className={cn(
                  'w-full p-3 rounded-xl transition-all duration-200',
                  'hover:scale-110 hover:shadow-lg',
                  'bg-gradient-to-br',
                  scheme.bg,
                  scheme.border,
                  scheme.hover,
                  'relative overflow-hidden group'
                )}
                title={nodeType.label}
              >
                {/* 背景装饰光晕 */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  scheme.bg.replace('/20', '/10')
                )} />

                {/* 图标 */}
                <div className={cn(
                  'relative flex items-center justify-center',
                  scheme.icon
                )}>
                  {nodeType.icon}
                </div>

                {/* 彩色边框高亮 */}
                <div className={cn(
                  'absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  scheme.border.replace('/50', '/80')
                )} />
              </button>
            );
          })}
        </div>
      )}

      {/* 底部信息 */}
      {!isCollapsed && (
        <div className={cn(
          'p-4 border-t bg-gradient-to-r space-y-3',
          isDark
            ? 'border-white/10 from-[#3ecf8e]-900/40 to-[#00c573]-900/40'
            : 'border-gray-200 from-[#3ecf8e]-50 to-[#00c573]-50'
        )}>
          {/* 模板按钮 */}
          <button
            onClick={() => {
              // 触发 Cmd+T 事件
              window.dispatchEvent(new KeyboardEvent('keydown', {
                key: 't',
                metaKey: true,
                ctrlKey: true
              }));
            }}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium text-sm',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'shadow-md hover:shadow-lg',
              'bg-gradient-to-r from-blue-500 to-cyan-500',
              'hover:from-blue-600 hover:to-cyan-600',
              'text-white'
            )}
          >
            <Plus className="w-4 h-4" />
            添加工作流模板
            <span className={cn(
              'ml-auto text-xs px-1.5 py-0.5 rounded',
              'bg-white/20'
            )}>⌘T</span>
          </button>

          {/* 快速提示 */}
          <div className={cn(
            'text-xs',
            isDark ? 'text-slate-300' : 'text-gray-600'
          )}>
            <div className="font-semibold mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              快速提示
            </div>
            <ul className={cn(
              'space-y-1.5',
              isDark ? 'text-slate-400' : 'text-gray-500'
            )}>
              <li className="flex items-start gap-2">
                <span className={isDark ? 'text-blue-500' : 'text-blue-500'}>•</span>
                <span>点击节点添加到画布</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={isDark ? 'text-blue-500' : 'text-blue-500'}>•</span>
                <span>拖拽节点调整位置</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={isDark ? 'text-blue-500' : 'text-blue-500'}>•</span>
                <span>连接节点创建工作流</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default NanoaiWorkflowSidebar;
