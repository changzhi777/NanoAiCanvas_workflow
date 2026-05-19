/**
 * 预览节点 - 通用结果展示里程碑节点
 * 功能：展示API调用任务后的执行结果（图片、视频、音频、对白等）
 */

import { useCallback, useState, useMemo } from 'react';
import { Eye, Download, X, ChevronLeft, ChevronRight, Columns, Maximize2, Film, Music, Image, FileText, Save } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface PreviewItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'text';
  url?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: number;
  timestamp?: number;
}

export interface PreviewNodeData extends WorkflowNodeData {
  params: {
    // 展示模式
    displayMode: 'gallery' | 'player' | 'mixed' | 'detail';
    // 内容类型
    contentType: 'image' | 'video' | 'audio' | 'text' | 'mixed';
    // 数据源配置
    sourceNodeId?: string;  // 手动指定数据源节点
    autoConnectSource?: boolean;  // 自动从上游连接获取
    // 播放设置
    autoPlay?: boolean;
    showControls?: boolean;
    // 网格设置
    thumbnailSize: 'small' | 'medium' | 'large';
    gridColumns: 2 | 3 | 4;
    // 对比模式
    compareMode?: boolean;
  };
  result?: {
    content?: string | Array<Record<string, unknown>>;
    items?: PreviewItem[];
    images?: string[];
    text?: string;
    audioUrl?: string;
    videoUrl?: string;
    thumbnail?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  };
}

// ==================== 工具函数 ====================

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ==================== 子组件 ====================

/** 图片画廊组件 */
const ImageGallery = ({ items, onItemClick }: { items: PreviewItem[]; onItemClick: (item: PreviewItem, index: number) => void }) => {
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
              <Image className="w-8 h-8 text-gray-400" />
            )}
          </div>
          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <span className="text-white text-xs font-medium truncate">{item.title || `图片 ${index + 1}`}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

