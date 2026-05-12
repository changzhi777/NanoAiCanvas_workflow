/**
 * TVC 执行进度面板
 * 实时显示 5 步线性执行进度 + 子任务网格
 * 支持 framer-motion 丝滑动画
 */

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Loader2, Circle, AlertCircle,
  Copy, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';

// ==================== 类型 ====================

export interface SubtaskInfo {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  progress: number;
  message?: string;
  result?: any;
  error?: string;
}

export interface NodeProgressInfo {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  progress: number;
  subtasks?: SubtaskInfo[];
  result?: any;
  error?: string;
  elapsed_ms?: number;
}

export interface TvcExecutionState {
  task_id: string;
  status: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled';
  overall_progress: number;
  nodes: NodeProgressInfo[];
}

interface TvcExecutionPanelProps {
  state: TvcExecutionState;
  onDuplicate?: () => void;
  onCancel?: () => void;
}

// ==================== 状态图标 ====================

function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 style={{ width: size, height: size }} className="text-emerald-500" />;
    case 'running':
      return <Loader2 style={{ width: size, height: size }} className="text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle style={{ width: size, height: size }} className="text-red-500" />;
    default:
      return <Circle style={{ width: size, height: size }} className="text-muted-foreground/30" />;
  }
}

// ==================== 子任务网格 ====================

const SubtaskGrid = memo(({ subtasks }: { subtasks: SubtaskInfo[] }) => {
  const { isDark } = useTheme();

  if (!subtasks?.length) return null;

  return (
    <div className="grid grid-cols-2 gap-1 mt-1.5">
      <AnimatePresence mode="popLayout">
        {subtasks.map((st) => (
          <motion.div
            key={st.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px]',
              st.status === 'running' && (isDark ? 'bg-blue-500/15' : 'bg-blue-50'),
              st.status === 'success' && (isDark ? 'bg-green-500/10' : 'bg-green-50'),
              st.status === 'error' && (isDark ? 'bg-red-500/10' : 'bg-red-50'),
              st.status === 'pending' && (isDark ? 'bg-white/5' : 'bg-gray-50'),
            )}
          >
            <StatusIcon status={st.status} size={10} />
            <span className={cn(
              'truncate flex-1',
              st.status === 'running' && 'text-blue-500 font-medium',
              st.status === 'success' && 'text-emerald-500',
              st.status === 'error' && 'text-red-500',
              st.status === 'pending' && 'text-muted-foreground/40',
            )}>
              {st.label}
            </span>
            {st.status === 'running' && (
              <span className="text-[9px] text-muted-foreground font-mono">
                {st.progress}%
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
SubtaskGrid.displayName = 'SubtaskGrid';

// ==================== 节点进度卡片 ====================

const NodeCard = memo(({ node, index }: { node: NodeProgressInfo; index: number }) => {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasSubtasks = node.subtasks && node.subtasks.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'rounded-xl p-2.5 border transition-colors duration-300',
        node.status === 'running' && (isDark
          ? 'bg-blue-900/20 border-blue-500/30'
          : 'bg-blue-50 border-blue-200'),
        node.status === 'success' && (isDark
          ? 'bg-green-900/15 border-green-500/20'
          : 'bg-green-50 border-green-200'),
        node.status === 'error' && (isDark
          ? 'bg-red-900/15 border-red-500/20'
          : 'bg-red-50 border-red-200'),
        node.status === 'pending' && (isDark
          ? 'bg-white/5 border-white/5'
          : 'bg-gray-50 border-gray-100'),
      )}
    >
      {/* 节点标题 */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => hasSubtasks && setExpanded(!expanded)}
      >
        <StatusIcon status={node.status} />
        <span className={cn(
          'flex-1 text-xs font-medium',
          isDark ? 'text-slate-200' : 'text-gray-700',
        )}>
          Step {index + 1}: {node.label}
        </span>

        {/* 进度条（运行中） */}
        {node.status === 'running' && (
          <div className={cn(
            'w-16 h-1 rounded-full overflow-hidden',
            isDark ? 'bg-slate-700' : 'bg-gray-200',
          )}>
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${node.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}

        {hasSubtasks && (
          expanded
            ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
            : <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </div>

      {/* 子任务（展开时） */}
      <AnimatePresence>
        {expanded && hasSubtasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <SubtaskGrid subtasks={node.subtasks!} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
NodeCard.displayName = 'NodeCard';

// ==================== 主面板 ====================

export const TvcExecutionPanel = memo(({ state, onDuplicate, onCancel }: TvcExecutionPanelProps) => {
  const { isDark } = useTheme();

  const completedCount = state.nodes.filter(n => n.status === 'success').length;
  const totalCount = state.nodes.length;
  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';

  return (
    <div className={cn(
      'w-full rounded-2xl backdrop-blur-xl border overflow-hidden',
      isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-gray-200',
    )}>
      {/* 顶部进度条 */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>
            执行进度
          </span>
          <span className={cn('text-[10px] font-mono', isDark ? 'text-slate-400' : 'text-gray-500')}>
            {completedCount}/{totalCount} 完成
          </span>
        </div>

        <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-slate-800' : 'bg-gray-200')}>
          <motion.div
            className={cn(
              'h-full rounded-full',
              isCompleted
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : 'bg-gradient-to-r from-blue-500 to-cyan-400',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${state.overall_progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 节点列表 */}
      <div className="px-3 pb-3 space-y-1.5 max-h-[280px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {state.nodes.map((node, i) => (
            <NodeCard key={node.id} node={node} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* 底部操作栏 */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-t',
        isDark ? 'border-white/5 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50',
      )}>
        {isRunning && (
          <>
            <button
              onClick={onDuplicate}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium',
                'transition-colors',
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-slate-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
              )}
            >
              <Copy className="w-3 h-3" />
              复制新工作流
            </button>
            <button
              onClick={onCancel}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ml-auto',
                'transition-colors text-red-500',
                isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50',
              )}
            >
              <X className="w-3 h-3" />
              取消
            </button>
          </>
        )}
        {isCompleted && (
          <span className={cn('text-[11px] font-medium text-emerald-500')}>
            全部完成
          </span>
        )}
      </div>
    </div>
  );
});

TvcExecutionPanel.displayName = 'TvcExecutionPanel';

export default TvcExecutionPanel;
