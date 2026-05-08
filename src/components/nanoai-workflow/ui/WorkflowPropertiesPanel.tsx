import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { useToast } from '@/hooks/useToast';

export function WorkflowPropertiesPanel(props?: React.HTMLAttributes<HTMLDivElement>) {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const { selectedNodeId, nodes, updateNode, removeNode } = useNanoaiWorkflowStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  // 获取当前选中的节点
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 同步节点数据到编辑状态
  useEffect(() => {
    if (selectedNode) {
      setEditData(selectedNode.data);
      // 选中节点时自动展开面板
      setIsCollapsed(false);
      setIsEditing(false);
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, editData);
      setIsEditing(false);
      toast.success('节点属性已更新');
    }
  };

  const handleCancel = () => {
    if (selectedNode) {
      setEditData(selectedNode.data);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedNodeId && confirm('确定要删除这个节点吗？')) {
      removeNode(selectedNodeId);
      toast.info('节点已删除');
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  // 折叠状态：显示最小触发按钮
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-40',
          'transition-transform duration-300'
        )}
      >
        {/* 边缘触发区域 */}
        <div
          onMouseEnter={() => {
            if (selectedNode) {
              // 有选中节点时，鼠标移入自动展开
              setIsCollapsed(false);
            }
          }}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4',
            'cursor-pointer',
            isDark
              ? 'hover:bg-white/10'
              : 'hover:bg-gray-200'
          )}
          onClick={() => {
            // 点击边缘触发区域展开面板
            if (selectedNode) {
              setIsCollapsed(false);
            }
          }}
        />

        {/* 最小触发按钮 */}
        <button
          onClick={() => {
            if (selectedNode) {
              setIsCollapsed(false);
            } else {
              toast.info('请先选择一个节点');
            }
          }}
          className={cn(
            'p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all duration-200',
            'hover:scale-110 active:scale-95',
            isDark
              ? 'bg-slate-900/80 border border-white/10 text-slate-300 hover:bg-white/10'
              : 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-50'
          )}
          title={selectedNode ? '显示属性面板' : '请先选择节点'}
        >
          <ChevronLeft
            className={cn(
              'w-5 h-5 transition-transform duration-300',
              selectedNode ? 'rotate-180' : ''
            )}
          />
        </button>
      </div>
    );
  }

  // 展开状态
  return (
    <div
      {...props}
      className={cn(
        'fixed right-0 top-16 bottom-0 z-40 flex',
        'transition-transform duration-300',
        props?.className
      )}
    >
      {/* 面板内容 */}
      <div
        className={cn(
          'w-80 h-full flex flex-col backdrop-blur-xl border-l shadow-2xl',
          'transition-all duration-300',
          isDark
            ? 'bg-slate-900/95 border-white/10'
            : 'bg-white/95 border-gray-200'
        )}
      >
        {/* 头部 */}
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                'text-lg font-bold',
                isDark ? 'text-slate-100' : 'text-gray-900'
              )}
            >
              节点属性
            </h2>
            {!selectedNode && (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  isDark
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                未选中
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-8 w-8 p-0"
                  title="取消"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                  title="保存"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                  title="编辑"
                  disabled={!selectedNode}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="删除"
                  disabled={!selectedNode}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 p-0"
              title="折叠"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedNode ? (
            <div
              className={cn(
                'text-center py-12 px-4 rounded-lg',
                isDark
                  ? 'bg-slate-800/50 text-slate-400'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-sm">点击节点查看属性</p>
            </div>
          ) : (
            <>
              {/* 节点基本信息 */}
              <div
                className={cn(
                  'space-y-3 p-4 rounded-lg',
                  isDark
                    ? 'bg-slate-800/50'
                    : 'bg-gray-50'
                )}
              >
                <h3
                  className={cn(
                    'text-sm font-semibold mb-3',
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  )}
                >
                  基本信息
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label
                      className={cn(
                        'text-xs mb-1.5 block',
                        isDark ? 'text-slate-400' : 'text-gray-600'
                      )}
                    >
                      节点ID
                    </Label>
                    <Input
                      value={selectedNode.id}
                      disabled
                      className={cn(
                        'text-xs font-mono',
                        isDark
                          ? 'bg-slate-900/50 border-white/5 text-slate-500'
                          : 'bg-gray-200/50 border-gray-300 text-gray-500'
                      )}
                    />
                  </div>

                  <div>
                    <Label
                      className={cn(
                        'text-xs mb-1.5 block',
                        isDark ? 'text-slate-400' : 'text-gray-600'
                      )}
                    >
                      节点名称
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editData.label || ''}
                        onChange={(e) => handleInputChange('label', e.target.value)}
                        className="text-sm"
                        placeholder="输入节点名称"
                      />
                    ) : (
                      <div
                        className={cn(
                          'text-sm p-2 rounded border',
                          isDark
                            ? 'bg-slate-900/50 border-white/5 text-slate-300'
                            : 'bg-white border-gray-200 text-gray-700'
                        )}
                      >
                        {selectedNode.data.label || '未命名'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label
                      className={cn(
                        'text-xs mb-1.5 block',
                        isDark ? 'text-slate-400' : 'text-gray-600'
                      )}
                    >
                      节点类型
                    </Label>
                    <div
                      className={cn(
                        'text-sm p-2 rounded border',
                        isDark
                          ? 'bg-slate-900/50 border-white/5 text-slate-300'
                          : 'bg-white border-gray-200 text-gray-700'
                      )}
                    >
                      {selectedNode.type}
                    </div>
                  </div>

                  <div>
                    <Label
                      className={cn(
                        'text-xs mb-1.5 block',
                        isDark ? 'text-slate-400' : 'text-gray-600'
                      )}
                    >
                      状态
                    </Label>
                    <div
                      className={cn(
                        'text-xs p-2 rounded-full inline-block',
                        selectedNode.data.status === 'success'
                          ? isDark
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-green-50 text-green-600 border border-green-200'
                          : selectedNode.data.status === 'error'
                            ? isDark
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                              : 'bg-red-50 text-red-600 border border-red-200'
                            : selectedNode.data.status === 'running'
                              ? isDark
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                              : isDark
                                ? 'bg-slate-700/50 text-slate-400 border border-white/10'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                      )}
                    >
                      {selectedNode.data.status === 'success' && '已完成'}
                      {selectedNode.data.status === 'error' && '错误'}
                      {selectedNode.data.status === 'running' && '运行中'}
                      {selectedNode.data.status === 'idle' && '空闲'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 故事板分镜A 专属配置 — 直接可编辑 */}
              {selectedNode.type === 'storyboard_shot_a' && (() => {
                const p = editData.params || {};
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-sm rounded-md border px-2.5 py-2', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200');
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>生成参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">图片尺寸</Label>
                        <select value={p.size || '1024x1024'} onChange={e => setP({ size: e.target.value })} className={selectCls}>
                          <option value="512x512">512×512</option>
                          <option value="1024x1024">1024×1024</option>
                          <option value="1536x1536">1536×1536</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">画质</Label>
                        <select value={p.quality || 'standard'} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                          <option value="standard">标准</option>
                          <option value="hd">高清</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">风格预设</Label>
                        <select value={p.style || 'realistic'} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实</option>
                          <option value="anime">动画</option>
                          <option value="comic">漫画</option>
                          <option value="watercolor">水彩</option>
                          <option value="oil_painting">油画</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">批量生成数量</Label>
                        <input type="number" min={1} max={8} value={p.batchCount || 1} onChange={e => setP({ batchCount: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })} className={selectCls} />
                      </div>
                    </div>

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>优化参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">提示词模板</Label>
                        <select value={p.systemPromptTemplate || 'storyboard'} onChange={e => setP({ systemPromptTemplate: e.target.value })} className={selectCls}>
                          <option value="storyboard">故事板分镜</option>
                          <option value="character">角色设计</option>
                          <option value="scene">场景设计</option>
                          <option value="custom">通用自定义</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">Temperature: {p.temperature ?? 0.8}</Label>
                        <input type="range" min={0.1} max={1} step={0.1} value={p.temperature ?? 0.8} onChange={e => setP({ temperature: Number(e.target.value) })} className="w-full" />
                      </div>
                    </div>

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>高级设置</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">优化模型</Label>
                        <select value={p.model || 'glm-4.5-air'} onChange={e => setP({ model: e.target.value })} className={selectCls}>
                          <option value="glm-4.5-air">GLM-4.5-Air（快速）</option>
                          <option value="glm-4-flash">GLM-4-Flash</option>
                          <option value="glm-4">GLM-4</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 节点参数（storyboard_shot_a 已有专属配置，跳过通用区域） */}
              {selectedNode.type !== 'storyboard_shot_a' && (
              <div
                className={cn(
                  'space-y-3 p-4 rounded-lg',
                  isDark
                    ? 'bg-slate-800/50'
                    : 'bg-gray-50'
                )}
              >
                <h3
                  className={cn(
                    'text-sm font-semibold mb-3',
                    isDark ? 'text-slate-200' : 'text-gray-700'
                  )}
                >
                  节点参数
                </h3>

                <div className="space-y-3">
                  {Object.keys(editData.params || {}).length === 0 ? (
                    <div
                      className={cn(
                        'text-xs text-center py-4',
                        isDark ? 'text-slate-500' : 'text-gray-400'
                      )}
                    >
                      暂无参数
                    </div>
                  ) : (
                    Object.entries(editData.params || {}).map(([key, value]) => (
                      <div key={key}>
                        <Label
                          className={cn(
                            'text-xs mb-1.5 block',
                            isDark ? 'text-slate-400' : 'text-gray-600'
                          )}
                        >
                          {key}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={String(value)}
                            onChange={(e) =>
                              handleInputChange('params', {
                                ...editData.params,
                                [key]: e.target.value,
                              })
                            }
                            className="text-sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'text-sm p-2 rounded border font-mono',
                              isDark
                                ? 'bg-slate-900/50 border-white/5 text-slate-300'
                                : 'bg-white border-gray-200 text-gray-700'
                            )}
                          >
                            {String(value)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}

              {/* 节点结果 */}
              {selectedNode.data.result && (
                <div
                  className={cn(
                    'space-y-3 p-4 rounded-lg',
                    isDark
                      ? 'bg-slate-800/50'
                      : 'bg-gray-50'
                  )}
                >
                  <h3
                    className={cn(
                      'text-sm font-semibold mb-3',
                      isDark ? 'text-slate-200' : 'text-gray-700'
                    )}
                  >
                    执行结果
                  </h3>
                  <pre
                    className={cn(
                      'text-xs p-3 rounded overflow-auto max-h-40',
                      isDark
                        ? 'bg-slate-900/50 text-green-400 font-mono'
                        : 'bg-gray-900 text-green-600 font-mono'
                    )}
                  >
                    {JSON.stringify(selectedNode.data.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* 节点错误 */}
              {selectedNode.data.error && (
                <div
                  className={cn(
                    'space-y-3 p-4 rounded-lg',
                    isDark
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-red-50 border border-red-200'
                  )}
                >
                  <h3
                    className={cn(
                      'text-sm font-semibold mb-3 text-red-600',
                      isDark ? 'text-red-400' : 'text-red-600'
                    )}
                  >
                    错误信息
                  </h3>
                  <div
                    className={cn(
                      'text-xs p-3 rounded',
                      isDark
                        ? 'bg-red-500/20 text-red-300 font-mono'
                        : 'bg-red-100 text-red-700 font-mono'
                    )}
                  >
                    {selectedNode.data.error}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

WorkflowPropertiesPanel.displayName = 'WorkflowPropertiesPanel';
