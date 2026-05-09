import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
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
import { WorkflowTemplates, ALL_NODES } from './ui/WorkflowTemplates';
import { ExportDialog } from './ui/ExportDialog';
import { DeveloperTools } from './ui/DeveloperTools';
import { WorkflowPropertiesPanel } from './ui/WorkflowPropertiesPanel';
import { ImportConfirmDialog } from './ui/ImportConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { BarChart3, Search, Code, Keyboard, Focus, ChevronLeft, ChevronRight, Eye, EyeOff, LayoutGrid, GitBranch, FlaskConical, Map, X } from 'lucide-react';
import type { WorkflowNodeType, NodePort } from '@/stores/nanoaiWorkflowStore';

export type PageKey = 'canvas' | 'workflow' | 'nano2'
export const PAGES: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'canvas', label: '无限画布', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { key: 'workflow', label: 'Workflow', icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: 'nano2', label: 'Nano2', icon: <FlaskConical className="w-3.5 h-3.5" /> },
]

export function PageSwitcher({ isDark }: { isDark: boolean }) {
  const [active, setActive] = useState<PageKey>('workflow')

  const switchTo = (key: PageKey) => {
    setActive(key)
    window.dispatchEvent(new CustomEvent('switch-page', { detail: key }))
  }

  return (
    <div className="flex items-center gap-0.5">
      {PAGES.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => switchTo(key)}
          title={label}
          className={cn(
            'p-1.5 rounded-lg transition-all duration-200',
            active === key
              ? isDark
                ? 'bg-white/15 text-white shadow-sm'
                : 'bg-gray-200/80 text-gray-900 shadow-sm'
              : isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

interface NanoaiWorkflowCanvasProps {
  className?: string;
}

export function NanoaiWorkflowCanvas({ className }: NanoaiWorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <NanoaiWorkflowCanvasInner className={className} />
    </ReactFlowProvider>
  );
}

function NanoaiWorkflowCanvasInner({ className }: NanoaiWorkflowCanvasProps) {
  const { isDark } = useTheme();
  const { fitView } = useReactFlow();
  // 从 localStorage 恢复侧边栏折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [isZenMode, setIsZenMode] = useState(() => {
    const saved = localStorage.getItem('zen-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showProgress, setShowProgress] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [userDismissedProgress, setUserDismissedProgress] = useState(false);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
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

  // 自动保存
  const autoSaveEnabled = useNanoaiWorkflowStore(s => s.autoSaveEnabled);
  const saveVersion = useNanoaiWorkflowStore(s => s.saveVersion);
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      const { nodes: n } = useNanoaiWorkflowStore.getState();
      if (n.length > 0) saveVersion('自动保存', [], true);
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [autoSaveEnabled, saveVersion]);

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

  // MiniMap 定位：注入 CSS 强制覆盖 ReactFlow 内联样式
  useEffect(() => {
    if (!showMiniMap) return;
    const id = 'minimap-override-style';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `
      .react-flow__minimap {
        position: fixed !important;
        bottom: 92px !important;
        right: ${propertiesPanelOpen ? 344 : 8}px !important;
        top: auto !important;
        left: auto !important;
        z-index: 50 !important;
        width: 160px !important;
        height: 100px !important;
        border-radius: 10px !important;
        border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} !important;
        background: ${isDark ? 'rgba(15,15,15,0.85)' : 'rgba(255,255,255,0.85)'} !important;
        backdrop-filter: blur(12px) !important;
        transition: right 300ms ease, opacity 200ms ease !important;
        overflow: hidden !important;
      }
      .react-flow__minimap svg {
        width: 160px !important;
        height: 100px !important;
      }
    `;

    // 重算 viewBox 让节点居中
    const recalc = () => {
      const svg = document.querySelector('.react-flow__minimap svg');
      const nodeEls = document.querySelectorAll('.react-flow__minimap-node');
      if (!svg || nodeEls.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodeEls.forEach(n => {
        const x = +n.getAttribute('x')!, y = +n.getAttribute('y')!;
        const w = +n.getAttribute('width')!, h = +n.getAttribute('height')!;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const pad = 60;
      const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
      svg.setAttribute('viewBox', vb);
    };

    const timers = [0, 100, 300].map(t => setTimeout(recalc, t));
    return () => {
      el?.remove();
      timers.forEach(clearTimeout);
    };
  }, [showMiniMap, propertiesPanelOpen, isDark, nodes]);

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

  // 处理节点变化（包括拖拽）
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // 标记正在拖拽
    const hasPositionChange = changes.some((c: any) => c.type === 'position');
    if (hasPositionChange) {
      isDraggingRef.current = true;
    }
  }, [onNodesChange]);

  // 监听节点状态变化，自动显示进度面板（用户手动关闭后不再自动弹出）
  useEffect(() => {
    const hasRunningNode = nodes.some(n => n.data.status === 'running');

    if (hasRunningNode && !showProgress && !userDismissedProgress) {
      setShowProgress(true);
      setIsExecuting(true);
    }

    if (hasRunningNode && !isExecuting) {
      setIsExecuting(true);
    }

    if (!hasRunningNode && isExecuting) {
      setIsExecuting(false);
      setUserDismissedProgress(false);
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

  // 添加节点到画布
  const handleAddNode = useCallback((nodeType: WorkflowNodeType) => {
    const findNodeLabel = (type: WorkflowNodeType) => {
      const node = ALL_NODES.find(n => n.type === type);
      return node?.label || type;
    };

    const getPreviewNodeInputs = (type: WorkflowNodeType): NodePort[] => {
      switch (type) {
        case 'image_preview': return [{ id: 'image-in', name: '图片输入', type: 'image' as const, required: false }];
        case 'video_preview': return [{ id: 'video-in', name: '视频输入', type: 'json' as const, required: false }];
        case 'audio_preview': return [{ id: 'audio-in', name: '音频输入', type: 'audio' as const, required: false }];
        case 'text_preview': return [{ id: 'text-in', name: '文本输入', type: 'text' as const, required: false }];
        case 'output_preview': return [
          { id: 'image-in', name: '图片输入', type: 'image' as const, required: false },
          { id: 'video-in', name: '视频输入', type: 'json' as const, required: false },
          { id: 'audio-in', name: '音频输入', type: 'audio' as const, required: false },
          { id: 'text-in', name: '文本输入', type: 'text' as const, required: false },
        ];
        case 'output_node': return [{ id: 'data-in', name: '数据', type: 'image' as const, required: true }];
        default: return [];
      }
    };

    const getGenerationNodeOutputs = (type: WorkflowNodeType): NodePort[] => {
      const imageOut: NodePort[] = [{ id: 'image-out', name: '图片输出', type: 'image', required: false }];
      const videoOut: NodePort[] = [{ id: 'video-out', name: '视频输出', type: 'json', required: false }];
      const audioOut: NodePort[] = [{ id: 'audio-out', name: '音频输出', type: 'audio', required: false }];
      const textOut: NodePort[] = [{ id: 'text-out', name: '文本输出', type: 'text', required: false }];

      if (['jimeng_image', 'nano_banana_2', 'nano_banana_pro', 'gpt_image_2', 'minimax_image', 'character_designer', 'scene_designer', 'storyboard_generator'].includes(type)) return imageOut;
      if (['jimeng_video', 'glm_video', 'minimax_video'].includes(type)) return videoOut;
      if (['dialogue_generator', 'glm_tts', 'minimax_speech', 'minimax_music'].includes(type)) return audioOut;
      if (['script_generator', 'director_agent', 'screenwriter_agent', 'glm_text', 'qwen_text', 'kimi_text', 'minimax_text', 'qwen_coding', 'minimax_coding'].includes(type)) return textOut;
      return [];
    };

    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: findNodeLabel(nodeType),
        params: {},
        inputs: getPreviewNodeInputs(nodeType),
        outputs: getGenerationNodeOutputs(nodeType),
        status: 'idle' as any,
      },
      draggable: true,
      className: 'animate-node-enter',
    };
    addNode(newNode);
    toast.success(`已添加节点：${findNodeLabel(nodeType)}`);
  }, [addNode, toast]);

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

  // 禅模式切换
  const toggleZen = () => {
    setIsZenMode((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('zen-mode', JSON.stringify(next));
      return next;
    });
  };

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

      // Cmd + \: 切换禅模式
      if (e.metaKey && e.key === '\\') {
        e.preventDefault();
        toggleZen();
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
    <div className={cn('h-screen w-screen flex flex-col overflow-hidden', className)}>
      {/* 顶部工具栏 - 禅模式下隐藏 */}
      {!isZenMode && (
        <div className="relative flex-shrink-0" data-tour="toolbar">
          <NanoaiWorkflowToolbar />
        </div>
      )}

      {/* 下方：侧边栏 + 画布 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧模板栏 - 禅模式下隐藏 */}
        {!isZenMode && (
          <div data-tour="sidebar">
            <NanoaiWorkflowSidebar
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onLoadTemplate={handleLoadTemplate}
              onShowNodeDialog={() => setShowTemplates(true)}
            />
          </div>
        )}

        {/* 主画布区域 */}
        <div className={cn(
          'flex-1 flex flex-col',
          isDark ? 'bg-[#171717]' : 'bg-white'
        )}>
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
                className={cn('bg-card border border-border', isZenMode && 'hidden')}
                showZoom={false}
                showFitView={false}
                showInteractive={true}
              />

              {/* 小地图 */}
              {showMiniMap && (
              <MiniMap
                pannable
                zoomable
                nodeStrokeWidth={3}
                nodeBorderRadius={8}
                nodeColor={(node) => {
                  switch (node.data.status) {
                    case 'running':
                      return '#3b82f6';
                    case 'success':
                      return '#22c55e';
                    case 'error':
                      return '#ef4444';
                    default:
                      return isDark ? '#3b82f6' : '#60a5fa';
                  }
                }}
                nodeStrokeColor={isDark ? '#1e293b' : '#e2e8f0'}
                maskColor={isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'}
              />
              )}
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
            onAddNode={handleAddNode}
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
      </div>

      {/* === 固定定位浮层 === 禅模式下大部分隐藏 === */}

      {/* 进度面板 */}
      {showProgress && !isZenMode && (
        <div
          className={cn(
            'fixed bottom-16 right-4 z-50 w-72 rounded-xl backdrop-blur-xl border',
            'max-h-[50vh] flex flex-col',
            'transition-all duration-300',
            propertiesPanelOpen && 'right-[336px]',
            isDark
              ? 'bg-slate-900/60 border-white/[0.06] shadow-lg shadow-black/20'
              : 'bg-white/90 border-gray-100 shadow-lg shadow-black/5'
          )}
        >
          <div className={cn(
            'flex items-center justify-between px-3 py-2.5 border-b',
            isDark ? 'border-white/[0.04]' : 'border-gray-50'
          )}>
            <div className="flex items-center gap-2">
              <BarChart3 className={cn('w-3.5 h-3.5', isDark ? 'text-blue-400' : 'text-blue-600')} />
              <h3 className={cn('text-xs font-semibold', isDark ? 'text-slate-300' : 'text-gray-700')}>执行进度</h3>
              {isExecuting && (
                <span className={cn('text-[10px] px-1.5 py-[1px] rounded animate-pulse',
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')}>运行中</span>
              )}
            </div>
            <button onClick={() => { setShowProgress(false); setUserDismissedProgress(true); }}
              className={cn('p-1 rounded transition-colors', isDark ? 'hover:bg-white/[0.06] text-slate-500' : 'hover:bg-gray-50 text-gray-400')}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <WorkflowProgress nodes={nodes} isExecuting={isExecuting} />
          </div>
        </div>
      )}

      {/* 右下角按钮 - 小地图切换 + 进度 */}
      <button onClick={() => setShowMiniMap(!showMiniMap)}
        className={cn('fixed right-4 z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
          isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
        style={{ bottom: '52px' }}
        title={showMiniMap ? '隐藏小地图' : '显示小地图'}>
        <Map className="w-5 h-5" />
      </button>

      {!isZenMode && (
      <button onClick={() => { setShowProgress(!showProgress); if (!showProgress) setUserDismissedProgress(false); }}
        className={cn('fixed bottom-4 right-4 z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
          isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
        title={showProgress ? '隐藏进度面板' : '显示进度面板'}>
        <BarChart3 className="w-5 h-5" />
      </button>
      )}

      {/* 常规模式浮动按钮组（左侧栏边缘） */}
      {!isZenMode && (
        <>
          <button onClick={() => setShowDevTools(!showDevTools)}
            className={cn('fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              isSidebarCollapsed ? 'left-16' : 'left-72',
              isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
            style={{ bottom: '164px' }} title="开发者工具 (Cmd+Shift+D)">
            <Code className="w-5 h-5" />
          </button>

          <button onClick={() => fitView({ padding: 0.2, duration: 400 })}
            className={cn('fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              isSidebarCollapsed ? 'left-16' : 'left-72',
              isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
            style={{ bottom: '124px' }} title="适应视图 (Cmd+0)">
            <Focus className="w-5 h-5" />
          </button>

          <button onClick={() => setShowShortcuts(!showShortcuts)}
            className={cn('fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              isSidebarCollapsed ? 'left-16' : 'left-72',
              isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
            style={{ bottom: '84px' }} title="快捷键帮助 (?)">
            <Keyboard className="w-5 h-5" />
          </button>

          <button onClick={() => setShowSearch(!showSearch)}
            className={cn('fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              isSidebarCollapsed ? 'left-16' : 'left-72',
              isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
            style={{ bottom: '44px' }} title="搜索面板 (Cmd+F)">
            <Search className="w-5 h-5" />
          </button>

          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn('fixed z-50 p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              isSidebarCollapsed ? 'left-16' : 'left-72',
              isDark ? 'bg-[#171717]/95 border border-white/10 text-slate-300' : 'bg-white/90 border border-gray-200 text-gray-700')}
            style={{ bottom: '4px' }} title={isSidebarCollapsed ? '展开侧边栏 (F2)' : '折叠侧边栏 (F2)'}>
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </>
      )}

      {/* 禅模式切换按钮 - 始终显示，位于左侧栏边缘、开发者工具上方 */}
      <button onClick={toggleZen}
        className={cn(
          'fixed z-[60] p-2 rounded-lg backdrop-blur-xl shadow-lg',
          'transition-all duration-300 hover:scale-110 active:scale-95',
          isZenMode ? 'left-4 opacity-30 hover:opacity-80' : (isSidebarCollapsed ? 'left-16' : 'left-72'),
          isDark
            ? 'bg-[#171717]/95 border border-white/10 text-slate-400 hover:text-slate-200'
            : 'bg-white/90 border border-gray-200 text-gray-500 hover:text-gray-700'
        )}
        style={{ bottom: '204px' }}
        title={isZenMode ? '退出禅模式 (Cmd+\\)' : '禅模式 (Cmd+\\)'}>
        {isZenMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {/* 搜索面板 */}
      {showSearch && !isZenMode && (
        <div className="fixed left-4 z-40 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: 'calc(64px + 16px)' }}>
          <NodeSearchFilter nodes={nodes} onClose={() => setShowSearch(false)} />
        </div>
      )}

      {/* 新手引导 */}
      <OnboardingTour />
    </div>
  );
}

export default NanoaiWorkflowCanvas;
