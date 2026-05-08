import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  NodeTypes,
  Connection,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@/styles/dark-theme.css';
import '@/styles/connection-animations.css';
import '@/styles/glassmorphism.css';
import '@/styles/node-enhanced.css';
import '@/styles/edge-enhanced.css';
import '@/styles/handle-enhanced.css';
import '@/components/canvas/canvas.css'; // 关键：导入画布基础样式！

import { useNanoaiWorkflowStore, WorkflowNode } from '@/stores/nanoaiWorkflowStore';
import { nodeTypes } from './nodes';
import CustomEdge from './nodes/CustomEdge';
import { NanoaiWorkflowToolbar } from './NanoaiWorkflowToolbar';
import { OnboardingTour } from './OnboardingTour';
import { NanoaiWorkflowSidebar } from './NanoaiWorkflowSidebar';
import { EmptyState } from './ui/EmptyState';
import { useTheme } from './ui/Theme';
import { ToastContainer } from './ui/Toast';
import { WorkflowProgress } from './ui/WorkflowProgress';
import { CompletionAnimation } from './ui/CompletionAnimation';
import { KeyboardShortcuts } from './ui/KeyboardShortcuts';
import { NodeSearchFilter } from './ui/NodeSearchFilter';
import { PerformanceMonitor } from './ui/PerformanceMonitor';
import { WorkflowTemplates } from './ui/WorkflowTemplates';
import { ExportDialog } from './ui/ExportDialog';
import { DeveloperTools } from './ui/DeveloperTools';
import { WorkflowPropertiesPanel } from './ui/WorkflowPropertiesPanel';
import { ImportConfirmDialog } from './ui/ImportConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { BarChart3, Search, Code, Keyboard, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

type PageKey = 'canvas' | 'workflow' | 'nano2'
const PAGES: { key: PageKey; label: string }[] = [
  { key: 'canvas', label: '无限画布' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'nano2', label: 'Nano2' },
]

