/**
 * 文本预览节点 - 展示文本生成结果
 * 功能：文本阅读 + 复制 + 搜索
 */

import { useCallback, useState, useMemo } from 'react';
import { FileText, Download, Copy, Check, Search, Maximize2 } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';
import { useIMEValue } from '../ui/IMEInput';

// ==================== 类型定义 ====================

export interface TextPreviewItem {
  id: string;
  content: string;
  title?: string;
  charCount?: number;
}

export interface TextPreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean;
    sourceNodeId?: string;
    fontSize: 'small' | 'medium' | 'large';
    maxHeight: 'none' | 'sm' | 'md' | 'lg';
  };
  result?: {
    text?: string;
    content?: string;
    items?: TextPreviewItem[];
  };
}

// ==================== 主组件 ====================

export const TextPreviewNode = ({ id, data }: NodeProps<TextPreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const searchIME = useIMEValue(searchQuery, setSearchQuery);

  // 从上游节点获取数据
  const upstreamData = useMemo(() => {
    if (!data.params.autoConnectSource) return null;
    const incomingEdge = edges.find(e => e.target === id);
    if (incomingEdge) {
      const sourceNode = nodes.find(n => n.id === incomingEdge.source);
      return sourceNode?.data?.result;
    }
    return null;
  }, [edges, nodes, id, data.params.autoConnectSource]);

  // 合并数据源
  const resultData = useMemo(() => {
    if (data.params.sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId);
      return sourceNode?.data?.result;
    }
    return upstreamData || data.result;
  }, [data.params.sourceNodeId, nodes, upstreamData, data.result]);

  // 获取文本内容
  const displayText = useMemo(() => {
    if (!resultData) return '';
    return resultData.text || resultData.content || '';
  }, [resultData]);

  // 计算字符数
  const charCount = displayText.length;
  const wordCount = displayText.trim() ? displayText.trim().split(/\s+/).length : 0;

  // 搜索高亮
  const highlightedText = useMemo(() => {
    if (!searchQuery || !displayText) return displayText;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return displayText.split(regex).map((part: string) =>
      regex.test(part) ? `<mark class="bg-yellow-500/50 rounded px-0.5">${part}</mark>` : part
    ).join('');
  }, [displayText, searchQuery]);

  // 执行
  const handleExecute = useCallback(async () => {
    updateNode(id, { status: NodeStatus.RUNNING });
    try {
      let result = { message: '暂无数据' };
      if (data.params.autoConnectSource) {
        const incomingEdge = edges.find(e => e.target === id);
        if (incomingEdge) {
          const sourceNode = nodes.find(n => n.id === incomingEdge.source);
          result = sourceNode?.data?.result || { message: '上游节点无数据' };
        }
      }
      updateNode(id, { status: NodeStatus.SUCCESS, result });
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '获取数据失败'
      });
    }
  }, [id, updateNode, edges, nodes, data.params.autoConnectSource]);

  // 复制
  const handleCopy = useCallback(async () => {
    if (!displayText) return;
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [displayText]);

  // 下载
  const handleDownload = useCallback(() => {
    if (!displayText) return;
    const blob = new Blob([displayText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `text-${id}-${Date.now()}.txt`;
    link.click();
  }, [displayText, id]);

  // 字体大小映射
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[data.params.fontSize || 'medium'];

  // 最大高度映射
  const maxHeightClass = {
    none: 'max-h-none',
    sm: 'max-h-32',
    md: 'max-h-64',
    lg: 'max-h-96',
  }[data.params.maxHeight || 'md'];

  return (
    <BaseNode
      data={data}
      icon={<FileText className="w-5 h-5" />}
      headerAction={
        <button
          onClick={handleExecute}
          className={cn('p-1.5 rounded-lg transition-all', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
          title="刷新"
        >
          <Maximize2 className="w-4 h-4 text-[#3ecf8e]" />
        </button>
      }
    >
      <ExecuteButton onExecute={handleExecute} status={data.status} label="刷新预览" />

      {/* 加载状态 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-6 rounded-xl border-2 border-dashed animate-pulse" style={{
          background: 'rgba(62, 207, 142, 0.05)',
          borderColor: 'rgba(62, 207, 142, 0.4)',
        }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-[#3ecf8e]">加载文本...</span>
          </div>
        </div>
      )}

      {/* 文本内容 */}
      {data.status === NodeStatus.SUCCESS && displayText && (
        <div className="mt-3 space-y-3">
          {/* 搜索栏 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索内容..."
              {...searchIME}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg text-sm border transition-colors',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-400'
                  : 'bg-white border-gray-200 placeholder:text-gray-400'
              )}
            />
          </div>

          {/* 文本区域 */}
          <div
            className={cn(
              'p-3 rounded-xl border overflow-auto',
              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200',
              maxHeightClass
            )}
          >
            <pre
              className={cn(
                'whitespace-pre-wrap font-sans',
                fontSizeClass,
                isDark ? 'text-gray-300' : 'text-gray-700'
              )}
              dangerouslySetInnerHTML={{ __html: highlightedText || displayText }}
            />
          </div>

          {/* 统计信息 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}>
            <div className="flex items-center gap-4 text-gray-500">
              <span>{charCount} 字符</span>
              <span>{wordCount} 词</span>
              {searchQuery && (
                <span className="text-[#3ecf8e]">
                  匹配 "{searchQuery}"
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullscreen(true)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                title="全屏查看"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  copied
                    ? 'bg-green-500 text-white'
                    : 'text-white'
                )}
                style={{ background: copied ? '#22c55e' : '#3ecf8e' }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: isDark ? '#333' : '#e5e5e5' }}
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 无数据 */}
      {data.status === NodeStatus.SUCCESS && !displayText && (
        <div className="mt-3 p-6 rounded-xl border text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">暂无文本</p>
        </div>
      )}

      {/* 全屏文本查看 */}
      {showFullscreen && displayText && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-medium">文本预览</h3>
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 rounded-full hover:bg-white/10 text-white"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <pre className={cn(
              'whitespace-pre-wrap font-sans text-sm text-gray-300 max-w-4xl mx-auto'
            )}>
              {displayText}
            </pre>
          </div>
        </div>
      )}
    </BaseNode>
  );
};

TextPreviewNode.displayName = 'TextPreviewNode';

export default TextPreviewNode;