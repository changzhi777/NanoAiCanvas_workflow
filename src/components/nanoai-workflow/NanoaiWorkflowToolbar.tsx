import { useState, useMemo, useEffect } from 'react';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { useAuthStore, useSyncStore } from '@/stores/remoteStore';
import {
  Play,
  Save,
  Download,
  Upload,
  Trash2,
  History,
  HelpCircle,
  Sun,
  Moon,
  Puzzle,
  MoreHorizontal,
  Plus,
  Image,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from './ui/Theme';
import { useToast } from '@/hooks/useToast';
import { HelpDialog } from './ui/HelpDialog';
import { PluginManagerDialog } from './ui/PluginManagerDialog';
import { CollaborationPanel } from './ui/CollaborationPanel';
import { AutoLayoutButton } from './ui/AutoLayoutButton';
import { VersionHistoryDialog } from './ui/VersionHistoryDialog';
import { useI18n } from '@/hooks/useI18n';
import { AssetLibraryPanel, SyncStatusIndicator } from '@/components/ui/AssetLibrary';
import { LoginButton } from '@/components/ui/LoginButton';
import { ChatDialog } from '@/components/ui/ChatDialog';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function NanoaiWorkflowToolbar() {
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useI18n();
  const token = useAuthStore((s) => s.token);
  const syncInit = useSyncStore((s) => s.init);
  const [chatOpen, setChatOpen] = useState(false);
  const chatUnread = useChatStore((s) => s.totalUnread);
  const notifUnread = useNotificationStore((s) => s.unreadCount);
  const combinedUnread = chatUnread + notifUnread;

  // Force re-render when auth state changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    // Subscribe to auth store changes
    const unsub = useAuthStore.subscribe(() => {
      forceUpdate({});
    });
    return unsub;
  }, [token]);

  // Listen for localStorage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nanoai_token' || e.key === 'nanoai_user') {
        forceUpdate({});
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const {
    executeWorkflow,
    stopExecution,
    saveTemplate,
    exportWorkflow,
    importWorkflow,
    clearWorkflow,
    saveVersion,
    listVersions,
    nodes,
    edges,
  } = useNanoaiWorkflowStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const [collaborationDialogOpen, setCollaborationDialogOpen] = useState(false);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Initialize sync on mount
  useEffect(() => {
    syncInit();
  }, [syncInit]);

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      saveTemplate(templateName, templateDesc || '通过工具栏保存', 'custom');
      toast.success(`模板 "${templateName}" 已保存`);
      setSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDesc('');
    }
  };

  const handleExport = () => {
    const json = exportWorkflow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanoai-workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('工作流已导出到本地');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          importWorkflow(json);
          toast.success(`已导入工作流：${file.name}`);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (confirm('确定要清空当前工作流吗？此操作不可撤销。')) {
      clearWorkflow();
      toast.info('工作流已清空');
    }
  };

  const handleExecute = async () => {
    if (isExecuting) {
      stopExecution();
      toast.info('工作流已终止');
      return;
    }
    if (!token) {
      toast.error('请先登录后再执行工作流');
      window.dispatchEvent(new CustomEvent('open-auth-dialog'));
      return;
    }
    setIsExecuting(true);
    try {
      await executeWorkflow();
      toast.success('工作流执行完成');
    } catch (error) {
      toast.error('工作流执行失败');
    } finally {
      setTimeout(() => setIsExecuting(false), 1000);
    }
  };

  const versions = listVersions();

  // 智能工具栏状态判断（优化：使用 useMemo 避免不必要的重计算）
  const hasNodes = nodes.length > 0;
  const isEmpty = !hasNodes;
  const isWorkflowActive = isExecuting;

  const completedCount = useMemo(
    () => nodes.filter(n => n.data.status === 'success').length,
    [nodes]
  );

  const progress = useMemo(
    () => hasNodes ? Math.round((completedCount / nodes.length) * 100) : 0,
    [hasNodes, completedCount, nodes.length]
  );

  return (
    <>
      <div className={cn(
        'h-16 flex items-center justify-between px-4 shadow-sm border-b backdrop-blur-xl',
        'gap-2 md:gap-4',
        isDark
          ? 'bg-slate-900/80 border-white/10'
          : 'bg-white border-gray-200'
      )}>
        {/* 左侧：标题和统计 */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">N</span>
          </div>

          {/* 标题 */}
          <div>
            <h1 className={cn(
              'text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent',
              isDark
                ? 'from-blue-400 to-cyan-400'
                : 'from-blue-600 to-cyan-600'
            )}>
              {t('workflow.title')}
            </h1>
            <div className={cn(
              'flex items-center gap-2 text-xs',
              isDark ? 'text-slate-400' : 'text-gray-500'
            )}>
              <span>{nodes.length} {t('workflow.nodes')}</span>
              <span>•</span>
              <span>{edges.length} {t('workflow.edges')}</span>
              {nodes.length > 0 && (
                <>
                  <span>•</span>
                  <span className={cn(
                    isDark ? 'text-green-400' : 'text-green-600'
                  )}>
                    {nodes.filter(n => n.data.status === 'success').length} {t('workflow.completed')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮组 */}
        <div className={cn(
          'flex items-center gap-2',
          'overflow-x-auto',
          'flex-nowrap',
          'scrollbar-hide'
        )}>
          {/* 资产库 - 仅已登录用户，在用户按钮左边 */}
          {token && (
            <Button
              onClick={() => setAssetLibraryOpen(true)}
              variant="outline"
              size="sm"
              className={cn(
                'shadow-sm hover:shadow transition-all duration-200',
                isDark
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              )}
              title="资产库"
            >
              <Image className="w-4 h-4 mr-1" />
              资产库
            </Button>
          )}

          {/* 消息按钮 */}
          {token && (
            <Button
              onClick={() => setChatOpen(true)}
              variant="ghost"
              size="icon"
              className="relative"
              title="消息"
            >
              <MessageSquare className="w-4 h-4" />
              {combinedUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {combinedUnread > 99 ? '99+' : combinedUnread}
                </span>
              )}
            </Button>
          )}
          <ChatDialog open={chatOpen} onOpenChange={setChatOpen} />

          {/* 用户名按钮 */}
          <LoginButton />

          {/* 已登录用户：显示同步状态 */}
          {token && <SyncStatusIndicator />}

          {/* 分隔线 */}
          <div className={cn(
            'w-px h-6',
            isDark ? 'bg-white/10' : 'bg-gray-200'
          )} />

          {/* 1. 主题切换按钮 */}
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="sm"
            className={cn(
              'shadow-sm hover:shadow transition-all duration-200',
              'relative overflow-hidden',
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            )}
            title={isDark ? '切换到浅色主题' : '切换到深色主题'}
          >
            <span className="relative z-10 flex items-center justify-center">
              {isDark ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-yellow-500" />
              )}
            </span>
          </Button>

          {/* 2. 主要操作：执行/终止 */}
          {hasNodes && (
            <Button
              onClick={handleExecute}
              data-tour="execute-btn"
              className={cn(
                'shadow-lg transition-all duration-200',
                'active:scale-95',
                'button-click-feedback relative overflow-hidden',
                isExecuting
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
              )}
            >
              {isExecuting ? (
                <>
                  {/* 流动光效 */}
                  <span className="absolute inset-0 animate-flow-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]" />
                  <span className="relative flex items-center gap-2 text-white">
                    <Square className="w-3.5 h-3.5 fill-current" />
                    终止工作流
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  执行工作流
                </span>
              )}
            </Button>
          )}

          {/* 空画布时显示添加模板提示 */}
          {isEmpty && (
            <Button
              onClick={() => {
                // 打开快捷键面板显示 Cmd+T
                window.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 't',
                  metaKey: true,
                  ctrlKey: true
                }));
              }}
              className={cn(
                'bg-gradient-to-r from-blue-500 to-cyan-500',
                'hover:from-blue-600 hover:to-cyan-600',
                'shadow-lg hover:shadow-xl transition-all duration-200',
                'active:scale-95',
                'text-white'
              )}
              title="按 ⌘T 或 Ctrl+T 快速添加模板"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加节点开始创作
            </Button>
          )}

                    <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow transition-all duration-200">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 dropdown-glass">
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer dropdown-item rounded-xl">
                <Download className="w-4 h-4 mr-2 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium">导出工作流</div>
                  <div className="text-xs text-gray-500">下载为 JSON 文件</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport} className="cursor-pointer dropdown-item rounded-xl">
                <Upload className="w-4 h-4 mr-2 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium">导入工作流</div>
                  <div className="text-xs text-gray-500">从 JSON 文件加载</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          
          {/* 更多操作（下拉菜单收纳其他6个按钮） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'transition-all duration-200',
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                )}
                title="更多操作"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="ml-1 text-xs opacity-60">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>更多操作</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 版本历史 */}
              <DropdownMenuItem
                onClick={() => setVersionHistoryOpen(true)}
                className="cursor-pointer"
              >
                <History className="w-4 h-4 mr-2 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium">版本历史</div>
                  <div className="text-xs text-gray-500">查看和恢复历史版本</div>
                </div>
              </DropdownMenuItem>

              {/* 保存 - 有节点时显示 */}
              {hasNodes && (
                <>
                  <DropdownMenuItem onClick={() => setSaveDialogOpen(true)} className="cursor-pointer">
                    <Save className="w-4 h-4 mr-2 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium">保存为模板</div>
                      <div className="text-xs text-gray-500">保存当前工作流为模板</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      saveVersion('手动保存');
                      toast.success('version snapshot created');
                    }}
                    className="cursor-pointer"
                  >
                    <History className="w-4 h-4 mr-2 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium">保存版本</div>
                      <div className="text-xs text-gray-500">创建版本快照</div>
                    </div>
                  </DropdownMenuItem>
                </>
              )}

              {hasNodes && <DropdownMenuSeparator />}

              {/* 清空 - 有节点且未执行时显示 */}
              {hasNodes && !isWorkflowActive && (
                <DropdownMenuItem
                  onClick={handleClear}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <div className="flex-1">
                    <div className="font-medium">清空画布</div>
                    <div className="text-xs text-gray-500">删除所有节点和连线</div>
                  </div>
                </DropdownMenuItem>
              )}

              {hasNodes && !isWorkflowActive && <DropdownMenuSeparator />}

              {/* 清除本地缓存 */}
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('确定要清除本地缓存吗？页面将自动刷新。')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="cursor-pointer text-orange-600 focus:text-orange-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">清除本地缓存</div>
                  <div className="text-xs text-gray-500">重置应用状态</div>
                </div>
              </DropdownMenuItem>

              {/* 插件管理 */}
              <DropdownMenuItem
                onClick={() => setPluginDialogOpen(true)}
                className="cursor-pointer"
              >
                <Puzzle className="w-4 h-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">插件管理</div>
                  <div className="text-xs text-gray-500">管理扩展插件</div>
                </div>
              </DropdownMenuItem>

              {/* 帮助 */}
              <DropdownMenuItem
                onClick={() => setHelpDialogOpen(true)}
                className="cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">帮助</div>
                  <div className="text-xs text-gray-500">使用指南和快捷键</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 自动布局 */}
              <div className="px-2 py-1.5">
                <AutoLayoutButton />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 帮助对话框 */}
      <HelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />

      {/* 插件管理对话框 */}
      <PluginManagerDialog open={pluginDialogOpen} onOpenChange={setPluginDialogOpen} />

      {/* 协作面板 */}
      <CollaborationPanel open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen} />

      {/* 资产库面板 */}
      <AssetLibraryPanel
        open={assetLibraryOpen}
        onClose={() => setAssetLibraryOpen(false)}
      />

      {/* 版本历史对话框 */}
      <VersionHistoryDialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen} />

      {/* 保存模板对话框 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className={cn(
          'sm:max-w-md dialog-glass rounded-3xl'
        )}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-slate-200' : ''}>保存为模板</DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : ''}>
              将当前工作流保存为模板，方便以后快速复用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className={cn(
                'text-sm font-medium',
                isDark ? 'text-slate-200' : 'text-gray-700'
              )}>
                模板名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="例如：角色设计工作流"
                className={isDark ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500 focus:ring-blue-500 rounded-xl' : 'rounded-xl'}
              />
            </div>
            <div className="space-y-2">
              <label className={isDark ? 'text-slate-200' : 'text-gray-700'}>
                描述
              </label>
              <Input
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="简要描述此模板的用途"
                className={isDark ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500 focus:ring-blue-500 rounded-xl' : 'rounded-xl'}
              />
            </div>

            {/* 预览信息 */}
            <div className={cn(
              'p-4 rounded-2xl border',
              isDark
                ? 'bg-blue-900/30 border-white/10'
                : 'bg-blue-50 border-blue-200'
            )}>
              <div className={isDark ? 'text-xs space-y-1 text-slate-300' : 'text-xs space-y-1 text-gray-600'}>
                <div className="flex items-center justify-between">
                  <span>节点数量:</span>
                  <span className={isDark ? 'font-semibold text-slate-200' : 'font-semibold text-blue-700'}>{nodes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>连线数量:</span>
                  <span className={isDark ? 'font-semibold text-slate-200' : 'font-semibold text-blue-700'}>{edges.length}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              className={isDark ? 'border-white/10 text-slate-200 hover:bg-white/5 rounded-xl' : 'rounded-xl'}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              className={cn(
                'bg-gradient-to-r from-blue-500 to-cyan-500',
                'hover:from-blue-600 hover:to-cyan-600',
                'text-white',
                'rounded-xl'
              )}
            >
              保存模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NanoaiWorkflowToolbar;