function PageSwitcher() {
  const [active, setActive] = useState<PageKey>('workflow')
  const [panelOpen, setPanelOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })

  const switchTo = (key: PageKey) => {
    setActive(key)
    window.dispatchEvent(new CustomEvent('switch-page', { detail: key }))
  }

  useEffect(() => {
    const handler = (e: Event) => setPanelOpen((e as CustomEvent).detail.open)
    window.addEventListener('properties-panel-toggle', handler)
    return () => window.removeEventListener('properties-panel-toggle', handler)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const btns = container.querySelectorAll<HTMLButtonElement>('[data-page]')
    const idx = PAGES.findIndex(p => p.key === active)
    const btn = btns[idx]
    if (btn) {
      setIndicator({ top: btn.offsetTop, height: btn.offsetHeight })
    }
  }, [active])

  if (panelOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed bottom-16 right-4 z-50 flex flex-col rounded-2xl p-1 border backdrop-blur-xl bg-card/90 border-border shadow-lg"
    >
      <div
        className="absolute left-1 right-1 rounded-xl bg-primary/20 border border-primary/40 transition-all duration-300 ease-out"
        style={{ top: indicator.top, height: indicator.height }}
      />
      {PAGES.map(({ key, label }) => (
        <button
          key={key}
          data-page={key}
          onClick={() => switchTo(key)}
          className={cn(
            'relative z-10 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors duration-200 whitespace-nowrap',
            active === key
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

interface NanoaiWorkflowCanvasProps {
  className?: string;
}

export function NanoaiWorkflowCanvas({ className }: NanoaiWorkflowCanvasProps) {
  const { isDark } = useTheme();
  const { fitView } = useReactFlow();
  // 从 localStorage 恢复侧边栏折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [showProgress, setShowProgress] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: string;
    name: string;
    nodeCount: number;
    edgeCount: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const {
    nodes: storeNodes,
    edges: storeEdges,
    templates,
    addNode,
    addEdge: addStoreEdge,
    updateNodePosition,
    selectNode,
    executeWorkflow,
    stopExecution,
    exportWorkflow,
    saveTemplate,
    loadTemplate,
    removeNode,
    clearWorkflow,
  } = useNanoaiWorkflowStore();

  // React Flow 状态
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(storeEdges as any);

  // 监听属性面板展开/缩进，用于调整进度面板位置
  useEffect(() => {
    const handler = (e: Event) => setPropertiesPanelOpen((e as CustomEvent).detail.open)
    window.addEventListener('properties-panel-toggle', handler)
    return () => window.removeEventListener('properties-panel-toggle', handler)
  }, [])

  // 首次加载时自动导入默认模板（自动清理版本）
  useEffect(() => {
    // 🔧 自动清理：检查并清理损坏的数据
    const storageVersion = localStorage.getItem('workflow-storage-version');
    const CURRENT_VERSION = '1.0'; // 版本号，用于触发清理

    console.log('🔍 检查存储数据版本:', { current: storageVersion, expected: CURRENT_VERSION });

    // 如果版本不匹配或不存在，清理所有数据
    if (storageVersion !== CURRENT_VERSION) {
      console.log('🧹 版本不匹配或首次加载，清理旧数据...');
      localStorage.removeItem('workflow-template-loaded');
      localStorage.removeItem('workflow-force-reload');
      localStorage.removeItem('nanoai-workflow-storage');
      localStorage.removeItem('sidebar-collapsed');
      localStorage.setItem('workflow-storage-version', CURRENT_VERSION);
      console.log('✅ 数据清理完成');
    }

    // 强制首次加载（移除旧的标记）
    localStorage.removeItem('workflow-template-loaded');

    // 检查节点数量
    console.log('🔍 检查节点状态:', { nodeCount: storeNodes.length, templateCount: templates.length });

    // 如果没有节点，加载默认模板
    if (storeNodes.length === 0 && templates.length > 0) {
      const defaultTemplate = templates.find(t => t.id === 'storyboard-shot-a-workflow') || templates[0];
      if (defaultTemplate) {
        console.log('🚀 自动加载默认模板:', defaultTemplate.name);

        // 使用 requestAnimationFrame 确保 store 完全初始化
        requestAnimationFrame(() => {
          loadTemplate(defaultTemplate.id);
          localStorage.setItem('workflow-template-loaded', 'true');
          localStorage.setItem('workflow-storage-version', CURRENT_VERSION);
          toast.success(`已加载默认模板：${defaultTemplate.name}`);
          console.log('✅ 加载完成，节点数:', defaultTemplate.nodes.length);
        });
      }
    } else {
      console.log('✅ 已有节点数据，跳过自动加载');
    }
  }, []); // 只在首次挂载时执行

  // 连线默认样式配置（使用 CustomEdge 增强效果）
  const defaultEdgeOptions = useMemo(() => ({
    type: 'custom', // 使用自定义 CustomEdge 组件
    style: {
      stroke: isDark ? '#64748b' : '#94a3b8',
      strokeWidth: 3, // 增加线宽
    },
    animated: false,
    className: 'react-flow__edge',
    data: {
      type: 'manual',
      status: 'idle' as const,
    },
  }), [isDark]);

  // 根据节点执行状态更新连线样式
  const updateEdgeAnimations = useCallback(() => {
    const runningNodes = new Set(
      nodes
        .filter(n => n.data.status === 'running')
        .flatMap(n => n.data.outputs?.map((o: any) => o.id) || [])
    );

    setEdges((eds: any[]) =>
      eds.map((edge: any) => {
        const isRunning = runningNodes.has(edge.sourceHandle);
        const targetNode = nodes.find(n => n.id === edge.target);
        const isSuccess = targetNode?.data.status === 'success';
        const isError = targetNode?.data.status === 'error';

        let className = 'react-flow__edge';
        if (isRunning) className += ' edge-running edge-data-flow';
        if (isSuccess) className += ' edge-success';
        if (isError) className += ' edge-error';

        return {
          ...edge,
          className,
          animated: isRunning, // 执行时启用动画
        };
      })
    );
  }, [nodes, setEdges]);

  // 同步 store 到 React Flow
  const isDraggingRef = useRef(false);
  const prevNodeCountRef = useRef(0);
  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
    // 节点数量变化时自动居中（首次加载/模板加载/导入）
    if (storeNodes.length > 0 && storeNodes.length !== prevNodeCountRef.current) {
      prevNodeCountRef.current = storeNodes.length;
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    }
  }, [storeNodes, storeEdges, setNodes, setEdges, fitView]);

  // 调整 MiniMap 位置到右下角偏左
  useEffect(() => {
    const adjustMiniMapPosition = () => {
      const miniMap = document.querySelector('.react-flow__minimap');
      if (miniMap) {
        const element = miniMap as HTMLElement;
        // 使用内联样式，确保优先级最高
        element.style.cssText = 'position: absolute !important; bottom: 80px !important; right: 100px !important; top: auto !important; left: auto !important; z-index: 10 !important;';
        console.log('MiniMap 位置已调整到右下角偏左');
      }
    };

    // 多次尝试确保生效
    const timers = [
      setTimeout(adjustMiniMapPosition, 100),
      setTimeout(adjustMiniMapPosition, 300),
      setTimeout(adjustMiniMapPosition, 600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, [nodes]);

  // 处理节点变化（包括拖拽）
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // 标记正在拖拽
    const hasPositionChange = changes.some((c: any) => c.type === 'position');
    if (hasPositionChange) {
      isDraggingRef.current = true;
    }
  }, [onNodesChange]);

  // 监听节点状态变化，自动显示进度面板
  useEffect(() => {
    const hasRunningNode = nodes.some(n => n.data.status === 'running');

    if (hasRunningNode && !showProgress) {
      setShowProgress(true);
      setIsExecuting(true);
    }

    if (!hasRunningNode && isExecuting) {
      setIsExecuting(false);
    }

    // 更新连线动画状态
    updateEdgeAnimations();
  }, [nodes, showProgress, isExecuting, updateEdgeAnimations]);

  // 处理节点拖拽开始
  const onNodeDragStart = useCallback((_event: React.MouseEvent, _node: WorkflowNode) => {
    // 去掉提示音
  }, []);

  // 处理节点拖拽
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: WorkflowNode) => {
    updateNodePosition(node.id, node.position);
    // 拖拽结束，重置标志
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  }, [updateNodePosition]);

  // 处理节点选择
  const onNodeClick = useCallback((_event: React.MouseEvent, node: WorkflowNode) => {
    selectNode(node.id);
  }, [selectNode]);

  // 处理连线（使用 CustomEdge 增强效果）
  const onConnect = useCallback((connection: Connection) => {
    // 查找源节点类型（从 node.type 而不是 node.data.type）
    const sourceNode = nodes.find(n => n.id === connection.source);
    const sourceType = sourceNode?.type || 'input_text';

    const edge: any = {
      ...connection,
      id: `edge-${Date.now()}`,
      type: 'custom', // 使用自定义 CustomEdge 组件
      animated: false,
      className: cn(
        'react-flow__edge',
        'edge-enhanced', // 添加增强类
        'transition-all duration-300'
      ),
      style: {
        strokeWidth: 3, // 增加线宽
        transition: 'stroke 0.3s ease',
      },
      data: {
        type: 'manual',
        status: 'idle',
        sourceType: sourceType, // 传递源节点类型用于颜色映射
      },
      label: '',
    };
    addStoreEdge(edge);
  }, [addStoreEdge, nodes]);

  // 自定义节点类型
  const customNodeTypes: NodeTypes = useMemo(() => nodeTypes, []);

  // 自定义连线类型
  const edgeTypes = useMemo(() => ({
    custom: CustomEdge,
    default: CustomEdge,
    bezier: CustomEdge,
    smoothstep: CustomEdge,
  }), []);

  // 性能优化：根据节点数量动态调整动画质量
  useEffect(() => {
    const nodeCount = nodes.length;
    const highNodeCountThreshold = 30;

    if (nodeCount > highNodeCountThreshold) {
      document.body.classList.add('high-node-count');
    } else {
      document.body.classList.remove('high-node-count');
    }

    // 清理函数
    return () => {
      document.body.classList.remove('high-node-count');
    };
  }, [nodes.length]);

  // 处理模板加载（带确认对话框）
  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // 检查用户是否选择了"不再显示"
    const dontShowAgain = localStorage.getItem('import-confirm-dont-show') === 'true';

    if (dontShowAgain) {
      // 直接导入，不显示确认对话框
      loadTemplate(templateId);
      toast.success(`已导入模板：${template.name}`);
    } else {
      // 显示确认对话框
      setPendingTemplate({
        id: templateId,
        name: template.name,
        nodeCount: template.nodes.length,
        edgeCount: template.edges.length,
      });
      setShowImportConfirm(true);
    }
  }, [templates, loadTemplate, toast]);

  // 确认导入模板
  const handleConfirmImport = useCallback(() => {
    if (!pendingTemplate) return;

    setIsImporting(true);
    try {
      loadTemplate(pendingTemplate.id);
      toast.success(`已导入模板：${pendingTemplate.name}`);
    } catch (error) {
      toast.error('导入模板失败');
    } finally {
      setIsImporting(false);
      setShowImportConfirm(false);
      setPendingTemplate(null);
    }
  }, [pendingTemplate, loadTemplate, toast]);

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + S: 保存工作流
      if (e.metaKey && e.key === 's') {
        e.preventDefault();
        saveTemplate('未命名工作流', '通过快捷键保存', 'custom');
      }

      // Cmd + E: 执行工作流
      if (e.metaKey && e.key === 'e') {
        e.preventDefault();
        if (isExecuting) {
          stopExecution();
        } else {
          setShowProgress(true);
          executeWorkflow();
        }
      }

      // Cmd + Shift + E: 导出工作流
      if (e.metaKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        const json = exportWorkflow();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nanoai-workflow-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Cmd + T: 打开模板对话框
      if (e.metaKey && e.key === 't') {
        e.preventDefault();
        setShowTemplates(true);
      }

      // Cmd + Shift + X: 清空工作流
      if (e.metaKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        clearWorkflow();
        toast.success('工作流已清空');
      }

      // Delete: 删除选中的节点
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 检查是否在输入框中
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.contentEditable === 'true'

        if (!isInput) {
          const selectedNodeId = useNanoaiWorkflowStore.getState().selectedNodeId;
          if (selectedNodeId) {
            removeNode(selectedNodeId);
            selectNode(null);
            toast.success('节点已删除');
          }
        }
      }

      // Cmd + D: 复制选中的节点
      if (e.metaKey && e.key === 'd') {
        e.preventDefault();
        const selectedNodeId = useNanoaiWorkflowStore.getState().selectedNodeId;
        if (selectedNodeId) {
          const selectedNode = nodes.find(n => n.id === selectedNodeId);
          if (selectedNode) {
            const newNode = {
              ...selectedNode,
              id: `node-${Date.now()}`,
              position: {
                x: selectedNode.position.x + 50,
                y: selectedNode.position.y + 50,
              },
            };
            setNodes([...nodes, newNode]);
            toast.success('节点已复制');
          }
        }
      }

      // Cmd + Z: 撤销
      if (e.metaKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // 撤销功能开发中
      }

      // Cmd + Shift + Z: 重做
      if (e.metaKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        // 重做功能开发中
      }

      // Escape: 取消选择
      if (e.key === 'Escape') {
        const selectedNodeId = useNanoaiWorkflowStore.getState().selectedNodeId;
        if (selectedNodeId) {
          selectNode(null);
        }
      }

      // Cmd + A: 全选节点
      if (e.metaKey && e.key === 'a') {
        e.preventDefault();
        // 全选功能
      }

      // ?: 显示快捷键帮助
      if (e.key === '?' && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }

      // F1: 显示快捷键帮助
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // F2: 切换侧边栏折叠状态
      if (e.key === 'F2') {
        e.preventDefault();
        setIsSidebarCollapsed(!isSidebarCollapsed);
      }

      // Cmd + F: 搜索节点
      if (e.metaKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }

      // Cmd + Shift + F: 搜索节点（备用）
      if (e.metaKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }

      // Cmd + P: 性能监控
      if (e.metaKey && e.key === 'p') {
        e.preventDefault();
        setShowPerformance(!showPerformance);
      }

      // Cmd + T: 工作流模板
      if (e.metaKey && e.key === 't') {
        e.preventDefault();
        setShowTemplates(!showTemplates);
      }

      // Cmd + Shift + E: 导出对话框
      if (e.metaKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setShowExport(true);
      }

      // Cmd + Shift + D: 开发者工具
      if (e.metaKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevTools(!showDevTools);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveTemplate, executeWorkflow, exportWorkflow, selectNode, removeNode, toast]);

  return (
    <div className={cn('h-screen w-screen flex overflow-hidden', className)}>
      {/* 左侧工具栏 */}
      <div data-tour="sidebar">
        <NanoaiWorkflowSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* 右侧进度面板 */}
      {showProgress && (
        <div
          className={cn(
            'fixed bottom-16 right-4 z-50 w-80 rounded-2xl shadow-2xl backdrop-blur-xl border',
            'max-h-[60vh] flex flex-col',
            'transition-all duration-300',
            propertiesPanelOpen && 'right-[336px]',
            isDark
              ? 'bg-slate-900/95 border-white/10'
              : 'bg-white/95 border-gray-200'
          )}
        >
          {/* 面板头部 */}
          <div className={cn(
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}>
            <div className="flex items-center gap-2">
              <BarChart3 className={cn(
                'w-5 h-5',
                isDark ? 'text-blue-400' : 'text-blue-600'
              )} />
              <h3 className={cn(
                'font-semibold',
                isDark ? 'text-slate-200' : 'text-gray-800'
              )}>
                执行进度
              </h3>
            </div>
            <button
              onClick={() => setShowProgress(false)}
              className={cn(
                'p-1 rounded transition-colors',
                isDark
                  ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              )}
            >
              ✕
            </button>
          </div>

          {/* 进度内容 */}
          <div className="flex-1 overflow-y-auto p-4">
            <WorkflowProgress
              nodes={nodes}
              isExecuting={isExecuting}
            />
          </div>
        </div>
      )}

      {/* 进度面板切换按钮 */}
      <button
        onClick={() => setShowProgress(!showProgress)}
        className={cn(
          'fixed bottom-4 right-4 z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        title={showProgress ? '隐藏进度面板' : '显示进度面板'}
      >
        <BarChart3 className="w-5 h-5" />
      </button>

      {/* 左侧按钮组 - 等距分布（每个间距40px） */}
      {/* 开发者工具 - 最上方 */}
      <button
        onClick={() => setShowDevTools(!showDevTools)}
        className={cn(
          'fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isSidebarCollapsed ? 'left-16' : 'left-72',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        style={{ bottom: '164px' }}
        title={showDevTools ? '隐藏开发者工具' : '显示开发者工具 (Cmd+Shift+D)'}
      >
        <Code className="w-5 h-5" />
      </button>

      {/* 适应视图 */}
      <button
        onClick={() => {
          const fitViewEvent = new Event('fitView');
          window.dispatchEvent(fitViewEvent);
        }}
        className={cn(
          'fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isSidebarCollapsed ? 'left-16' : 'left-72',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        style={{ bottom: '124px' }}
        title="适应视图 (Cmd+0)"
      >
        <Maximize2 className="w-5 h-5" />
      </button>

      {/* 快捷键帮助 */}
      <button
        onClick={() => setShowShortcuts(!showShortcuts)}
        className={cn(
          'fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isSidebarCollapsed ? 'left-16' : 'left-72',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        style={{ bottom: '84px' }}
        title={showShortcuts ? '隐藏快捷键帮助' : '显示快捷键帮助 (?)'}
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {/* 搜索面板 */}
      <button
        onClick={() => setShowSearch(!showSearch)}
        className={cn(
          'fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isSidebarCollapsed ? 'left-16' : 'left-72',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        style={{ bottom: '44px' }}
        title={showSearch ? '隐藏搜索面板' : '显示搜索面板 (Cmd+F)'}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* 页面切换按钮 - 滑动指示器 */}
      <PageSwitcher />

      {/* 折叠/展开侧边栏 */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={cn(
          'fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isSidebarCollapsed ? 'left-16' : 'left-72',
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
        style={{ bottom: '4px' }}
        title={isSidebarCollapsed ? '展开侧边栏 (F2)' : '折叠侧边栏 (F2)'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* 搜索面板 */}
      {showSearch && (
        <div className="fixed top-16 left-4 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
          <NodeSearchFilter
            nodes={nodes}
            onClose={() => setShowSearch(false)}
          />
        </div>
      )}

      {/* 主画布 - Supabase设计系统 */}
      <div className={cn(
        'flex-1 flex-col',
        isDark ? 'bg-[#171717]' : 'bg-white'  /* #171717 - Supabase页面背景 */
      )}>
        {/* 顶部工具栏 */}
        <div className="relative" data-tour="toolbar">
          <NanoaiWorkflowToolbar />
        </div>

        {/* React Flow 画布 */}
        <div className="flex-1 relative canvas-wrapper nanoai-workflow" data-tour="canvas">
          {/* 背景装饰光晕 */}
          <div className="bg-orb-top-right" />
          <div className="bg-orb-bottom-left" />
          <div className="bg-orb-center" />

          <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              nodeTypes={customNodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              className="bg-background"
              proOptions={{
                hideAttribution: true,
              }}
              selectNodesOnDrag={false}
              panOnScroll={false}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              nodesDraggable={true}
              multiSelectionKeyCode="Shift"
              selectionOnDrag
            >
              {/* 点阵网格背景 */}
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="hsl(var(--border))"
              />

              {/* SVG 渐变定义 */}
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  {/* 原有渐变 */}
                  <linearGradient id="gradient" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#002FA7" />
                    <stop offset="100%" stopColor="#0040C0" />
                  </linearGradient>

                  {/* 连线渐变 - 输入节点（蓝色） */}
                  <linearGradient id="edge-gradient-input" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2196F3" stopOpacity="1" />
                    <stop offset="100%" stopColor="#64B5F6" stopOpacity="1" />
                  </linearGradient>

                  {/* 连线渐变 - AI 生成节点（绿色） */}
                  <linearGradient id="edge-gradient-ai" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity="1" />
                    <stop offset="100%" stopColor="#81C784" stopOpacity="1" />
                  </linearGradient>

                  {/* 连线渐变 - 输出节点（橙色） */}
                  <linearGradient id="edge-gradient-output" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF9800" stopOpacity="1" />
                    <stop offset="100%" stopColor="#FFB74D" stopOpacity="1" />
                  </linearGradient>

                  {/* 连线渐变 - 工具节点（灰色） */}
                  <linearGradient id="edge-gradient-tool" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#607D8B" stopOpacity="1" />
                    <stop offset="100%" stopColor="#90A4AE" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 控制面板 */}
              <Controls
                className="bg-card border border-border"
                showZoom={false}
                showFitView={false}
                showInteractive={true}
              />

              {/* 小地图 */}
              <MiniMap
                className="bg-card border border-border"
                nodeColor={(node) => {
                  switch (node.data.status) {
                    case 'running':
                      return '#3b82f6';
                    case 'success':
                      return '#22c55e';
                    case 'error':
                      return '#ef4444';
                    default:
                      return '#002FA7';
                  }
                }}
                maskColor="hsl(var(--background) / 0.6)"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '320px',
                  zIndex: 10,
                } as React.CSSProperties}
              />
            </ReactFlow>

            {/* 空状态提示（叠加在画布上） */}
            {storeNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <EmptyState
                  onAddNode={() => {
                    // 添加默认节点到 store
                    const newNode = {
                      id: `node-${Date.now()}`,
                      type: 'script_generator' as any,
                      position: { x: 300, y: 200 },
                      data: {
                        label: '脚本生成',
                        params: {},
                        inputs: [],
                        outputs: [],
                        status: 'idle' as any,
                      },
                      draggable: true,
                    };
                    addNode(newNode);
                  }}
                  onCreateTemplate={() => {
                    // 加载模板
                    handleLoadTemplate('storyboard-complete');
                  }}
                />
              </div>
            )}

          {/* Toast 通知容器 */}
          <ToastContainer />

          {/* 完成动画 */}
          <CompletionAnimation
            show={showCompletion}
            onComplete={() => setShowCompletion(false)}
            nodeCount={nodes.length}
            successCount={nodes.filter(n => n.data.status === 'success').length}
          />

          {/* 键盘快捷键帮助 */}
          <KeyboardShortcuts
            show={showShortcuts}
            onClose={() => setShowShortcuts(false)}
          />

          {/* 性能监控 */}
          <PerformanceMonitor
            show={showPerformance}
            onClose={() => setShowPerformance(false)}
          />

          {/* 工作流模板 */}
          <WorkflowTemplates
            show={showTemplates}
            onClose={() => setShowTemplates(false)}
            onLoadTemplate={handleLoadTemplate}
          />

          {/* 导入确认对话框 */}
          <ImportConfirmDialog
            open={showImportConfirm}
            onOpenChange={setShowImportConfirm}
            onConfirm={handleConfirmImport}
            templateName={pendingTemplate?.name || ''}
            nodeCount={pendingTemplate?.nodeCount || 0}
            edgeCount={pendingTemplate?.edgeCount || 0}
            currentNodesCount={storeNodes.length}
            currentEdgesCount={storeEdges.length}
            isImporting={isImporting}
          />

          {/* 导出对话框 */}
          <ExportDialog
            show={showExport}
            onClose={() => setShowExport(false)}
          />

          {/* 开发者工具 */}
          <DeveloperTools
            show={showDevTools}
            onClose={() => setShowDevTools(false)}
          />

          {/* 属性面板 */}
          <WorkflowPropertiesPanel data-tour="properties" />
        </div>
      </div>

      {/* 新手引导 */}
      <OnboardingTour />
    </div>
  );
}

export default NanoaiWorkflowCanvas;
