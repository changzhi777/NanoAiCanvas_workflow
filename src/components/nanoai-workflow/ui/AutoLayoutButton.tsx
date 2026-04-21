import { useState } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { smartAutoLayout } from '@/lib/smartLayout';
import { useToast } from '@/hooks/useToast';
import { LayoutProgress } from './LayoutProgress';

export function AutoLayoutButton() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const { nodes, edges, setNodes } = useNanoaiWorkflowStore();
  const [isLayouting, setIsLayouting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const handleAutoLayout = async (mode: 'smart' | 'horizontal' | 'vertical' | 'radial') => {
    if (nodes.length === 0) {
      toast.info('画布为空，无需布局');
      return;
    }

    setIsLayouting(true);
    setShowProgress(true);

    // 模拟异步布局过程
    setTimeout(() => {
      try {
        let layoutedNodes;

        switch (mode) {
          case 'smart':
            layoutedNodes = smartAutoLayout(nodes, edges, { animate: true });
            break;
          case 'horizontal':
            // 水平布局
            layoutedNodes = nodes.map((node, index) => ({
              ...node,
              position: {
                x: 100 + index * 360,
                y: 200,
              },
            }));
            break;
          case 'vertical':
            // 垂直布局
            layoutedNodes = nodes.map((node, index) => ({
              ...node,
              position: {
                x: 400,
                y: 100 + index * 280,
              },
            }));
            break;
          case 'radial':
            // 径向布局
            const centerX = 800;
            const centerY = 400;
            const radius = 300;
            layoutedNodes = nodes.map((node, index) => {
              const angle = (index / nodes.length) * 2 * Math.PI;
              return {
                ...node,
                position: {
                  x: centerX + radius * Math.cos(angle),
                  y: centerY + radius * Math.sin(angle),
                },
              };
            });
            break;
        }

        setNodes(layoutedNodes);
        toast.success('布局已完成');
      } catch (error) {
        toast.error('布局失败');
      } finally {
        setIsLayouting(false);
      }
    }, 2000);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={nodes.length === 0 || isLayouting}
            className={cn(
              'shadow-sm hover:shadow transition-all duration-200',
              'relative overflow-hidden',
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            )}
            title="自动布局"
          >
            {isLayouting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                布局中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" />
                自动布局
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 dropdown-glass">
          <DropdownMenuLabel className="rounded-t-xl">选择布局方式</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleAutoLayout('smart')}
            className="cursor-pointer dropdown-item rounded-xl"
            disabled={isLayouting}
          >
            <div className="flex items-center gap-3 flex-1">
              <LayoutTemplate className="w-4 h-4 text-blue-500" />
              <div>
                <div className="font-medium">智能布局</div>
                <div className="text-xs text-gray-500">自动分层排列</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleAutoLayout('horizontal')}
            className="cursor-pointer dropdown-item rounded-xl"
            disabled={isLayouting}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-4 h-4 bg-green-500 rounded-sm" />
              <div>
                <div className="font-medium">水平布局</div>
                <div className="text-xs text-gray-500">从左到右排列</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleAutoLayout('vertical')}
            className="cursor-pointer dropdown-item rounded-xl"
            disabled={isLayouting}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#002FA7' }} />
              <div>
                <div className="font-medium">垂直布局</div>
                <div className="text-xs text-gray-500">从上到下排列</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleAutoLayout('radial')}
            className="cursor-pointer dropdown-item rounded-xl"
            disabled={isLayouting}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-4 h-4 bg-orange-500 rounded-full" />
              <div>
                <div className="font-medium">径向布局</div>
                <div className="text-xs text-gray-500">围绕中心点排列</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 布局进度指示器 */}
      <LayoutProgress
        show={showProgress}
        message="正在分析节点关系..."
        duration={2000}
        onComplete={() => setShowProgress(false)}
      />
    </>
  );
}

export default AutoLayoutButton;
