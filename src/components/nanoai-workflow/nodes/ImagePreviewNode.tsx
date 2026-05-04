/**
 * 图片预览节点 - 展示图片生成结果
 * 功能：画廊模式 + 灯箱全屏查看
 */

import { useCallback, useState, useMemo } from 'react';
import { Image as ImageIcon, Download, X, ChevronLeft, ChevronRight, Maximize2, ZoomIn } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface ImagePreviewItem {
  id: string;
  url: string;
  thumbnail?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface ImagePreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean;
    sourceNodeId?: string;
    thumbnailSize: 'small' | 'medium' | 'large';
    gridColumns: 2 | 3 | 4;
  };
  result?: {
    images?: string[];
    imageUrl?: string;
    items?: ImagePreviewItem[];
  };
}

// ==================== 工具函数 ====================

const generateId = () => `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ==================== 子组件 ====================

/** 图片网格组件 */
const ImageGrid = ({ items, onItemClick }: { items: ImagePreviewItem[]; onItemClick: (item: ImagePreviewItem, index: number) => void }) => {
  const { isDark } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item, index)}
          className={cn(
            'relative group rounded-lg overflow-hidden border-2 transition-all duration-200',
            'hover:border-[#3ecf8e] hover:shadow-lg hover:scale-[1.02]',
            isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
          )}
        >
          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            {item.thumbnail || item.url ? (
              <img
                src={item.thumbnail || item.url}
                alt={item.title || `图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <span className="text-white text-xs font-medium truncate">{item.title || `图片 ${index + 1}`}</span>
          </div>
          {/* 放大图标 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-2 rounded-full bg-black/50">
              <ZoomIn className="w-5 h-5 text-white" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// ==================== 主组件 ====================

export const ImagePreviewNode = ({ id, data }: NodeProps<ImagePreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // 转换为图片项
  const displayItems = useMemo(() => {
    if (!resultData) return [];
    const items: ImagePreviewItem[] = [];

    if (resultData.images?.length) {
      resultData.images.forEach((url: string, i: number) => {
        items.push({ id: generateId(), url, title: `图片 ${i + 1}` });
      });
    }
    if (resultData.items?.length) {
      resultData.items.forEach((item: ImagePreviewItem) => {
        const { id: _existingId, ...rest } = item;
        items.push({ id: item.id || generateId(), ...rest });
      });
    }
    if (resultData.imageUrl && items.length === 0) {
      items.push({ id: generateId(), url: resultData.imageUrl, title: '图片' });
    }
    return items;
  }, [resultData]);

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

  // 下载
  const handleDownload = useCallback(() => {
    const item = displayItems[currentIndex];
    if (!item?.url) return;
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `image-${item.id}.png`;
    link.click();
  }, [displayItems, currentIndex]);

  // 导航
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const handleItemClick = useCallback((_item: ImagePreviewItem, index: number) => {
    setCurrentIndex(index);
    setIsFullscreen(true);
  }, []);

  const currentItem = displayItems[currentIndex];

  return (
    <BaseNode
      data={data}
      icon={<ImageIcon className="w-5 h-5" />}
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
            <span className="text-sm font-medium text-[#3ecf8e]">加载图片...</span>
          </div>
        </div>
      )}

      {/* 图片网格 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length > 0 && (
        <div className="mt-3 space-y-3">
          <ImageGrid items={displayItems} onItemClick={handleItemClick} />

          {/* 操作栏 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}>
            <span className="text-gray-500">{displayItems.length} 张图片</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFullscreen(true)} className="p-1.5 rounded-lg hover:bg-white/10">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                style={{ background: '#3ecf8e' }}
              >
                <Download className="w-3 h-3" />
                <span>下载</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 无数据 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length === 0 && (
        <div className="mt-3 p-6 rounded-xl border text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">暂无图片</p>
        </div>
      )}

      {/* 全屏预览 */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full h-full flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
            <img
              src={currentItem.url}
              alt={currentItem.title}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>

          {displayItems.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-sm">
                {currentIndex + 1} / {displayItems.length}
              </div>
            </>
          )}
        </div>
      )}
    </BaseNode>
  );
};

ImagePreviewNode.displayName = 'ImagePreviewNode';

export default ImagePreviewNode;