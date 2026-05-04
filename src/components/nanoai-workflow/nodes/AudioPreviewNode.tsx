/**
 * 音频预览节点 - 展示音频/TTS生成结果
 * 功能：音频播放器 + 波形显示 + 下载
 */

import { useCallback, useState, useMemo } from 'react';
import { Music, Download, Play, Pause, Volume2, Maximize2 } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface AudioPreviewItem {
  id: string;
  url: string;
  title?: string;
  duration?: number;
  waveform?: number[];
}

export interface AudioPreviewNodeData extends WorkflowNodeData {
  params: {
    autoConnectSource?: boolean;
    sourceNodeId?: string;
    autoPlay?: boolean;
  };
  result?: {
    audioUrl?: string;
    musicUrl?: string;
    audios?: string[];
    items?: AudioPreviewItem[];
    duration?: number;
  };
}

// ==================== 工具函数 ====================

const generateId = () => `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// 格式化时长
const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 生成随机波形数据
const generateWaveform = (length: number = 50) => {
  return Array.from({ length }, () => Math.random() * 0.8 + 0.2);
};

// ==================== 主组件 ====================

export const AudioPreviewNode = ({ id, data }: NodeProps<AudioPreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

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

  // 转换为音频项
  const displayItems = useMemo(() => {
    if (!resultData) return [];
    const items: AudioPreviewItem[] = [];

    if (resultData.audios?.length) {
      resultData.audios.forEach((url: string, i: number) => {
        items.push({ id: generateId(), url, title: `音频 ${i + 1}`, duration: resultData.duration });
      });
    }
    if (resultData.items?.length) {
      resultData.items.forEach((item: AudioPreviewItem) => {
        const { id: _existingId, ...rest } = item;
        items.push({ id: item.id || generateId(), ...rest });
      });
    }
    if ((resultData.audioUrl || resultData.musicUrl) && items.length === 0) {
      items.push({
        id: generateId(),
        url: resultData.audioUrl || resultData.musicUrl,
        title: '音频',
        duration: resultData.duration
      });
    }
    return items;
  }, [resultData]);

  const currentItem = displayItems[0];

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
    if (!currentItem?.url) return;
    const link = document.createElement('a');
    link.href = currentItem.url;
    link.download = `audio-${currentItem.id}.mp3`;
    link.click();
  }, [currentItem]);

  // 播放控制（通过 ref）
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // 波形数据
  const waveformData = useMemo(() => {
    return generateWaveform(60);
  }, [data.result]);

  // 进度计算
  const progress = currentItem?.duration ? (currentTime / currentItem.duration) * 100 : 0;

  return (
    <BaseNode
      data={data}
      icon={<Music className="w-5 h-5" />}
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
            <span className="text-sm font-medium text-[#3ecf8e]">加载音频...</span>
          </div>
        </div>
      )}

      {/* 音频播放器 */}
      {data.status === NodeStatus.SUCCESS && displayItems.length > 0 && currentItem && (
        <div className="mt-3 space-y-3">
          {/* 播放器卡片 */}
          <div className={cn(
            'p-4 rounded-xl border',
            isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          )}>
            {/* 音频可视化占位 */}
            <div className="flex items-center justify-center gap-1 h-16 mb-4">
              {waveformData.map((height, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all',
                    i / waveformData.length < progress / 100
                      ? 'bg-[#3ecf8e]'
                      : isDark ? 'bg-gray-600' : 'bg-gray-300'
                  )}
                  style={{ height: `${height * 100}%` }}
                />
              ))}
            </div>

            {/* 音频元素（隐藏） */}
            <audio
              src={currentItem.url}
              autoPlay={data.params.autoPlay}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* 控制栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 播放按钮 */}
                <button
                  onClick={togglePlay}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    'bg-[#3ecf8e] hover:bg-[#35b87a] text-white shadow-lg hover:shadow-xl'
                  )}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* 标题和时间 */}
                <div>
                  <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {currentItem.title || '音频'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDuration(currentTime)} / {formatDuration(currentItem.duration)}
                  </p>
                </div>
              </div>

              {/* 音量 */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
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

          {/* 音频列表 */}
          {displayItems.length > 1 && (
            <div className="space-y-2">
              {displayItems.map((item, index) => (
                <button
                  key={item.id}
                  className={cn(
                    'w-full p-3 rounded-lg border transition-all text-left',
                    isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isDark ? 'bg-[#3ecf8e]/20' : 'bg-[#3ecf8e]/10'
                      )}>
                        <Music className="w-4 h-4 text-[#3ecf8e]" />
                      </div>
                      <div>
                        <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                          {item.title || `音频 ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">{formatDuration(item.duration)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {}}
                      className="p-2 rounded-full hover:bg-white/10"
                    >
                      <Play className="w-4 h-4" />
                    </button>
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
          <Music className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">暂无音频</p>
        </div>
      )}
    </BaseNode>
  );
};

AudioPreviewNode.displayName = 'AudioPreviewNode';

export default AudioPreviewNode;