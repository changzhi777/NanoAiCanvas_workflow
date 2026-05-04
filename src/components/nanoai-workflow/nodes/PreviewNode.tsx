import { useCallback, useState } from 'react';
import { Eye, Play, Download, X, ChevronLeft, ChevronRight, Columns, Maximize2 } from 'lucide-react';
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
    compareMode?: boolean;
  };
  result?: {
    content?: any;
    items?: any[];
    thumbnail?: string;
    duration?: number;
    imageUrl?: string;
  };
}

export const PreviewNode = ({ id, data }: NodeProps<PreviewNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode } = useNanoaiWorkflowStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExecute = useCallback(() => {
    updateNode(id, { status: NodeStatus.RUNNING });

    setTimeout(() => {
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          items: [
            { type: 'image', url: '/preview/frame1.jpg', timestamp: 0 },
            { type: 'image', url: '/preview/frame2.jpg', timestamp: 1 },
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
      key: 'compareMode',
      label: '对比模式',
      type: 'toggle' as const,
      defaultValue: false,
      description: '启用并排对比视图',
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
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      <ExecuteButton onExecute={handleExecute} status={data.status} label="生成预览" />

      {/* 加载状态 */}
      {data.status === NodeStatus.RUNNING && (
        <div className="mt-3 p-6 rounded-xl border-2 border-dashed animate-pulse" style={{
          background: isDark ? 'rgba(62, 207, 142, 0.05)' : 'rgba(62, 207, 142, 0.05)',
          borderColor: isDark ? 'rgba(62, 207, 142, 0.4)' : 'rgba(62, 207, 142, 0.4)',
        }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium" style={{ color: '#3ecf8e' }}>生成预览中...</span>
          </div>
        </div>
      )}

      {/* 预览结果 - 单图模式 */}
      {data.status === NodeStatus.SUCCESS && data.result && !data.params.compareMode && (
        <div className="mt-3 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" style={{
            background: isDark ? '#0f0f0f' : '#ffffff',
          }}>
            {/* 主预览区 */}
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              {currentItem?.type === 'image' && currentItem?.url ? (
                <img
                  src={currentItem.url}
                  alt={`Preview ${currentIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : data.result?.imageUrl ? (
                <img
                  src={data.result.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">暂无预览内容</p>
                </div>
              )}
            </div>

            {/* 导航控制 */}
            {data.params.showControls && data.result?.items && data.result.items.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
                background: 'rgba(0,0,0,0.7)',
              }}>
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-full hover:bg-white/20 text-white transition-all disabled:opacity-30"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white text-xs font-medium px-2">
                  {currentIndex + 1} / {data.result.items.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-full hover:bg-white/20 text-white transition-all disabled:opacity-30"
                  disabled={currentIndex === data.result.items.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 全屏按钮 */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* 信息栏 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{
            background: isDark ? '#1a1a1a' : '#f5f5f5',
          }}>
            <div className="flex items-center gap-2 text-gray-500">
              {data.result.duration && <span>{data.result.duration}s</span>}
              {data.result.items && <span>{data.result.items.length} 张</span>}
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-80"
              style={{ background: '#3ecf8e' }}
            >
              <Download className="w-3 h-3" />
              <span>下载</span>
            </button>
          </div>
        </div>
      )}

      {/* 预览结果 - 双图对比模式 */}
      {data.status === NodeStatus.SUCCESS && data.result && data.params.compareMode && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {data.result.items?.map((item, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" style={{
                background: isDark ? '#0f0f0f' : '#ffffff',
              }}>
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  {item?.url ? (
                    <img src={item.url} alt={`对比 ${idx + 1}`} className="w-full h-full object-contain" />
                  ) : (
                    <Eye className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-white text-xs" style={{
                  background: 'rgba(0,0,0,0.6)',
                }}>
                  {idx === 0 ? 'NanoBanana2' : 'GPT-Image-2'}
                </div>
              </div>
            ))}
          </div>

          {/* 对比提示 */}
          <div className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs" style={{
            background: isDark ? '#1a1a1a' : '#f0fdf4',
            color: '#3ecf8e',
          }}>
            <Columns className="w-4 h-4" />
            <span>双模型对比模式</span>
          </div>
        </div>
      )}

      {/* 全屏预览 */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full h-full flex items-center justify-center p-8">
            {currentItem?.type === 'image' && currentItem?.url ? (
              <img
                src={currentItem.url}
                alt={`Fullscreen ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            ) : data.result?.imageUrl ? (
              <img
                src={data.result.imageUrl}
                alt="Fullscreen preview"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="text-center text-white">
                <Eye className="w-24 h-24 mx-auto mb-4 text-gray-500" />
                <p className="text-lg">暂无内容</p>
              </div>
            )}
          </div>
        </div>
      )}
    </BaseNode>
  );
};

PreviewNode.displayName = 'PreviewNode';

export default PreviewNode;
