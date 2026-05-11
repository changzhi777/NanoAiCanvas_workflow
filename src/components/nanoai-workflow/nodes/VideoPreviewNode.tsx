/**
 * 视频预览节点 - 展示视频生成结果
 * 功能：视频播放器 + 缩略图列表
 */

import { useCallback, useState, useMemo } from 'react';
import { Video, Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface VideoPreviewItem {
  id: string;
  url: string;
  thumbnail?: string;
  title?: string;
  duration?: number;
}

export interface VideoPreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean;
    sourceNodeId?: string;
    autoPlay?: boolean;
  };
  result?: {
    videoUrl?: string;
    videos?: string[];
    items?: VideoPreviewItem[];
    duration?: number;
  };
}

// ==================== 工具函数 ====================

const generateId = () => `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ==================== 主组件 ====================

export const VideoPreviewNode = ({ id, data }: NodeProps<VideoPreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // 转换为视频项
  const displayItems = useMemo(() => {
    if (!resultData) return [];
    const items: VideoPreviewItem[] = [];

    if (resultData.videos?.length) {
      resultData.videos.forEach((url: string, i: number) => {
        items.push({ id: generateId(), url, title: `视频 ${i + 1}` });
      });
    }
    if (resultData.items?.length) {
      resultData.items.forEach((item: VideoPreviewItem) => {
        const { id: _existingId, ...rest } = item;
        items.push({ id: item.id || generateId(), ...rest });
      });
    }
    if (resultData.videoUrl && items.length === 0) {
      items.push({ id: generateId(), url: resultData.videoUrl, title: '视频', duration: resultData.duration });
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
    link.download = `video-${item.id}.mp4`;
    link.click();
  }, [displayItems, currentIndex]);

  // 导航
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const currentItem = displayItems[currentIndex];

  // 格式化时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <BaseNode
      data={data}
      icon={<Video className="w-4 h-4" />}
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
            <span className="text-sm font-medium text-[#3ecf8e]">加载视频...</span>
          </div>
        </div>
      )}

      {/* 视频播放器 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length > 0 && (
        <div className="mt-3 space-y-3">
          {/* 主播放器 */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black">
            <div className="aspect-video flex items-center justify-center">
              {currentItem?.url ? (
                <video
                  key={currentItem.url}
                  src={currentItem.url}
                  controls={true}
                  autoPlay={data.params.autoPlay}
                  className="w-full h-full object-contain"
                  poster={currentItem.thumbnail}
                  onEnded={() => {}}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Video className="w-16 h-16" />
                  <span>暂无视频</span>
                </div>
              )}
            </div>

            {/* 导航控制 */}
            {displayItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70">
                <button onClick={handlePrev} className="p-1 rounded-full hover:bg-white/20 text-white">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white text-xs font-medium px-2">
                  {currentIndex + 1} / {displayItems.length}
                </span>
                <button onClick={handleNext} className="p-1 rounded-full hover:bg-white/20 text-white">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 视频信息 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">
                {currentItem?.title || '视频'} {currentItem?.duration && `· ${formatDuration(currentItem.duration)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
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

          {/* 缩略图列表 */}
          {displayItems.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {displayItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentIndex(index); }}
                  className={cn(
                    'flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all',
                    index === currentIndex
                      ? 'border-[#3ecf8e] shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-6 h-6 text-gray-500" />
                    )}
                    {item.duration && (
                      <span className="absolute bottom-1 right-1 px-1 rounded text-[10px] bg-black/70 text-white">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 无数据 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length === 0 && (
        <div className="mt-3 p-6 rounded-xl border text-center">
          <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">暂无视频</p>
        </div>
      )}
    </BaseNode>
  );
};

VideoPreviewNode.displayName = 'VideoPreviewNode';

export default VideoPreviewNode;