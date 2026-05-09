import { useState } from 'react';
import {
  Code,
  Bug,
  Zap,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { useToastStore } from '@/stores/toastStore';

interface DeveloperToolsProps {
  show: boolean;
  onClose: () => void;
}

export function DeveloperTools({ show, onClose }: DeveloperToolsProps) {
  const { isDark } = useTheme();
  const { addToast } = useToastStore();
  const { nodes, edges, clearWorkflow } = useNanoaiWorkflowStore();
  const [activeTab, setActiveTab] = useState<'debug' | 'actions' | 'info'>('debug');

  if (!show) return null;

  const handleClearAll = () => {
    clearWorkflow();
    addToast('success', '工作流已清空');
  };

  const handleExportDebug = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      nodes: nodes.length,
      edges: edges.length,
      nodeDetails: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.data.label,
        status: node.data.status,
      })),
      edgeDetails: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('success', '调试信息已导出');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    idleNodes: nodes.filter((n) => n.data.status === 'idle' as any).length,
    runningNodes: nodes.filter((n) => n.data.status === 'running' as any).length,
    completedNodes: nodes.filter((n) => n.data.status === 'success' as any).length,
    errorNodes: nodes.filter((n) => n.data.status === 'error' as any).length,
  };

  return (
    <div className={cn(
        'fixed z-50 rounded-xl backdrop-blur-xl border',
        'animate-in slide-in-from-bottom-2 duration-200',
        isDark
          ? 'bg-slate-900/60 border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-white/90 border-gray-100 shadow-lg shadow-black/5',
      )}
      style={{ bottom: '204px', left: JSON.parse(localStorage.getItem('sidebar-collapsed') || 'true') ? 64 : 288 }}
      >
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5 border-b',
          isDark ? 'border-white/[0.04]' : 'border-gray-50'
        )}>
          <div className="flex items-center gap-2">
            <Code className={cn('w-3.5 h-3.5', isDark ? 'text-blue-400' : 'text-blue-600')} />
            <h3 className={cn('text-xs font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>开发者工具</h3>
          </div>
          <button onClick={onClose}
            className={cn('p-1 rounded transition-colors', isDark ? 'hover:bg-white/[0.06] text-slate-500' : 'hover:bg-gray-50 text-gray-400')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className={cn('flex border-b', isDark ? 'border-white/[0.04]' : 'border-gray-50')}>
          {[
            { key: 'debug', label: '调试', icon: Bug },
            { key: 'actions', label: '操作', icon: Zap },
            { key: 'info', label: '信息', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] transition-colors',
                activeTab === tab.key
                  ? isDark ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <tab.icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="p-3 w-64 max-h-72 overflow-y-auto">
          {activeTab === 'debug' && (
            <div className="space-y-3">
              <div className={cn('space-y-1.5 p-2.5 rounded-lg', isDark ? 'bg-white/[0.03]' : 'bg-gray-50')}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>节点数</span>
                  <span className={cn('font-mono font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>{stats.totalNodes}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>连线数</span>
                  <span className={cn('font-mono font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>{stats.totalEdges}</span>
                </div>
              </div>
              <div className={cn('space-y-1.5 p-2.5 rounded-lg', isDark ? 'bg-white/[0.03]' : 'bg-gray-50')}>
                {[
                  { label: '空闲', color: 'bg-slate-400', count: stats.idleNodes },
                  { label: '运行中', color: 'bg-blue-400', count: stats.runningNodes },
                  { label: '已完成', color: 'bg-green-400', count: stats.completedNodes },
                  { label: '错误', color: 'bg-red-400', count: stats.errorNodes },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', item.color)} />
                      <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{item.label}</span>
                    </div>
                    <span className={cn('font-mono font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-1.5">
              {[
                { label: '导出调试信息', icon: Download, color: 'blue', onClick: handleExportDebug },
                { label: '刷新页面', icon: RefreshCw, color: 'blue', onClick: handleRefresh },
                { label: '清空工作流', icon: Trash2, color: 'red', onClick: handleClearAll },
                { label: '清除本地缓存', icon: Trash2, color: 'orange', onClick: () => { localStorage.clear(); window.location.reload(); } },
              ].map(item => {
                const colorMap: Record<string, string> = {
                  blue: isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                  red: isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100',
                  orange: isDark ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100',
                };
                return (
                  <button key={item.label} onClick={item.onClick}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-colors', colorMap[item.color])}>
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-2.5">
              <div className={cn('p-2.5 rounded-lg space-y-1.5 text-[11px]', isDark ? 'bg-white/[0.03]' : 'bg-gray-50')}>
                {[
                  { label: '版本', value: '2.2.1' },
                  { label: 'React', value: '19.2.4' },
                  { label: 'TypeScript', value: '5.9.3' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{item.label}</span>
                    <span className={cn('font-mono font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className={cn('px-2.5 py-2 rounded-lg text-[11px]', isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')}>
                <span className="font-semibold">✓</span> 系统状态正常
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

DeveloperTools.displayName = 'DeveloperTools';
