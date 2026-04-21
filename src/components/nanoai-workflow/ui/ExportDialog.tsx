import { useState } from 'react';
import { Download, FileJson, Image as ImageIcon, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { Button } from '@/components/ui/button';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import html2canvas from 'html2canvas';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  format: 'json' | 'png' | 'svg' | 'md';
  accept?: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'json',
    label: 'JSON 工作流',
    description: '导出完整的工作流配置',
    icon: <FileJson className="w-5 h-5" />,
    format: 'json',
    accept: '.json',
  },
  {
    id: 'png',
    label: 'PNG 图片',
    description: '导出画布截图',
    icon: <ImageIcon className="w-5 h-5" />,
    format: 'png',
    accept: '.png',
  },
  {
    id: 'svg',
    label: 'SVG 矢量图',
    description: '导出可缩放的矢量图',
    icon: <FileJson className="w-5 h-5" />,
    format: 'svg',
    accept: '.svg',
  },
  {
    id: 'md',
    label: 'Markdown 文档',
    description: '导出为 Markdown 格式',
    icon: <FileText className="w-5 h-5" />,
    format: 'md',
    accept: '.md',
  },
];

interface ExportDialogProps {
  show: boolean;
  onClose: () => void;
}

export function ExportDialog({ show, onClose }: ExportDialogProps) {
  const { isDark } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [includeSettings, setIncludeSettings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const { nodes, edges, exportWorkflow } = useNanoaiWorkflowStore();

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const timestamp = Date.now();

      switch (selectedFormat) {
        case 'json': {
          const json = exportWorkflow();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workflow-${timestamp}.json`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }

        case 'png': {
          // PNG 截图导出
          const canvasElement = document.querySelector('.react-flow') as HTMLElement;
          if (!canvasElement) {
            throw new Error('未找到画布元素');
          }

          const canvas = await html2canvas(canvasElement, {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            scale: 2, // 高清导出
            logging: false,
          });

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `workflow-${timestamp}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
          break;
        }

        case 'svg': {
          // SVG 矢量图导出
          const svgElement = document.querySelector('.react-flow__container') as HTMLElement;
          if (!svgElement) {
            throw new Error('未找到 SVG 容器');
          }

          // 获取 SVG 内容
          const svgContent = svgElement.innerHTML;
          const svgBlob = new Blob(
            [
              `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
                <rect width="100%" height="100%" fill="${isDark ? '#0f172a' : '#ffffff'}"/>
                ${svgContent}
              </svg>`
            ],
            { type: 'image/svg+xml' }
          );

          const url = URL.createObjectURL(svgBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workflow-${timestamp}.svg`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }

        case 'md': {
          // Markdown 文档导出
          let markdown = `# 工作流导出\n\n`;
          markdown += `**导出时间**: ${new Date(timestamp).toLocaleString()}\n\n`;
          markdown += `## 统计信息\n\n`;
          markdown += `- 节点数量: ${nodes.length}\n`;
          markdown += `- 连线数量: ${edges.length}\n\n`;

          if (nodes.length > 0) {
            markdown += `## 节点列表\n\n`;
            nodes.forEach((node, index) => {
              markdown += `### ${index + 1}. ${node.data.label}\n\n`;
              markdown += `- **状态**: ${node.data.status}\n`;
              markdown += `- **输入端口**: ${node.data.inputs.length}\n`;
              markdown += `- **输出端口**: ${node.data.outputs.length}\n`;
              if (node.data.result) {
                markdown += `- **结果**: ${JSON.stringify(node.data.result).slice(0, 100)}...\n`;
              }
              if (node.data.error) {
                markdown += `- **错误**: ${node.data.error}\n`;
              }
              markdown += `\n`;
            });
          }

          if (edges.length > 0) {
            markdown += `## 连线列表\n\n`;
            edges.forEach((edge, index) => {
              markdown += `${index + 1}. ${edge.source} → ${edge.target}\n`;
            });
            markdown += `\n`;
          }

          if (includeSettings) {
            markdown += `## 工作流设置\n\n`;
            markdown += `- 包含设置: 是\n`;
            markdown += `- 导出格式: Markdown\n`;
          }

          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workflow-${timestamp}.md`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }

      // 2秒后关闭对话框
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        className={cn(
          'relative w-full max-w-md dialog-glass rounded-3xl',
          'animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300'
        )}
      >
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between p-6 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isDark
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-blue-100 text-blue-600'
            )}>
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className={cn(
                'text-lg font-bold',
                isDark ? 'text-slate-100' : 'text-gray-900'
              )}>
                导出工作流
              </h2>
              <p className={cn(
                'text-sm',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>
                选择导出格式和选项
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 导出格式选择 */}
          <div className="space-y-2">
            <label className={cn(
              'text-sm font-medium',
              isDark ? 'text-slate-200' : 'text-gray-700'
            )}>
              导出格式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedFormat(option.format)}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                    'hover:shadow-md',
                    selectedFormat === option.format
                      ? isDark
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-white/10 hover:border-white/20 bg-white/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      selectedFormat === option.format
                        ? 'text-blue-600'
                        : isDark
                          ? 'text-slate-400'
                          : 'text-gray-500'
                    )}>
                      {option.icon}
                    </div>
                    <span className={cn(
                      'font-medium text-sm',
                      isDark ? 'text-slate-200' : 'text-gray-800'
                    )}>
                      {option.label}
                    </span>
                  </div>
                  <p className={cn(
                    'text-xs',
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  )}>
                    {option.description}
                  </p>

                  {selectedFormat === option.format && (
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center',
                        'bg-blue-500 text-white',
                        'animate-in zoom-in duration-200'
                      )}>
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 导出选项 */}
          {selectedFormat === 'json' && (
            <div className="space-y-3">
              <label className={cn(
                'text-sm font-medium',
                isDark ? 'text-slate-200' : 'text-gray-700'
              )}>
                导出选项
              </label>
              <div className="space-y-2">
                <label className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                  isDark
                    ? 'border-white/10 hover:bg-white/5'
                    : 'border-gray-200 hover:bg-gray-50'
                )}>
                  <input
                    type="checkbox"
                    checked={includeSettings}
                    onChange={(e) => setIncludeSettings(e.target.checked)}
                    className={cn(
                      'w-4 h-4 rounded',
                      'focus:ring-2 focus:ring-blue-500',
                      isDark
                        ? 'text-blue-500 bg-slate-800 border-white/20'
                        : 'text-blue-600 bg-gray-100 border-gray-300'
                    )}
                  />
                  <span className={cn(
                    'text-sm',
                    isDark ? 'text-slate-300' : 'text-gray-700'
                  )}>
                    包含工作流设置
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className={cn(
            'p-3 rounded-lg',
            isDark
              ? 'bg-slate-800/50 text-slate-400'
              : 'bg-gray-100 text-gray-600'
          )}>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>节点数量:</span>
                <span className="font-semibold">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>连线数量:</span>
                <span className="font-semibold">{edges.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={cn(
          'flex items-center gap-3 p-6 border-t',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              'flex-1',
              isDark
                ? 'border-white/10 text-slate-300 hover:bg-white/5'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              'flex-1',
              'bg-gradient-to-r from-blue-500 to-cyan-500',
              'hover:from-blue-600 hover:to-cyan-600',
              'text-white',
              'disabled:opacity-50'
            )}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导出中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

ExportDialog.displayName = 'ExportDialog';