/** 播放器组件 */
const MediaPlayer = ({ item, onNext, onPrev, hasMultiple, currentIndex, total }: {
  item: PreviewItem;
  onNext?: () => void;
  onPrev?: () => void;
  hasMultiple?: boolean;
  currentIndex?: number;
  total?: number;
}) => {
  const { isDark } = useTheme();

  return (
    <div className="space-y-3">
      {/* 主播放区 */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black">
        <div className="aspect-video flex items-center justify-center">
          {item.type === 'image' && item.url && (
            <img src={item.url} alt={item.title} className="w-full h-full object-contain" />
          )}
          {item.type === 'video' && item.url && (
            <video
              src={item.url}
              controls={true}
              autoPlay={false}
              className="w-full h-full object-contain"
              poster={item.thumbnail}
            />
          )}
          {item.type === 'audio' && item.url && (
            <div className="flex flex-col items-center gap-4 p-8">
              <Music className="w-16 h-16 text-[#3ecf8e]" />
              <audio
                src={item.url}
                controls={true}
                autoPlay={false}
                className="w-full"
              />
            </div>
          )}
          {item.type === 'text' && (
            <div className="w-full h-full p-4 overflow-auto">
              <pre className={cn('text-sm whitespace-pre-wrap', isDark ? 'text-gray-300' : 'text-gray-700')}>
                {item.url || item.description || '无文本内容'}
              </pre>
            </div>
          )}
        </div>

        {/* 导航控制 */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70">
            <button onClick={onPrev} className="p-1 rounded-full hover:bg-white/20 text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-medium px-2">{currentIndex! + 1} / {total}</span>
            <button onClick={onNext} className="p-1 rounded-full hover:bg-white/20 text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** 详情面板组件 */
const DetailPanel = ({ items, currentIndex }: { items: PreviewItem[]; currentIndex: number }) => {
  const { isDark } = useTheme();
  const currentItem = items[currentIndex];

  if (!currentItem) return null;

  return (
    <div className="space-y-3">
      {/* 主图 */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
          {currentItem.type === 'image' && currentItem.url && (
            <img src={currentItem.url} alt={currentItem.title} className="w-full h-full object-contain" />
          )}
          {currentItem.type === 'video' && currentItem.url && (
            <video src={currentItem.url} controls className="w-full h-full object-contain" />
          )}
          {currentItem.type === 'audio' && (
            <div className="flex flex-col items-center gap-4">
              <Music className="w-16 h-16 text-[#3ecf8e]" />
              <audio src={currentItem.url} controls className="w-64" />
            </div>
          )}
          {currentItem.type === 'text' && (
            <div className="w-full h-full p-4 overflow-auto">
              <pre className={cn('text-sm whitespace-pre-wrap', isDark ? 'text-gray-300' : 'text-gray-700')}>
                {currentItem.url || currentItem.description}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 缩略图列表 */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {}}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                index === currentIndex
                  ? 'border-[#3ecf8e] shadow-md'
                  : cn('border-transparent', isDark ? 'opacity-60 hover:opacity-100' : 'opacity-80 hover:opacity-100')
              )}
            >
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {item.thumbnail || item.url ? (
                  <img src={item.thumbnail || item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 元信息 */}
      <div className={cn('p-3 rounded-lg', isDark ? 'bg-white/5' : 'bg-gray-50')}>
        <h4 className={cn('text-sm font-semibold mb-2', isDark ? 'text-white' : 'text-gray-700')}>
          {currentItem.title || '详情'}
        </h4>
        <div className="space-y-1 text-xs">
          {currentItem.description && (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{currentItem.description}</p>
          )}
          <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>
            类型: {currentItem.type} {currentItem.duration && `| 时长: ${currentItem.duration}s`}
          </p>
        </div>
      </div>
    </div>
  );
};

/** 对比模式组件 */
const CompareMode = ({ items }: { items: PreviewItem[] }) => {
  const { isDark } = useTheme();
  const [compareIndices, setCompareIndices] = useState<[number, number]>([0, 1]);

  const leftItem = items[compareIndices[0]];
  const rightItem = items[compareIndices[1]];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* 左图 */}
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
            {leftItem?.url ? (
              <img src={leftItem.url} alt="Left" className="w-full h-full object-contain" />
            ) : (
              <Eye className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-white text-xs bg-black/60">
            #{compareIndices[0] + 1}
          </div>
        </div>

        {/* 右图 */}
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
            {rightItem?.url ? (
              <img src={rightItem.url} alt="Right" className="w-full h-full object-contain" />
            ) : (
              <Eye className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-white text-xs bg-black/60">
            #{compareIndices[1] + 1}
          </div>
        </div>
      </div>

      {/* 选择器 */}
      <div className="flex items-center justify-center gap-4">
        <select
          value={compareIndices[0]}
          onChange={(e) => setCompareIndices([parseInt(e.target.value), compareIndices[1]])}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs border',
            isDark ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-gray-200'
          )}
        >
          {items.map((_, i) => (
            <option key={i} value={i}>图片 {i + 1}</option>
          ))}
        </select>
        <span className="text-gray-500 text-xs">对比</span>
        <select
          value={compareIndices[1]}
          onChange={(e) => setCompareIndices([compareIndices[0], parseInt(e.target.value)])}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs border',
            isDark ? 'bg-gray-800 border-white/20 text-white' : 'bg-white border-gray-200'
          )}
        >
          {items.map((_, i) => (
            <option key={i} value={i}>图片 {i + 1}</option>
          ))}
        </select>
      </div>

      <div className={cn('flex items-center justify-center gap-2 py-2 rounded-lg text-xs', isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600')}>
        <Columns className="w-4 h-4" />
        <span>对比模式</span>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const PreviewNode = ({ id, data }: NodeProps<PreviewNodeData>) => {
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

  // 合并数据源：手动配置 > 上游连接 > 当前结果
  const resultData = useMemo(() => {
    // 如果手动指定了数据源节点
    if (data.params.sourceNodeId) {
      const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId);
      if (sourceNode?.data?.result) return sourceNode.data.result;
    }
    // 上游连接
    if (upstreamData) return upstreamData;
    // 当前结果
    return data.result;
  }, [data.params.sourceNodeId, nodes, upstreamData, data.result]);

  // 将结果数据转换为 PreviewItem 数组
  const displayItems = useMemo(() => {
    if (!resultData) return [];

    const items: PreviewItem[] = [];

    // 从 images 数组
    if (resultData.images?.length) {
      resultData.images.forEach((url: string, i: number) => {
        items.push({ id: generateId(), type: 'image', url, title: `图片 ${i + 1}` });
      });
    }

    // 从 items 数组
    if (resultData.items?.length) {
      resultData.items.forEach((item: PreviewItem) => {
        const { id: _existingId, ...rest } = item;
        items.push({ id: item.id || generateId(), ...rest });
      });
    }

    // 从 imageUrl
    if (resultData.imageUrl) {
      items.push({ id: generateId(), type: 'image', url: resultData.imageUrl, title: '图片' });
    }

    // 从 videoUrl
    if (resultData.videoUrl) {
      items.push({ id: generateId(), type: 'video', url: resultData.videoUrl, title: '视频', duration: resultData.duration });
    }

    // 从 audioUrl
    if (resultData.audioUrl || resultData.musicUrl) {
      items.push({ id: generateId(), type: 'audio', url: resultData.audioUrl || resultData.musicUrl, title: '音频', duration: resultData.duration });
    }

    // 从 text
    if (resultData.text) {
      items.push({ id: generateId(), type: 'text', url: resultData.text, title: '文本' });
    }

    // 从 content
    if (resultData.content) {
      if (typeof resultData.content === 'string') {
        items.push({ id: generateId(), type: 'text', url: resultData.content, title: '内容' });
      } else if (Array.isArray(resultData.content)) {
        resultData.content.forEach((c: string | Record<string, unknown>, i: number) => {
          if (typeof c === 'string') {
            items.push({ id: generateId(), type: 'image', url: c, title: `内容 ${i + 1}` });
          } else if (c.url || c.imageUrl) {
            items.push({ id: generateId(), type: (['image', 'video', 'audio', 'text'].includes(c.type as string) ? c.type : 'image') as PreviewItem['type'], url: (c.url as string) || (c.imageUrl as string), title: (c.title as string) || `内容 ${i + 1}` });
          }
        });
      }
    }

    return items;
  }, [resultData]);

  // 执行：获取上游数据
  const handleExecute = useCallback(async () => {
    updateNode(id, { status: NodeStatus.RUNNING });

    try {
      // 尝试从上游获取数据
      let result = { message: '暂无数据' };

      if (data.params.autoConnectSource) {
        const incomingEdge = edges.find(e => e.target === id);
        if (incomingEdge) {
          const sourceNode = nodes.find(n => n.id === incomingEdge.source);
          result = sourceNode?.data?.result || { message: '上游节点无数据' };
        }
      } else if (data.params.sourceNodeId) {
        const sourceNode = nodes.find(n => n.id === data.params.sourceNodeId);
        result = sourceNode?.data?.result || { message: '指定节点无数据' };
      }

      updateNode(id, { status: NodeStatus.SUCCESS, result });
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '获取数据失败'
      });
    }
  }, [id, updateNode, edges, nodes, data.params.autoConnectSource, data.params.sourceNodeId]);

  // 下载功能
  const handleDownload = useCallback(() => {
    const item = displayItems[currentIndex];
    if (!item?.url) return;

    if (item.type === 'image') {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `preview-${item.id}.png`;
      link.click();
    } else if (item.type === 'video' || item.type === 'audio') {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `preview-${item.id}.${item.type === 'video' ? 'mp4' : 'mp3'}`;
      link.click();
    }
  }, [displayItems, currentIndex]);

  // 导出 JSON
  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      nodeId: id,
      result: resultData,
      items: displayItems,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `preview-${id}-${Date.now()}.json`;
    link.click();
  }, [id, resultData, displayItems]);

  // 导航
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const handleItemClick = useCallback((_item: PreviewItem, index: number) => {
    setCurrentIndex(index);
  }, []);

  const currentItem = displayItems[currentIndex];

  // 参数 Schema
  const paramSchema = [
    {
      key: 'displayMode',
      label: '展示模式',
      type: 'select' as const,
      options: [
        { label: '🏖️ 图片画廊', value: 'gallery' },
        { label: '▶️ 播放器', value: 'player' },
        { label: '🔄 混合模式', value: 'mixed' },
        { label: '📋 详情面板', value: 'detail' },
      ],
      defaultValue: 'gallery',
    },
    {
      key: 'contentType',
      label: '内容类型',
      type: 'select' as const,
      options: [
        { label: '图片', value: 'image' },
        { label: '视频', value: 'video' },
        { label: '音频', value: 'audio' },
        { label: '文本', value: 'text' },
        { label: '混合', value: 'mixed' },
      ],
      defaultValue: 'image',
    },
    {
      key: 'autoConnectSource',
      label: '自动连接上游',
      type: 'toggle' as const,
      defaultValue: true,
      description: '自动从上游节点获取数据',
    },
    {
      key: 'compareMode',
      label: '对比模式',
      type: 'toggle' as const,
      defaultValue: false,
    },
    {
      key: 'showControls',
      label: '显示控制栏',
      type: 'toggle' as const,
      defaultValue: true,
    },
  ];

  const handleParamsChange = useCallback((_params: Record<string, any>) => {
    // 参数更新后的回调
  }, []);

  // 获取内容类型图标
  const getContentIcon = () => {
    const type = data.params.contentType || 'mixed';
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Film className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
    }
  };

  return (
    <BaseNode
      data={data}
      icon={getContentIcon()}
      headerAction={
        <button
          onClick={handleExecute}
          className={cn(
            'p-1.5 rounded-lg transition-all duration-200',
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          )}
          title="从上游获取数据"
        >
          <Download className="w-4 h-4 text-[#3ecf8e]" />
        </button>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      <ExecuteButton onExecute={handleExecute} status={data.status} label="获取预览" />

      {/* 加载状态 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-6 rounded-xl border-2 border-dashed animate-pulse" style={{
          background: isDark ? 'rgba(62, 207, 142, 0.05)' : 'rgba(62, 207, 142, 0.05)',
          borderColor: isDark ? 'rgba(62, 207, 142, 0.4)' : 'rgba(62, 207, 142, 0.4)',
        }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium" style={{ color: '#3ecf8e' }}>获取预览数据...</span>
          </div>
        </div>
      )}

      {/* 成功状态 - 结果展示 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length > 0 && (
        <div className="mt-3 space-y-3">
          {/* 模式选择器 */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}>
            {(['gallery', 'player', 'detail'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {}}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
                  data.params.displayMode === mode
                    ? 'bg-[#3ecf8e] text-white shadow-md'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {mode === 'gallery' ? '🏖️' : mode === 'player' ? '▶️' : '📋'}
              </button>
            ))}
          </div>

          {/* 图片画廊模式 */}
          {data.params.displayMode === 'gallery' && !data.params.compareMode && (
            <ImageGallery items={displayItems} onItemClick={handleItemClick} />
          )}

          {/* 播放器模式 */}
          {data.params.displayMode === 'player' && (
            <MediaPlayer
              item={currentItem || displayItems[0]}
              onNext={handleNext}
              onPrev={handlePrev}
              hasMultiple={displayItems.length > 1}
              currentIndex={currentIndex}
              total={displayItems.length}
            />
          )}

          {/* 详情面板模式 */}
          {data.params.displayMode === 'detail' && (
            <DetailPanel items={displayItems} currentIndex={currentIndex} />
          )}

          {/* 对比模式 */}
          {data.params.compareMode && displayItems.length >= 2 && (
            <CompareMode items={displayItems} />
          )}

          {/* 操作栏 */}
          {data.params.showControls && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{
              background: isDark ? '#1a1a1a' : '#f5f5f5',
            }}>
              <div className="flex items-center gap-2 text-gray-500">
                <span>{displayItems.length} 个项目</span>
                {currentItem?.duration && <span>{currentItem.duration}s</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: '#3ecf8e' }}
                >
                  <Download className="w-3 h-3" />
                  <span>下载</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: isDark ? '#333' : '#e5e5e5' }}
                >
                  <Save className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 无数据状态 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length === 0 && (
        <div className="mt-3 p-6 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
          <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">暂无预览内容</p>
          <p className="text-xs text-gray-400 mt-1">请连接上游节点或手动指定数据源</p>
        </div>
      )}

      {/* 全屏预览 */}
      {isFullscreen && currentItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full h-full flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
            {currentItem.type === 'image' && currentItem.url && (
              <img
                src={currentItem.url}
                alt={currentItem.title}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            )}
            {currentItem.type === 'video' && currentItem.url && (
              <video
                src={currentItem.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
              />
            )}
            {currentItem.type === 'text' && (
              <div className="max-w-2xl max-h-full overflow-auto p-8">
                <pre className="text-white text-sm whitespace-pre-wrap">{currentItem.url}</pre>
              </div>
            )}
          </div>

          {/* 全屏导航 */}
          {displayItems.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
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

PreviewNode.displayName = 'PreviewNode';

export default PreviewNode;