import { useState, useMemo } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { Input } from '@/components/ui/input';
import { NodeStatus } from '@/stores/nanoaiWorkflowStore';

interface NodeSearchFilterProps {
  nodes: Array<{ id: string; data: { label: string; status: NodeStatus } }>;
  onClose?: () => void;
}

export function NodeSearchFilter({ nodes, onClose }: NodeSearchFilterProps) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | 'all'>('all');

  // 过滤节点
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesSearch = node.data.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || node.data.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [nodes, searchQuery, selectedStatus]);

  // 统计各状态节点数量
  const statusCounts = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.data.status] = (acc[node.data.status] || 0) + 1;
      return acc;
    }, {} as Record<NodeStatus, number>);
  }, [nodes]);

  const statusOptions = [
    { value: 'all', label: '全部', count: nodes.length },
    { value: NodeStatus.IDLE, label: '空闲', count: statusCounts[NodeStatus.IDLE] || 0 },
    { value: NodeStatus.RUNNING, label: '运行中', count: statusCounts[NodeStatus.RUNNING] || 0 },
    { value: NodeStatus.SUCCESS, label: '成功', count: statusCounts[NodeStatus.SUCCESS] || 0 },
    { value: NodeStatus.ERROR, label: '错误', count: statusCounts[NodeStatus.ERROR] || 0 },
    { value: NodeStatus.DISABLED, label: '禁用', count: statusCounts[NodeStatus.DISABLED] || 0 },
  ];

  return (
    <div className={cn(
      'w-80 rounded-xl backdrop-blur-xl border shadow-lg',
      'transition-all duration-300',
      isDark
        ? 'bg-slate-900/80 border-white/10'
        : 'bg-white/90 border-gray-200'
    )}>
      {/* 头部 */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b',
        isDark ? 'border-white/10' : 'border-gray-200'
      )}>
        <div className="flex items-center gap-2">
          <Filter className={cn(
            'w-4 h-4',
            isDark ? 'text-blue-400' : 'text-blue-600'
          )} />
          <h3 className={cn(
            'font-semibold text-sm',
            isDark ? 'text-slate-200' : 'text-gray-800'
          )}>
            节点筛选
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 搜索框 */}
      <div className="p-4 space-y-3">
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
              'pl-9 h-9 text-sm',
              isDark
                ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500'
                : 'bg-white border-gray-200 focus:border-blue-400'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors',
                isDark
                  ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="space-y-2">
          <label className={cn(
            'text-xs font-medium',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            节点状态
          </label>
          <div className="space-y-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value as NodeStatus | 'all')}
                className={cn(
                  'w-full flex items-center justify-between p-2 rounded-lg transition-all',
                  'text-left text-sm',
                  selectedStatus === option.value
                    ? isDark
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                    : isDark
                      ? 'hover:bg-white/5 border border-transparent text-slate-300'
                      : 'hover:bg-gray-50 border border-transparent text-gray-600'
                )}
              >
                <span>{option.label}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  selectedStatus === option.value
                    ? isDark
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-gray-200 text-gray-500'
                )}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 结果统计 */}
      <div className={cn(
        'px-4 pb-4',
        isDark ? 'border-t border-white/10' : 'border-t border-gray-200'
      )}>
        <div className={cn(
          'text-xs text-center py-2 rounded-lg',
          isDark
            ? 'bg-white/5 text-slate-400'
            : 'bg-gray-50 text-gray-500'
        )}>
          找到 <span className={cn(
            'font-semibold',
            isDark ? 'text-slate-200' : 'text-gray-700'
          )}>{filteredNodes.length}</span> 个节点
        </div>
      </div>
    </div>
  );
}

NodeSearchFilter.displayName = 'NodeSearchFilter';
