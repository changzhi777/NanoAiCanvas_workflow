/**
 * 图片预览节点 - 展示图片生成结果
 * 功能：画廊模式 + 灯箱全屏查看 + 提示词显示 + 拖拽缩放 + 生成信息
 */

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Image as ImageIcon, Download, X, ChevronLeft, ChevronRight, Maximize2, ZoomIn, Copy, Clock, Calendar, FileImage, GripVertical } from 'lucide-react';
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
  prompt?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  generatedAt?: string;
  generationTime?: number;
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
    prompt?: string;
    items?: ImagePreviewItem[];
    startedAt?: string;
    completedAt?: string;
  };
}

// ==================== 工具函数 ====================

const generateId = () => `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch {
    return isoStr;
  }
}


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

/** 提示词展示组件 */
const PromptDisplay = ({ prompt, isDark }: { prompt?: string; isDark: boolean }) => {
  const [copied, setCopied] = useState(false);
  if (!prompt || typeof prompt !== 'string') return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={cn(
      'p-2.5 rounded-lg border text-xs space-y-1.5',
      isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
    )}>
      <div className="flex items-center justify-between">
        <span className={cn('font-medium', isDark ? 'text-blue-400' : 'text-blue-600')}>
          提示词
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'p-1 rounded transition-colors',
            isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          )}
          title="复制提示词"
        >
          <Copy className="w-3 h-3" />
          {copied && <span className="ml-1 text-[10px] text-green-500">已复制</span>}
        </button>
      </div>
      <p className={cn(
        'leading-relaxed break-all max-h-20 overflow-y-auto',
        isDark ? 'text-slate-300' : 'text-gray-700'
      )}>
        {prompt}
      </p>
    </div>
  );
};

/** 生成信息面板 */
const GenInfoPanel = ({ items, resultData, isDark }: { items: ImagePreviewItem[]; resultData: any; isDark: boolean }) => {
  const startedAt = resultData?.startedAt;
  const completedAt = resultData?.completedAt;

  // 计算生成用时
  let generationTime = '';
  if (startedAt && completedAt) {
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    generationTime = formatDuration(ms);
  }

  const panelCls = cn(
    'p-2.5 rounded-lg border space-y-2',
    isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
  );
  const labelCls = 'text-[10px] text-muted-foreground';
  const valueCls = cn('text-xs font-medium', isDark ? 'text-slate-200' : 'text-gray-800');

  return (
    <div className={panelCls}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileImage className="w-3.5 h-3.5 text-purple-400" />
        生成信息
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {generationTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-green-400 shrink-0" />
            <div>
              <div className={labelCls}>生成用时</div>
              <div className={valueCls}>{generationTime}</div>
            </div>
          </div>
        )}
        {completedAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
            <div>
              <div className={labelCls}>生成时间</div>
              <div className={valueCls}>{formatDateTime(completedAt)}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3 text-orange-400 shrink-0" />
          <div>
            <div className={labelCls}>图片数量</div>
            <div className={valueCls}>{items.length} 张</div>
          </div>
        </div>
        {items.length > 0 && items[0].width && (
          <div>
            <div className={labelCls}>图片尺寸</div>
            <div className={valueCls}>{items[0].width}×{items[0].height}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 拖拽缩放 Hook ====================

function useResizable(minW = 280, minH = 200) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = { x: e.clientX, y: e.clientY, w: size?.w || 280, h: size?.h || 200 };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const w = Math.max(minW, start.current.w + (ev.clientX - start.current.x));
      const h = Math.max(minH, start.current.h + (ev.clientY - start.current.y));
      setSize({ w, h });
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size, minW, minH]);

  const resetSize = useCallback(() => setSize(null), []);

  return { size, onMouseDown, resetSize };
}

// ==================== 主组件 ====================

export const ImagePreviewNode = ({ id, data }: NodeProps<ImagePreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageMeta, setImageMeta] = useState<Record<string, { width: number; height: number }>>({});
  const resize = useResizable(280, 200);

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

  // 提取提示词
  const promptText = useMemo(() => {
    const p = resultData?.prompt;
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object') {
      try { return Object.entries(p).map(([k, v]) => `${k}: ${v}`).join(', '); } catch { return ''; }
    }
    return String(p);
  }, [resultData]);

  // 转换为图片项
  const displayItems = useMemo(() => {
    if (!resultData) return [];
    const items: ImagePreviewItem[] = [];

    if (resultData.images?.length) {
      resultData.images.forEach((url: string, i: number) => {
        items.push({ id: generateId(), url, title: `图片 ${i + 1}`, prompt: promptText, generatedAt: resultData.completedAt });
      });
    }
    if (resultData.items?.length) {
      resultData.items.forEach((item: ImagePreviewItem) => {
        const { id: _existingId, ...rest } = item;
        items.push({ id: item.id || generateId(), ...rest });
      });
    }
    if (resultData.imageUrl && items.length === 0) {
      items.push({ id: generateId(), url: resultData.imageUrl, title: '图片', prompt: promptText, generatedAt: resultData.completedAt });
    }
    return items;
  }, [resultData, promptText]);

  // 获取图片尺寸信息
  useEffect(() => {
    displayItems.forEach(item => {
      if (item.url && !imageMeta[item.id]) {
        const img = new Image();
        img.onload = () => {
          setImageMeta(prev => ({ ...prev, [item.id]: { width: img.naturalWidth, height: img.naturalHeight } }));
        };
        img.src = item.url;
      }
    });
  }, [displayItems]);

  // 合并尺寸信息到 items
  const itemsWithMeta = useMemo(() => {
    return displayItems.map(item => ({
      ...item,
      width: item.width || imageMeta[item.id]?.width,
      height: item.height || imageMeta[item.id]?.height,
    }));
  }, [displayItems, imageMeta]);

  // 执行
  const handleExecute = useCallback(async () => {
    updateNode(id, { status: NodeStatus.RUNNING });
    try {
      let result: any = { message: '暂无数据' };
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
    const item = itemsWithMeta[currentIndex];
    if (!item?.url) return;
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `image-${item.id}.png`;
    link.click();
  }, [itemsWithMeta, currentIndex]);

  // 导航
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % itemsWithMeta.length);
  }, [itemsWithMeta.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + itemsWithMeta.length) % itemsWithMeta.length);
  }, [itemsWithMeta.length]);

  const handleItemClick = useCallback((_item: ImagePreviewItem, index: number) => {
    setCurrentIndex(index);
    setIsFullscreen(true);
    setZoomLevel(1);
  }, []);

  const currentItem = itemsWithMeta[currentIndex];

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  // 计算缩放比例
  const baseWidth = 280;
  const scale = resize.size ? resize.size.w / baseWidth : 1;

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
      <div
        className="relative"
        style={resize.size ? { width: resize.size.w, minHeight: resize.size.h } : undefined}
      >
        <ExecuteButton onExecute={handleExecute} status={data.status} label="刷新预览" />

        {/* 加载状态 */}
        {data.status === NodeStatus.RUNNING && (
          <div className="mt-3 p-6 rounded-xl border-2 border-dashed" style={{
            background: 'rgba(62, 207, 142, 0.05)',
            borderColor: 'rgba(62, 207, 142, 0.4)',
          }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-[#3ecf8e]">加载图片...</span>
            </div>
          </div>
        )}

        {/* 图片网格 + 提示词 + 信息 */}
        {data.status === NodeStatus.SUCCESS && itemsWithMeta.length > 0 && (
          <div className="mt-3 space-y-3" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: resize.size ? baseWidth : undefined }}>
            <ImageGrid items={itemsWithMeta} onItemClick={handleItemClick} />

            {/* 提示词显示 */}
            <PromptDisplay prompt={promptText} isDark={isDark} />

            {/* 生成信息 */}
            <GenInfoPanel items={itemsWithMeta} resultData={resultData} isDark={isDark} />

            {/* 操作栏 */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}>
              <span className="text-gray-500">{itemsWithMeta.length} 张图片</span>
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
        {data.status === NodeStatus.SUCCESS && itemsWithMeta.length === 0 && (
          <div className="mt-3 p-6 rounded-xl border text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">暂无图片</p>
          </div>
        )}

        {/* 拖拽缩放手柄 */}
        {data.status === NodeStatus.SUCCESS && itemsWithMeta.length > 0 && (
          <div
            className={cn(
              'absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end',
              'opacity-30 hover:opacity-70 transition-opacity z-10',
            )}
            onMouseDown={resize.onMouseDown}
            onDoubleClick={resize.resetSize}
            title="拖拽调整大小 · 双击重置"
          >
            <GripVertical className="w-3.5 h-3.5 rotate-[135deg]" />
          </div>
        )}
      </div>

      {/* 全屏预览 - 支持缩放查看原始尺寸 */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1); }}
        >
          {/* 顶部工具栏 */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
            {/* 提示词 */}
            <div className="flex-1 mr-4">
              {promptText && (
                <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-200 max-w-md truncate">
                  <span className="text-blue-400 font-medium mr-1">Prompt:</span>{promptText}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 缩放控制 */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                <button onClick={handleZoomOut} className="px-1.5 hover:text-blue-400">−</button>
                <button onClick={handleZoomReset} className="px-2 hover:text-blue-400">{Math.round(zoomLevel * 100)}%</button>
                <button onClick={handleZoomIn} className="px-1.5 hover:text-blue-400">+</button>
              </div>
              <button onClick={handleDownload} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => { setIsFullscreen(false); setZoomLevel(1); }} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 图片区域 - 原始尺寸 + 可缩放 */}
          <div
            className="w-full h-full flex items-center justify-center overflow-auto"
            onClick={e => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              setZoomLevel(prev => {
                const next = prev + (e.deltaY > 0 ? -0.15 : 0.15);
                return Math.max(0.25, Math.min(4, next));
              });
            }}
          >
            <img
              src={currentItem.url}
              alt={currentItem.title}
              className="rounded-lg shadow-2xl transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          </div>

          {/* 底部信息栏 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-black/70 text-white text-xs" onClick={e => e.stopPropagation()}>
            {currentItem.width && <span>{currentItem.width}×{currentItem.height}</span>}
            {resultData?.completedAt && <span>{formatDateTime(resultData.completedAt)}</span>}
            {itemsWithMeta.length > 1 && <span>{currentIndex + 1} / {itemsWithMeta.length}</span>}
          </div>

          {/* 左右导航 */}
          {itemsWithMeta.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); setZoomLevel(1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); setZoomLevel(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </BaseNode>
  );
};

ImagePreviewNode.displayName = 'ImagePreviewNode';

export default ImagePreviewNode;
