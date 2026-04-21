import { useCallback, useState } from 'react';
import { Eye, Play, Download, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

export interface PreviewNodeData extends WorkflowNodeData {
  params: {
    sourceType: 'image' | 'video' | 'audio' | 'text';
    sourceUrl?: string;
    autoPlay?: boolean;
    showControls?: boolean;
    thumbnailSize?: 'small' | 'medium' | 'large';
  };
  result?: {
    content?: any;
    items?: any[];
    thumbnail?: string;
    duration?: number;
  };
}

export const PreviewNode = ({ id, data }: NodeProps<PreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode } = useNanoaiWorkflowStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExecute = useCallback(() => {
    updateNode(id, { status: NodeStatus.RUNNING });

    // 模拟预览加载
    setTimeout(() => {
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          items: [
            { type: 'image', url: '/preview/frame1.jpg', timestamp: 0 },
            { type: 'image', url: '/preview/frame2.jpg', timestamp: 1 },
            { type: 'image', url: '/preview/frame3.jpg', timestamp: 2 },
          ],
          thumbnail: '/preview/thumb.jpg',
          duration: 3,
        },
      });
    }, 1500);
  }, [id, updateNode]);

  const handleNext = useCallback(() => {
    if (data.result?.items) {
      setCurrentIndex((prev) => (prev + 1) % data.result!.items!.length);
    }
  }, [data.result]);

  const handlePrev = useCallback(() => {
    if (data.result?.items) {
      setCurrentIndex((prev) => (prev - 1 + data.result!.items!.length) % data.result!.items!.length);
    }
  }, [data.result]);

  const handleDownload = useCallback(() => {
    // 下载预览内容
    console.log('Downloading preview...');
  }, []);

  const currentItem = data.result?.items?.[currentIndex];

  const paramSchema = [
    {
      key: 'sourceType',
      label: '内容类型',
      type: 'select' as const,
      options: [
        { label: '图片', value: 'image' },
        { label: '视频', value: 'video' },
        { label: '音频', value: 'audio' },
        { label: '文本', value: 'text' },
      ],
      defaultValue: 'image',
    },
    {
      key: 'autoPlay',
      label: '自动播放',
      type: 'toggle' as const,
      defaultValue: true,
    },
    {
      key: 'showControls',
      label: '显示控制',
      type: 'toggle' as const,
      defaultValue: true,
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    // 参数已通过ParamEditor更新到data.params中
    console.log('预览节点参数已更新:', params);
  }, []);

  return (
    <BaseNode
      data={data}
      icon={<Eye className="w-5 h-5" />}
      headerAction={
        <button
          className={cn(
            'p-1.5 rounded-lg transition-all duration-200',
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          )}
          title="预览设置"
        >
          <Play className="w-4 h-4 text-[#3ecf8e]" />
        </button>
      }
    >
      {/* 参数编辑器 */}
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      {/* 执行按钮 */}
      <ExecuteButton onExecute={handleExecute} status={data.status} label="生成预览" />

      {/* 预览区域 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-4 rounded-lg border animate-pulse" style={{
          background: isDark ? 'rgba(62, 207, 142, 0.1)' : 'rgba(62, 207, 142, 0.1)',
          borderColor: isDark ? 'rgba(62, 207, 142, 0.3)' : 'rgba(62, 207, 142, 0.3)',
        }}>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#3ecf8e' }}>
            <Play className="w-4 h-4 animate-pulse" />
            <span>生成预览中...</span>
          </div>
        </div>
      )}

      {/* 预览结果 */}
      {data.status === NodeStatus.SUCCESS && data.result && (
        <div className="mt-3 space-y-3">
          {/* 内容预览 */}
          <div className="relative rounded-lg overflow-hidden border-2" style={{
            borderColor: isDark ? '#2e2e2e' : '#e5e7eb',
            background: isDark ? '#0f0f0f' : '#ffffff',
          }}>
            {/* 主预览区 */}
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              {currentItem?.type === 'image' ? (
                <img
                  src={currentItem.url}
                  alt={`Preview ${currentIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : currentItem?.type === 'video' ? (
                <video
                  src={currentItem.url}
                  autoPlay={data.params.autoPlay}
                  controls={data.params.showControls}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center p-4">
                  <Eye className="w-12 h-12 mx-auto mb-2 text-[#3ecf8e]" />
                  <p className="text-sm" style={{ color: isDark ? '#fafafa' : '#0f0f0f' }}>
                    预览内容 {currentIndex + 1}
                  </p>
                </div>
              )}
            </div>

            {/* 控制栏 */}
            {data.params.showControls && data.result?.items && data.result.items.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between" style={{
                background: 'linear-gradient(to-top, rgba(0,0,0,0.8), transparent)',
              }}>
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-white text-xs">
                  {currentIndex + 1} / {data.result?.items?.length || 0}
                </div>

                <button
                  onClick={handleNext}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
                  disabled={currentIndex === (data.result?.items?.length || 1) - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 全屏按钮 */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-0 hover:opacity-100"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* 信息栏 */}
          <div className="flex items-center justify-between p-2 rounded-lg text-xs" style={{
            background: isDark ? '#171717' : '#f5f5f5',
          }}>
            <div className="flex items-center gap-2" style={{ color: '#898989' }}>
              <span>时长: {data.result.duration}s</span>
              <span>•</span>
              <span>帧数: {data.result.items?.length || 0}</span>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded text-white transition-all hover:opacity-80"
              style={{ background: '#3ecf8e' }}
            >
              <Download className="w-3 h-3" />
              <span>下载</span>
            </button>
          </div>
        </div>
      )}

      {/* 全屏预览 */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full h-full max-w-6xl max-h-[80vh] p-4">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full h-full flex items-center justify-center">
              {/* 全屏内容 */}
              {currentItem?.type === 'image' ? (
                <img
                  src={currentItem.url}
                  alt={`Fullscreen preview ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-white">
                  <Eye className="w-24 h-24 mx-auto mb-4 text-[#3ecf8e]" />
                  <p className="text-lg">全屏预览 {currentIndex + 1}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
};

PreviewNode.displayName = 'PreviewNode';

export default PreviewNode;
