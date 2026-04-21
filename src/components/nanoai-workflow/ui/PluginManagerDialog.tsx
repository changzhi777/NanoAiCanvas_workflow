import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePluginStore } from '@/stores/pluginStore';
import { useTheme } from './Theme';
import { Plugin } from '@/types/plugin';
import { Code, Info, Trash2, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PluginManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginManagerDialog({ open, onOpenChange }: PluginManagerDialogProps) {
  const { isDark } = useTheme();
  const { getAllPlugins, enablePlugin, disablePlugin, unregisterPlugin } = usePluginStore();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const plugins = getAllPlugins();

  const handleTogglePlugin = (plugin: Plugin) => {
    if (plugin.enabled) {
      disablePlugin(plugin.id);
    } else {
      enablePlugin(plugin.id);
    }
  };

  const handleUnregisterPlugin = (pluginId: string) => {
    if (confirm('确定要卸载此插件吗？这将删除插件及其所有节点类型。')) {
      unregisterPlugin(pluginId);
      if (selectedPlugin?.id === pluginId) {
        setSelectedPlugin(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-4xl dialog-glass rounded-3xl'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            'text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
            isDark ? 'from-blue-400 to-cyan-400' : 'from-blue-600 to-cyan-600'
          )}>
            <div className="flex items-center gap-2">
              <Code className="w-6 h-6" />
              插件管理
            </div>
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : ''}>
            管理已安装的插件，启用或禁用自定义节点类型
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[500px] gap-4 mt-4">
          {/* 插件列表 */}
          <div className={cn(
            'w-1/3 rounded-lg border p-4',
            isDark ? 'bg-slate-800/50 border-white/5' : 'bg-gray-50 border-gray-200'
          )}>
            <h3 className={cn(
              'text-sm font-semibold mb-3',
              isDark ? 'text-slate-200' : 'text-gray-900'
            )}>
              已安装插件 ({plugins.length})
            </h3>
            <div className="h-[420px] overflow-y-auto pr-2 space-y-2">
              {plugins.length === 0 ? (
                <div className={cn(
                  'text-center py-8 text-sm',
                  isDark ? 'text-slate-500' : 'text-gray-500'
                )}>
                  暂无插件
                </div>
              ) : (
                plugins.map((plugin) => (
                  <button
                    key={plugin.id}
                    onClick={() => setSelectedPlugin(plugin)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      'hover:shadow-md',
                      selectedPlugin?.id === plugin.id
                        ? isDark
                          ? 'bg-blue-900/30 border-blue-700 shadow-md'
                          : 'bg-blue-50 border-blue-300 shadow-md'
                        : isDark
                          ? 'bg-slate-700/30 border-white/5 hover:bg-slate-700'
                          : 'bg-white border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={cn(
                        'font-medium text-sm flex-1',
                        isDark ? 'text-slate-200' : 'text-gray-900'
                      )}>
                        {plugin.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {plugin.enabled ? (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      v{plugin.version}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 插件详情 */}
          <div className={cn(
            'flex-1 rounded-lg border p-4',
            isDark ? 'bg-slate-800/50 border-white/5' : 'bg-gray-50 border-gray-200'
          )}>
            {selectedPlugin ? (
              <div className="h-full flex flex-col">
                {/* 头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={cn(
                      'text-lg font-bold mb-1',
                      isDark ? 'text-slate-200' : 'text-gray-900'
                    )}>
                      {selectedPlugin.name}
                    </h3>
                    <p className={cn(
                      'text-sm mb-2',
                      isDark ? 'text-slate-400' : 'text-gray-600'
                    )}>
                      {selectedPlugin.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">v{selectedPlugin.version}</Badge>
                      {selectedPlugin.author && (
                        <span>by {selectedPlugin.author}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePlugin(selectedPlugin)}
                    className={cn(
                      'flex-1',
                      selectedPlugin.enabled
                        ? 'border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600'
                        : 'border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600'
                    )}
                  >
                    {selectedPlugin.enabled ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        禁用插件
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        启用插件
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnregisterPlugin(selectedPlugin.id)}
                    className={cn(
                      'border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600',
                      isDark && 'hover:bg-red-900/30'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* 节点类型列表 */}
                <div className="flex-1 overflow-hidden">
                  <h4 className={cn(
                    'text-sm font-semibold mb-2',
                    isDark ? 'text-slate-200' : 'text-gray-900'
                  )}>
                    节点类型 ({selectedPlugin.nodeTypes.length})
                  </h4>
                  <div className="h-[280px] overflow-y-auto pr-2 space-y-2">
                    {selectedPlugin.nodeTypes.map((nodeType) => (
                      <div
                        key={nodeType.type}
                        className={cn(
                          'p-3 rounded-lg border',
                          isDark
                            ? 'bg-slate-700/30 border-white/5'
                            : 'bg-white border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {nodeType.icon && <span className="mr-1">{nodeType.icon}</span>}
                            {nodeType.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              selectedPlugin.enabled
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {selectedPlugin.enabled ? '已启用' : '已禁用'}
                          </Badge>
                        </div>
                        <p className={cn(
                          'text-xs mb-2',
                          isDark ? 'text-slate-400' : 'text-gray-600'
                        )}>
                          {nodeType.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>输入: {nodeType.inputs.length}</span>
                          <span>•</span>
                          <span>输出: {nodeType.outputs.length}</span>
                          <span>•</span>
                          <span>参数: {nodeType.params.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={cn(
                'h-full flex flex-col items-center justify-center text-center',
                'p-8'
              )}>
                <Info className={cn(
                  'w-12 h-12 mb-4 opacity-50',
                  isDark ? 'text-slate-600' : 'text-gray-400'
                )} />
                <h4 className={cn(
                  'font-semibold mb-2',
                  isDark ? 'text-slate-300' : 'text-gray-700'
                )}>
                  选择一个插件查看详情
                </h4>
                <p className={cn(
                  'text-sm',
                  isDark ? 'text-slate-500' : 'text-gray-500'
                )}>
                  点击左侧列表中的插件，查看节点类型和配置选项
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 插件开发提示 */}
        <div className={cn(
          'mt-4 p-3 rounded-lg border text-xs',
          isDark
            ? 'bg-blue-900/20 border-blue-800 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        )}>
          <strong>💡 开发自定义插件：</strong>
          使用 <code>usePluginStore().registerPlugin()</code> API 注册自定义节点类型。
          详细文档请查看项目 Wiki 或示例插件。
        </div>
      </DialogContent>
    </Dialog>
  );
}
