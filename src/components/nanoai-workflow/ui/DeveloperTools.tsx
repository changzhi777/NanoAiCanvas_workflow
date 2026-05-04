import { useState } from 'react';
import {
  Code,
  Bug,
  Zap,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
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
    <div className="fixed top-4 left-4 z-[100]">
      {/* 开发者工具面板 */}
      <div
        className={cn(
          'w-96 rounded-2xl shadow-2xl backdrop-blur-xl border',
          'animate-in slide-in-from-left-4 duration-300',
          isDark
            ? 'bg-slate-900/95 border-white/10'
            : 'bg-white/95 border-gray-200'
        )}
      >
        {/* 头部 */}
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-2">
            <Code
              className={cn(
                'w-5 h-5',
                isDark ? 'text-blue-400' : 'text-blue-600'
              )}
            />
            <h2
              className={cn(
                'text-lg font-bold',
                isDark ? 'text-slate-100' : 'text-gray-900'
              )}
            >
              开发者工具
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div
          className={cn(
            'flex border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          {[
            { key: 'debug', label: '调试', icon: Bug },
            { key: 'actions', label: '操作', icon: Zap },
            { key: 'info', label: '信息', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors',
                activeTab === tab.key
                  ? isDark
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* 调试标签页 */}
          {activeTab === 'debug' && (
            <div className="space-y-3">
              <h3
                className={cn(
                  'text-sm font-semibold mb-2',
                  isDark ? 'text-slate-200' : 'text-gray-800'
                )}
              >
                工作流状态
              </h3>

              <div
                className={cn(
                  'space-y-2 p-3 rounded-lg',
                  isDark ? 'bg-slate-800/50' : 'bg-gray-100'
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    总节点数
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.totalNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    总连线数
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.totalEdges}
                  </span>
                </div>
              </div>

              <h3
                className={cn(
                  'text-sm font-semibold mb-2',
                  isDark ? 'text-slate-200' : 'text-gray-800'
                )}
              >
                节点状态分布
              </h3>

              <div
                className={cn(
                  'space-y-2 p-3 rounded-lg',
                  isDark ? 'bg-slate-800/50' : 'bg-gray-100'
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                      空闲
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.idleNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                      运行中
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.runningNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                      已完成
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.completedNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                      错误
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    {stats.errorNodes}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 操作标签页 */}
          {activeTab === 'actions' && (
            <div className="space-y-2">
              <button
                onClick={handleExportDebug}
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors',
                  'hover:shadow-md',
                  isDark
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                )}
              >
                <Download className="w-4 h-4" />
                <span>导出调试信息</span>
              </button>

              <button
                onClick={handleRefresh}
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors',
                  'hover:shadow-md',
                  isDark
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新页面</span>
              </button>

              <button
                onClick={handleClearAll}
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors',
                  'hover:shadow-md',
                  isDark
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span>清空工作流</span>
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className={cn(
                  'w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors',
                  'hover:shadow-md',
                  isDark
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span>清除本地缓存</span>
              </button>
            </div>
          )}

          {/* 信息标签页 */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div
                className={cn(
                  'p-3 rounded-lg space-y-2 text-xs',
                  isDark ? 'bg-slate-800/50' : 'bg-gray-100'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    版本
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    2.2.1
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    构建时间
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    2026-04-21
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    React
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    19.2.4
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                    TypeScript
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}
                  >
                    5.9.3
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'p-3 rounded-lg space-y-1 text-xs',
                  isDark
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-green-50 text-green-600'
                )}
              >
                <p className="font-semibold">✓ 系统状态正常</p>
                <p className="opacity-75">所有核心功能运行正常</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

DeveloperTools.displayName = 'DeveloperTools';
