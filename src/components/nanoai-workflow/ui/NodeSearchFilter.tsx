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

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesSearch = node.data.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || node.data.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [nodes, searchQuery, selectedStatus]);

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
      'w-64 rounded-xl backdrop-blur-xl border',
      'animate-in fade-in slide-in-from-top-2 duration-200',
      isDark
        ? 'bg-slate-900/60 border-white/[0.06] shadow-lg shadow-black/20'
        : 'bg-white/90 border-gray-100 shadow-lg shadow-black/5'
    )}>
      {/* 头部 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 border-b',
        isDark ? 'border-white/[0.04]' : 'border-gray-50'
      )}>
        <div className="flex items-center gap-2">
          <Filter className={cn('w-3.5 h-3.5', isDark ? 'text-blue-400' : 'text-blue-600')} />
          <h3 className={cn('text-xs font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>节点筛选</h3>
        </div>
        {onClose && (
          <button onClick={onClose}
            className={cn('p-1 rounded transition-colors', isDark ? 'hover:bg-white/[0.06] text-slate-500' : 'hover:bg-gray-50 text-gray-400')}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 搜索框 */}
      <div className="px-3 pt-2.5">
        <div className="relative">
          <Search className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3', isDark ? 'text-slate-500' : 'text-gray-400')} />
          <Input type="text" placeholder="搜索节点..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'pl-8 h-8 text-[11px]',
              isDark
                ? 'bg-white/[0.03] border-white/[0.06] text-slate-300 placeholder:text-slate-500 focus:border-blue-500/50'
                : 'bg-gray-50 border-gray-100 focus:border-blue-400'
            )} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className={cn('absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded', isDark ? 'hover:bg-white/[0.06] text-slate-500' : 'hover:bg-gray-100 text-gray-400')}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="px-3 py-2.5 space-y-0.5">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedStatus(option.value as NodeStatus | 'all')}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-[11px]',
              selectedStatus === option.value
                ? isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                : isDark ? 'hover:bg-white/[0.03] text-slate-400' : 'hover:bg-gray-50 text-gray-500'
            )}
          >
            <span>{option.label}</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
              selectedStatus === option.value
                ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
                : isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-gray-100 text-gray-400'
            )}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* 结果统计 */}
      <div className={cn('px-3 pb-2.5')}>
        <div className={cn('text-[10px] text-center py-1.5 rounded-lg', isDark ? 'bg-white/[0.02] text-slate-500' : 'bg-gray-50 text-gray-400')}>
          找到 <span className={cn('font-semibold', isDark ? 'text-slate-300' : 'text-gray-600')}>{filteredNodes.length}</span> 个节点
        </div>
      </div>
    </div>
  );
}

NodeSearchFilter.displayName = 'NodeSearchFilter';
