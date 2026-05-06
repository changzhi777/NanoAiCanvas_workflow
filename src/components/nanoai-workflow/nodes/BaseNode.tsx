import { memo, useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { MoreVertical, Copy, Trash2, RefreshCw, Download, ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkflowNodeData, NodeStatus } from '@/stores/nanoaiWorkflowStore';
import { useTheme } from '../ui/Theme';
import { useToast } from '@/hooks/useToast';
import { NODE_TYPE_TO_CATEGORY, NodeFunctionCategory } from './nodeColors';
import '@/styles/button-3d.css';

// ==================== 状态指示器（优化版）====================

interface StatusIndicatorProps {
  status: NodeStatus;
  className?: string;
  showLabel?: boolean;
}

const StatusIndicator = memo(({ status, className, showLabel = false }: StatusIndicatorProps) => {
  const { isDark } = useTheme();

  const statusConfig = {
    idle: {
      color: 'bg-gray-400',
      pulse: false,
      label: '空闲',
      textColor: isDark ? 'text-slate-400' : 'text-gray-600'
    },
    running: {
      color: 'bg-blue-500',
      pulse: true,
      label: '运行中',
      textColor: isDark ? 'text-blue-400' : 'text-blue-600'
    },
    success: {
      color: 'bg-green-500',
      pulse: false,
      label: '成功',
      textColor: isDark ? 'text-green-400' : 'text-green-600'
    },
    error: {
      color: 'bg-red-500',
      pulse: false,
      label: '错误',
      textColor: isDark ? 'text-red-400' : 'text-red-600'
    },
    disabled: {
      color: 'bg-gray-300',
      pulse: false,
      label: '禁用',
      textColor: isDark ? 'text-slate-500' : 'text-gray-400'
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'w-3 h-3 rounded-full transition-all duration-300',
          config.color,
          config.pulse && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

// ==================== 端口组件（优化版）====================

interface PortProps {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

const portTypeConfig = {
  text: { color: 'bg-blue-500', hover: 'hover:bg-blue-100', label: '文本' },
  image: { color: 'bg-blue-500', hover: 'hover:bg-blue-100', label: '图片' },
  audio: { color: 'bg-green-500', hover: 'hover:bg-green-100', label: '音频' },
  json: { color: 'bg-yellow-500', hover: 'hover:bg-yellow-100', label: 'JSON' },
  array: { color: 'bg-orange-500', hover: 'hover:bg-orange-100', label: '数组' },
  object: { color: 'bg-purple-500', hover: 'hover:bg-purple-100', label: '数据' },
};

const InputPort = memo(({ id, name, type, required, description }: PortProps) => {
  const config = portTypeConfig[type as keyof typeof portTypeConfig];
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
        'hover:shadow-md cursor-pointer group',
        isHovered && 'scale-[1.02]',
        isDark
          ? 'bg-white/5 border border-white/10 hover:border-white/20'
          : 'bg-gray-50 border border-gray-200 hover:border-blue-300',
        config.hover
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        id={id}
        position={Position.Left}
        className={cn(
          'w-4 h-4 rounded-sm border-2 transition-all duration-200',
          'hover:w-5 hover:h-5 cursor-crosshair',
          'hover:shadow-xl hover:shadow-blue-500/60',
          'shadow-lg shadow-blue-500/30',
          isDark ? 'border-slate-700' : 'border-white',
          config.color,
          isHovered && 'animate-pulse'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-medium truncate transition-colors',
            isDark ? 'text-slate-200 group-hover:text-blue-400' : 'text-gray-700 group-hover:text-blue-600'
          )}>{name}</span>
          {required && <span className="text-red-500 text-xs">*</span>}
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full transition-all',
            isHovered && 'scale-110',
            isDark
              ? config.color.replace('bg-', 'bg-').replace('500', '900/50')
              : config.color.replace('bg-', 'bg-').replace('500', '100'),
            isDark ? 'text-slate-300' : 'text-gray-600'
          )}>
            {config.label}
          </span>
        </div>
        {description && (
          <p className={cn(
            'text-xs truncate mt-0.5',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>{description}</p>
        )}
      </div>
    </div>
  );
});

InputPort.displayName = 'InputPort';

const OutputPort = memo(({ id, name, type, description }: PortProps) => {
  const config = portTypeConfig[type as keyof typeof portTypeConfig];
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center justify-end gap-2 p-2 rounded-lg transition-all duration-200',
        'hover:shadow-md cursor-pointer group',
        isHovered && 'scale-[1.02]',
        isDark
          ? 'bg-white/5 border border-white/10 hover:border-white/20'
          : 'bg-gray-50 border border-gray-200 hover:border-blue-300',
        config.hover
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 text-right min-w-0">
        <div className="flex items-center justify-end gap-1.5">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full transition-all',
            isHovered && 'scale-110',
            isDark
              ? config.color.replace('bg-', 'bg-').replace('500', '900/50')
              : config.color.replace('bg-', 'bg-').replace('500', '100'),
            isDark ? 'text-slate-300' : 'text-gray-600'
          )}>
            {config.label}
          </span>
          <span className={cn(
            'text-sm font-medium truncate transition-colors',
            isDark ? 'text-slate-200 group-hover:text-blue-400' : 'text-gray-700 group-hover:text-blue-600'
          )}>{name}</span>
        </div>
        {description && (
          <p className={cn(
            'text-xs truncate mt-0.5',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>{description}</p>
        )}
      </div>
      <Handle
        type="source"
        id={id}
        position={Position.Right}
        className={cn(
          'w-4 h-4 rounded-sm border-2 transition-all duration-200',
          'hover:w-5 hover:h-5 cursor-crosshair',
          'hover:shadow-xl hover:shadow-blue-500/60',
          'shadow-lg shadow-blue-500/30',
          isDark ? 'border-slate-700' : 'border-white',
          config.color,
          isHovered && 'animate-pulse'
        )}
      />
    </div>
  );
});

OutputPort.displayName = 'OutputPort';

// ==================== 基础节点组件（优化版）====================

interface BaseNodeProps {
  data: WorkflowNodeData;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  headerAction?: React.ReactNode;
  onCopy?: () => void;
  onDelete?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  selected?: boolean;
}

export const BaseNode = memo(({
  data,
  icon,
  children,
  headerAction,
  onCopy,
  onDelete,
  onReset,
  onExport,
  selected = false
}: BaseNodeProps) => {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 获取节点颜色方案（仅用于运行状态装饰）
  const nodeType = (data as any).type || 'input_text';

  const handleCopy = useCallback(() => {
    onCopy?.();
    toast.success('节点已复制');
  }, [onCopy, toast]);

  const handleDelete = useCallback(() => {
    onDelete?.();
    toast.info('节点已删除');
  }, [onDelete, toast]);

  const handleReset = useCallback(() => {
    onReset?.();
    toast.info('节点已重置');
  }, [onReset, toast]);

  const handleExport = useCallback(() => {
    onExport?.();
    toast.success('结果已导出');
  }, [onExport, toast]);

  // 获取节点功能分类
  const getNodeCategory = (nodeType: string): 'input' | 'ai' | 'output' | 'tool' => {
    const category = NODE_TYPE_TO_CATEGORY[nodeType];
    if (category) {
      switch (category) {
        case NodeFunctionCategory.INPUT: return 'input';
        case NodeFunctionCategory.AI_GENERATOR: return 'ai';
        case NodeFunctionCategory.OUTPUT: return 'output';
        case NodeFunctionCategory.TOOL: return 'tool';
      }
    }
    if (nodeType.startsWith('input')) return 'input';
    if (nodeType.includes('generator') || nodeType.includes('designer')) return 'ai';
    if (nodeType.startsWith('output')) return 'output';
    return 'tool';
  };

  const nodeCategory = getNodeCategory(nodeType);

  // 功能分类颜色映射
  const categoryColors = {
    input: { stripe: 'bg-blue-500', iconBg: 'bg-blue-500/20', iconText: 'text-blue-400' },
    ai: { stripe: 'bg-green-500', iconBg: 'bg-green-500/20', iconText: 'text-green-400' },
    output: { stripe: 'bg-orange-500', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400' },
    tool: { stripe: 'bg-slate-500', iconBg: 'bg-slate-500/20', iconText: 'text-slate-400' },
  };

  // 状态阴影颜色
  const statusShadowColors = {
    [NodeStatus.IDLE]: '',
    [NodeStatus.RUNNING]: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    [NodeStatus.SUCCESS]: 'shadow-[0_0_15px_rgba(62,207,142,0.3)]',
    [NodeStatus.ERROR]: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    [NodeStatus.DISABLED]: '',
  };

  return (
    <div
      className={cn(
        // 基础节点增强样式
        'node-enhanced',
        // 功能分类
        `node-${nodeCategory}`,
        // 展开/折叠状态
        isCollapsed ? 'node-collapsed' : 'node-expanded',
        // 统一阴影风格（CardNode风格）
        'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)]',
        // 统一边框
        'border border-border/50 rounded-xl transition-all duration-300',
        'hover:scale-[1.02]',
        // 状态阴影
        statusShadowColors[data.status],
        selected && 'ring-4 ring-primary/30',
        'min-w-[320px] max-w-[400px]',
        isDark ? 'bg-[#1a1a1a]/90 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl',
        isHovered && 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 左侧功能分类彩色竖条（CardNode风格） */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', categoryColors[nodeCategory].stripe)} />

      {/* 节点头部 - 扁平化设计 */}
      <div
        className={cn(
          'flex items-center justify-between p-4 border-b border-border/50 rounded-t-xl cursor-pointer transition-all duration-200',
          'relative overflow-hidden ml-2',
          // 扁平半透明背景替代渐变
          isDark ? 'bg-[#242424]/50' : 'bg-slate-50/50'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* 运行状态时的背景脉冲效果 */}
        {data.status === NodeStatus.RUNNING && (
          <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
        )}

        <div className="relative flex items-center gap-3">
          {icon && (
            <div className={cn(
              'p-2 rounded-lg transition-transform duration-200',
              categoryColors[nodeCategory].iconBg,
              isHovered && 'scale-110'
            )}>
              <div className={cn('transition-colors duration-200', categoryColors[nodeCategory].iconText)}>
                {icon}
              </div>
            </div>
          )}
          {/* 标题 - CardNode风格 */}
          <h3 className={cn(
            'font-semibold text-base',
            isDark ? 'text-slate-100' : 'text-gray-800',
            'transition-all duration-200'
          )}>
            {data.label}
          </h3>
          <StatusIndicator status={data.status} />
          {data.status === NodeStatus.RUNNING && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>运行中</span>
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* 折叠按钮 - 简洁ghost样式 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>

          {/* 节点操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCopy && (
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  <Copy className="w-4 h-4 mr-2 text-blue-600" />
                  <span>复制节点</span>
                </DropdownMenuItem>
              )}
              {onReset && (
                <DropdownMenuItem onClick={handleReset} className="cursor-pointer">
                  <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                  <span>重置节点</span>
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2 text-green-600" />
                  <span>导出结果</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span>删除节点</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {headerAction}
        </div>
      </div>

      {/* 节点内容（可折叠） */}
      {!isCollapsed && (
        <div className="p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {children}

          {/* 错误信息（优化版） */}
          {data.error && (
            <div className={cn(
              'p-3 border rounded-lg',
              isDark
                ? 'bg-red-900/30 border-red-500/50 text-red-300'
                : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-start gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isDark ? 'bg-red-500' : 'bg-red-500'
                )}>
                  <span className="text-white text-xs">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-red-300' : 'text-red-800'
                  )}>执行失败</p>
                  <p className={cn(
                    'text-xs mt-1',
                    isDark ? 'text-red-400' : 'text-red-600'
                  )}>{data.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 结果预览（优化版） */}
          {data.result && data.status === NodeStatus.SUCCESS && (
            <div className={cn(
              'p-3 border rounded-lg',
              isDark
                ? 'bg-green-900/30 border-green-500/50 text-green-300'
                : 'bg-green-50 border-green-200'
            )}>
              <div className="flex items-start gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isDark ? 'bg-green-500' : 'bg-green-500'
                )}>
                  <span className="text-white text-xs">✓</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-green-300' : 'text-green-800'
                  )}>执行成功</p>
                  <p className={cn(
                    'text-xs mt-1',
                    isDark ? 'text-green-400' : 'text-green-600'
                  )}>
                    {data.result.images?.length || data.result.imageUrl ? '结果已生成' : '任务完成'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 输入端口 */}
      {data.inputs.length > 0 && !isCollapsed && (
        <div className={cn(
          'p-4 border-t space-y-2 rounded-b-xl',
          isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-gray-50/50'
        )}>
          <div className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            输入端口
          </div>
          {data.inputs.map((input) => (
            <InputPort key={input.id} {...input} />
          ))}
        </div>
      )}

      {/* 输出端口 */}
      {data.outputs.length > 0 && !isCollapsed && (
        <div className={cn(
          'p-4 border-t space-y-2 rounded-b-xl',
          isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-gray-50/50'
        )}>
          <div className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            输出端口
          </div>
          {data.outputs.map((output) => (
            <OutputPort key={output.id} {...output} />
          ))}
        </div>
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';

// ==================== 参数编辑器（优化版）====================

interface ParamEditorProps {
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
  schema: ParamSchema[];
}

export interface ParamSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'toggle';
  defaultValue?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export const ParamEditor = memo(({ params, onChange, schema }: ParamEditorProps) => {
  const { isDark } = useTheme();

  const updateParam = (key: string, value: any) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="space-y-3">
      {schema.map((field) => {
        const value = params[field.key] ?? field.defaultValue;
        const isRequired = field.required && !value;

        return (
          <div key={field.key} className="space-y-1.5">
            <label className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              isDark ? 'text-slate-200' : 'text-gray-700'
            )}>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={value}
                onChange={(e) => updateParam(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
                  'transition-all duration-200',
                  isRequired
                    ? isDark
                      ? 'border-red-500/50 focus:ring-red-500 bg-white/5 text-slate-100'
                      : 'border-red-300 focus:ring-red-500'
                    : isDark
                      ? 'border-white/10 focus:ring-blue-500 bg-white/5 text-slate-100 placeholder:text-slate-400/50'
                      : 'border-gray-200 focus:ring-blue-500',
                  'focus:border-transparent'
                )}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                value={value}
                onChange={(e) => updateParam(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
                  'transition-all duration-200 resize-none',
                  isRequired
                    ? isDark
                      ? 'border-red-500/50 focus:ring-red-500 bg-white/5 text-slate-100'
                      : 'border-red-300 focus:ring-red-500'
                    : isDark
                      ? 'border-white/10 focus:ring-blue-500 bg-white/5 text-slate-100 placeholder:text-slate-400/50'
                      : 'border-gray-200 focus:ring-blue-500',
                  'focus:border-transparent'
                )}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={value}
                onChange={(e) => updateParam(field.key, parseFloat(e.target.value))}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
                  'transition-all duration-200',
                  isRequired
                    ? isDark
                      ? 'border-red-500/50 focus:ring-red-500 bg-white/5 text-slate-100'
                      : 'border-red-300 focus:ring-red-500'
                    : isDark
                      ? 'border-white/10 focus:ring-blue-500 bg-white/5 text-slate-100'
                      : 'border-gray-200 focus:ring-blue-500',
                  'focus:border-transparent'
                )}
              />
            )}

            {field.type === 'select' && field.options && (
              <select
                value={value}
                onChange={(e) => updateParam(field.key, e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
                  'transition-all duration-200',
                  isRequired
                    ? isDark
                      ? 'border-red-500/50 focus:ring-red-500 bg-white/5 text-slate-100'
                      : 'border-red-300 focus:ring-red-500'
                    : isDark
                      ? 'border-white/10 focus:ring-blue-500 bg-white/5 text-slate-100'
                      : 'border-gray-200 focus:ring-blue-500',
                  'focus:border-transparent',
                  isDark ? 'bg-white/5' : 'bg-white'
                )}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'toggle' && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateParam(field.key, e.target.checked)}
                  className={cn(
                    'w-4 h-4 rounded transition-all duration-200',
                    'focus:ring-offset-0',
                    'cursor-pointer',
                    isDark
                      ? 'text-blue-500 focus:ring-blue-500 bg-white/5 border-white/10'
                      : 'text-blue-600 focus:ring-blue-500'
                  )}
                />
                <span className={cn(
                  'text-sm transition-colors',
                  isDark
                    ? 'text-slate-300 group-hover:text-slate-200'
                    : 'text-gray-600 group-hover:text-gray-800'
                )}>
                  启用
                </span>
              </label>
            )}

            {field.description && (
              <p className={cn(
                'text-xs pl-1',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>{field.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
});

ParamEditor.displayName = 'ParamEditor';

// ==================== 执行按钮（优化版）====================

interface ExecuteButtonProps {
  onExecute: () => void;
  status: NodeStatus;
  label?: string;
  loadingLabel?: string;
  onRetry?: () => void;
}

export const ExecuteButton = memo(({
  onExecute,
  status,
  label = '执行',
  loadingLabel = '执行中...',
  onRetry
}: ExecuteButtonProps) => {
  const isRunning = status === NodeStatus.RUNNING;
  const hasError = status === NodeStatus.ERROR;
  const isSuccess = status === NodeStatus.SUCCESS;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex gap-2">
      <button
        onClick={isRunning || hasError ? undefined : onExecute}
        disabled={isRunning}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'shadow-md hover:shadow-lg active:scale-95',
          'text-white',
          'relative overflow-hidden',
          isHovered && !isRunning && 'shadow-xl',
          // 状态背景色
          isSuccess && 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
          hasError && 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600',
          !isSuccess && !hasError && 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
        )}
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingLabel}
          </span>
        ) : hasError ? (
          <span className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            执行失败
          </span>
        ) : isSuccess ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            执行成功
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className={cn('w-4 h-4', isHovered && 'animate-pulse')} />
            {label}
          </span>
        )}

        {/* 悬停效果 */}
        {isHovered && !isRunning && !hasError && !isSuccess && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
        )}
      </button>

      {hasError && onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'px-4 py-2.5 rounded-lg font-medium transition-all duration-200',
            'shadow-md hover:shadow-lg active:scale-95',
            'bg-gradient-to-r from-orange-500 to-red-500',
            'hover:from-orange-600 hover:to-red-600',
            'text-white',
            'hover:scale-110'
          )}
          title="重试"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

ExecuteButton.displayName = 'ExecuteButton';
