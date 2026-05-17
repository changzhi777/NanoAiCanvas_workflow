import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Save, X, Sparkles, RotateCcw, Loader2, Download, ShieldCheck, Copy, Clock, Calendar, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_PARAMS, optimizePromptWithGLM, SIZE_OPTIONS, getDefaultSize } from '../nodes/StoryboardShotA.shared';
import { calcTvcParams } from '@/lib/tvc-cascade';

const CUSTOM_PANEL_NODE_TYPES = new Set([
  'storyboard_shot_a', 'image_preview', 'storyboard_v2', 'shot_ref_image',
  'character_design_image', 'scene_design_image', 'script_table',
  'storyboard_video', 'tvc_script', 'storyboard_generator',
]);

export function WorkflowPropertiesPanel(props?: React.HTMLAttributes<HTMLDivElement>) {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const { selectedNodeId, nodes, updateNode, removeNode } = useNanoaiWorkflowStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const notifyPanelState = useCallback((open: boolean) => {
    window.dispatchEvent(new CustomEvent('properties-panel-toggle', { detail: { open } }));
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    setIsEditing(false);
    notifyPanelState(false);
  }, [notifyPanelState]);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    notifyPanelState(true);
  }, [notifyPanelState]);

  // 获取当前选中的节点
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 选中节点时同步数据并自动展开面板
  useEffect(() => {
    if (selectedNode) {
      setEditData(selectedNode.data);
      setIsEditing(false);
      expand();
    } else {
      collapse();
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
      collapse();
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
        {/* 最小触发按钮 */}
        <button
          onClick={() => {
            if (selectedNode) {
              expand();
            } else {
              toast.info('请先选择一个节点');
            }
          }}
          className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            'active:scale-95',
            isDark
              ? 'bg-slate-900/60 border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
              : 'bg-white border border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          )}
          title={selectedNode ? '显示属性面板' : '请先选择节点'}
        >
          <ChevronLeft
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-300',
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
          'w-64 h-full flex flex-col border-l',
          'transition-all duration-300',
          isDark
            ? 'bg-slate-900/60 border-white/[0.06]'
            : 'bg-white border-gray-100'
        )}
      >
        {/* 头部 */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2.5 border-b',
            isDark ? 'border-white/[0.04]' : 'border-gray-50'
          )}
        >
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                'text-xs font-semibold',
                isDark ? 'text-slate-300' : 'text-gray-700'
              )}
            >
              节点属性
            </h2>
            {!selectedNode && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-[1px] rounded',
                  isDark
                    ? 'bg-white/[0.04] text-slate-500'
                    : 'bg-gray-50 text-gray-400'
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
                  <X className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                  title="保存"
                >
                  <Save className="w-3 h-3" />
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
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete()}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="删除"
                  disabled={!selectedNode}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => collapse()}
              className="h-8 w-8 p-0"
              title="折叠"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
          {!selectedNode ? (
            <div
              className={cn(
                'text-center py-10 px-4 rounded-lg',
                isDark
                  ? 'text-slate-500'
                  : 'text-gray-400'
              )}
            >
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-700/30 flex items-center justify-center"><ChevronLeft className="w-3.5 h-3.5 text-slate-500 rotate-180" /></div>
              <p className="text-[11px]">点击节点查看属性</p>
            </div>
          ) : (
            <>
              {/* 故事板分镜V1版 专属配置 — 直接可编辑 */}
              {selectedNode.type === 'storyboard_shot_a' && (() => {
                const p = { ...DEFAULT_PARAMS, ...(editData.params || {}) };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-xs rounded-md border px-2 py-1.5', isDark ? 'bg-white/[0.02] border-white/[0.06] text-slate-300' : 'bg-gray-50/50 border-gray-100 text-gray-700');
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    {/* 提示词优化 */}
                    <StoryboardPromptOptimizer
                      rawPrompt={p.inputText || ''}
                      optimizedPrompt={p._optimizedPrompt || ''}
                      editablePrompt={p._editablePrompt || ''}
                      onOptimizedChange={(optimized, editable) => setP({ _optimizedPrompt: optimized, _editablePrompt: editable })}
                      onReset={() => setP({ _optimizedPrompt: '', _editablePrompt: '' })}
                      temperature={p.temperature}
                      systemPromptTemplate={p.systemPromptTemplate}
                      model={p.model}
                      style={p.style}
                      quality={p.quality}
                      isDark={isDark}
                    />

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>生成参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">图片比例</Label>
                        <select value={p.aspectRatio || '1:1'} onChange={e => {
                          const newRatio = e.target.value as any
                          const newSize = getDefaultSize(newRatio)
                          setP({ aspectRatio: newRatio, size: newSize })
                        }} className={selectCls}>
                          <option value="1:1">1:1 正方形</option>
                          <option value="16:9">16:9 横屏</option>
                          <option value="9:16">9:16 竖屏</option>
                          <option value="4:3">4:3 横屏</option>
                          <option value="3:4">3:4 竖屏</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">批量生成数量</Label>
                        <input type="number" min={1} max={8} value={p.batchCount || 1} onChange={e => setP({ batchCount: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })} className={selectCls} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">分镜头数量</Label>
                        <input type="number" min={1} max={8} value={p.shotCount || 3} onChange={e => setP({ shotCount: Math.max(1, Math.min(8, Number(e.target.value) || 3)) })} className={selectCls} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">预览布局</Label>
                        <select value={p.layoutDirection || 'horizontal'} onChange={e => setP({ layoutDirection: e.target.value as any })} className={selectCls}>
                          <option value="horizontal">横向网格</option>
                          <option value="vertical">纵向排列</option>
                        </select>
                      </div>
                    </div>

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>优化参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">图片尺寸</Label>
                        <select
                          value={p.size || '1024x1024'}
                          onChange={e => setP({ size: e.target.value })}
                          className={selectCls}
                        >
                          {(SIZE_OPTIONS[(p.aspectRatio || '1:1') as keyof typeof SIZE_OPTIONS] || SIZE_OPTIONS['1:1']).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
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
                          <option value="chinese">中国风</option>
                        </select>
                      </div>
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
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">优化模型</Label>
                        <select value={p.model || 'glm-4.5-air'} onChange={e => setP({ model: e.target.value })} className={selectCls}>
                          <option value="glm-4.5-air">GLM-4.5-Air（快速）</option>
                          <option value="glm-4.7-flash">GLM-4.7-Flash（快速）</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 图片预览节点 专属配置 */}
              {selectedNode.type === 'image_preview' && (() => {
                const result = selectedNode.data.result;
                const images = result?.images || [];
                const promptText = result?.prompt || '';
                const startedAt = result?.startedAt;
                const completedAt = result?.completedAt;
                const generationTime = (startedAt && completedAt)
                  ? (() => { const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime(); return ms < 1000 ? `${ms}ms` : ms < 60000 ? `${Math.floor(ms/1000)}s` : `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`; })()
                  : '';
                const handleDownload = () => {
                  if (!images[0]) return;
                  const link = document.createElement('a');
                  link.href = images[0];
                  link.download = `nanoai-preview.png`;
                  link.click();
                };
                const handleSaveToAsset = () => {
                  if (selectedNodeId) updateNode(selectedNodeId, { result: { ...result, savedToAsset: true } } as any);
                };
                const handleCopyPrompt = () => {
                  if (!promptText) return;
                  navigator.clipboard.writeText(promptText);
                };
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>预览信息</h3>
                    {images.length > 0 ? (<>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs"><FileImage className="w-3.5 h-3.5 text-orange-400" /><span className="text-muted-foreground">数量：</span><span className="text-slate-200">{images.length} 张</span></div>
                        {generationTime && <div className="flex items-center gap-1.5 text-xs"><Clock className="w-3.5 h-3.5 text-green-400" /><span className="text-muted-foreground">用时：</span><span className="text-slate-200">{generationTime}</span></div>}
                        {completedAt && <div className="flex items-center gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5 text-blue-400" /><span className="text-muted-foreground">时间：</span><span className="text-slate-200">{new Date(completedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span></div>}
                      </div>
                      {promptText && (
                        <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-400">提示词</span>
                            <button onClick={handleCopyPrompt} className="p-1 rounded hover:bg-white/10 text-muted-foreground"><Copy className="w-3 h-3" /></button>
                          </div>
                          <p className="text-slate-300 leading-relaxed break-all max-h-20 overflow-y-auto">{promptText}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-[#3ecf8e]/20 text-[#3ecf8e] hover:bg-[#3ecf8e]/30"><Download className="w-3.5 h-3.5" />下载</button>
                        <button onClick={handleSaveToAsset} disabled={result?.savedToAsset} className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50', result?.savedToAsset ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30')}><ShieldCheck className="w-3.5 h-3.5" />{result?.savedToAsset ? '已保存' : '保存到资产库'}</button>
                      </div>
                    </>) : (
                      <div className={cn('text-xs text-center py-4', isDark ? 'text-slate-500' : 'text-gray-400')}>暂无预览数据</div>
                    )}
                  </div>
                );
              })()}

              {/* 故事板分镜V2版 专属配置 */}
              {selectedNode.type === 'storyboard_v2' && (() => {
                const p = { inputText: '', shotCount: 6, style: 'realistic', quality: 'hd', temperature: 0.7, model: 'glm-4.5-air', ...(editData.params || {}) };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-sm rounded-md border px-2.5 py-2', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200');
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>剧本参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">分镜头数量</Label>
                        <input type="number" min={4} max={12} value={p.shotCount} onChange={e => setP({ shotCount: Math.max(4, Math.min(12, Number(e.target.value) || 6)) })} className={selectCls} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">风格预设</Label>
                        <select value={p.style} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实</option>
                          <option value="anime">动画</option>
                          <option value="comic">漫画</option>
                          <option value="watercolor">水彩</option>
                          <option value="oil_painting">油画</option>
                          <option value="chinese">中国风</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">画质</Label>
                        <select value={p.quality} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                          <option value="standard">标准</option>
                          <option value="hd">高清</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">Temperature: {p.temperature}</Label>
                        <input type="range" min={0.1} max={1} step={0.1} value={p.temperature} onChange={e => setP({ temperature: Number(e.target.value) })} className="w-full" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">模型</Label>
                        <select value={p.model} onChange={e => setP({ model: e.target.value })} className={selectCls}>
                          <option value="glm-4.5-air">GLM-4.5-Air</option>
                          <option value="glm-4.7-flash">GLM-4.7-Flash</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 分镜头参考图 专属配置 */}
              {selectedNode.type === 'shot_ref_image' && (() => {
                const p = { gridSize: '4', quality: 'hd', style: 'realistic', ...(editData.params || {}) };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-sm rounded-md border px-2.5 py-2', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200');
                const images = selectedNode.data.result?.images || [];
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>生成参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">宫格模式</Label>
                        <select value={p.gridSize} onChange={e => setP({ gridSize: e.target.value })} className={selectCls}>
                          <option value="4">四宫格 (2x2)</option>
                          <option value="6">六宫格 (2x3)</option>
                          <option value="9">九宫格 (3x3)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">画质</Label>
                        <select value={p.quality} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                          <option value="standard">标准</option>
                          <option value="hd">高清</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">风格</Label>
                        <select value={p.style} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实</option>
                          <option value="anime">动画</option>
                          <option value="comic">漫画</option>
                          <option value="watercolor">水彩</option>
                        </select>
                      </div>
                    </div>
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>生成结果</h3>
                        <div className="flex items-center gap-1.5 text-xs"><FileImage className="w-3.5 h-3.5 text-orange-400" /><span className="text-muted-foreground">数量：</span><span>{images.length} 张</span></div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {images.map((url: string, i: number) => (
                            <img key={i} src={url} alt={`shot-${i}`} className="w-full aspect-square object-cover rounded border border-white/10" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 人物角色设计图 / 场景设计图 专属配置 */}
              {(selectedNode.type === 'character_design_image' || selectedNode.type === 'scene_design_image') && (() => {
                const p = { quality: 'hd', style: 'realistic', ...(editData.params || {}) };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-sm rounded-md border px-2.5 py-2', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200');
                const images = selectedNode.data.result?.images || [];
                const isChar = selectedNode.type === 'character_design_image';
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>生成参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">画质</Label>
                        <select value={p.quality} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                          <option value="standard">标准</option>
                          <option value="hd">高清</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">风格</Label>
                        <select value={p.style} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实</option>
                          <option value="anime">动画</option>
                          <option value="comic">漫画</option>
                          <option value="watercolor">水彩</option>
                        </select>
                      </div>
                      {isChar && <div className="text-[10px] text-muted-foreground">每个角色：站姿3 + 特写2 + 服饰2 = 7 张图</div>}
                      {!isChar && <div className="text-[10px] text-muted-foreground">场景图：16:9 比例，无人物</div>}
                    </div>
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>生成结果</h3>
                        <div className="flex items-center gap-1.5 text-xs"><FileImage className="w-3.5 h-3.5 text-orange-400" /><span className="text-muted-foreground">数量：</span><span>{images.length} 张</span></div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {images.map((url: string, i: number) => (
                            <img key={i} src={url} alt={`${isChar ? 'char' : 'scene'}-${i}`} className="w-full aspect-video object-cover rounded border border-white/10" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TVC 起始节点专属配置 + 级联参数 */}
              {selectedNode.type === 'tvc_script' && (() => {
                const p = { optimizeMode: 'tvc_deep', executionMode: 'auto', style: 'realistic', quality: 'hd', ...(editData.params || {}) };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-sm rounded-md border px-2.5 py-2', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200');
                const [modelsOpen, setModelsOpen] = useState(false);
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>TVC 参数配置</h3>

                    {/* 基础配置 */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">优化模式</Label>
                        <select value={p.optimizeMode} onChange={e => setP({ optimizeMode: e.target.value })} className={selectCls}>
                          <option value="tvc_deep">深度分析优化</option>
                          <option value="tvc_fast">快速优化</option>
                          <option value="tvc_vision">参考图优化</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">执行模式</Label>
                        <select value={p.executionMode} onChange={e => setP({ executionMode: e.target.value })} className={selectCls}>
                          <option value="auto">一键生成</option>
                          <option value="step">分步执行</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">总时长</Label>
                          <select value={p.totalDuration || 30} onChange={e => setP({ totalDuration: Number(e.target.value) })} className={selectCls}>
                            <option value={15}>15s</option>
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>60s</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">品质</Label>
                          <select value={p.quality} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                            <option value="hd">高清</option>
                            <option value="standard">标清</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">画面风格</Label>
                        <select value={p.style} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实</option>
                          <option value="anime">动画</option>
                          <option value="comic">漫画</option>
                          <option value="oil_painting">油画</option>
                          <option value="chinese">水墨</option>
                        </select>
                      </div>
                    </div>

                    {/* 级联计算 */}
                    {(() => {
                      const calc = calcTvcParams(p.totalDuration || 30);
                      return (
                        <div className={cn('rounded-lg p-3 space-y-1.5', isDark ? 'bg-slate-900/50' : 'bg-white')}>
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">自动计算</div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">镜头数</span>
                            <span className="font-mono font-semibold text-blue-500">{calc.shotCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">生图数</span>
                            <span className="font-mono">{calc.imageCount} 张</span>
                          </div>
                          <div className="flex justify-between text-xs border-t pt-1.5 mt-1.5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
                            <span className="text-muted-foreground">预估积分</span>
                            <span className="font-mono font-semibold text-amber-500">{calc.estimatedCost} 分</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 模型选择（折叠） */}
                    <div className={cn('border-t pt-3', isDark ? 'border-white/10' : 'border-gray-200')}>
                      <button onClick={() => setModelsOpen(!modelsOpen)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
                        <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', modelsOpen && 'rotate-90')} />
                        模型选择
                      </button>
                      {modelsOpen && (
                        <div className="space-y-3 mt-3">
                          <div>
                            <Label className="text-xs mb-1.5 block text-muted-foreground">剧本生成</Label>
                            <select value={p.scriptModel || 'glm-5.1'} onChange={e => setP({ scriptModel: e.target.value })} className={selectCls}>
                              <option value="glm-5.1">GLM-5.1（推荐）</option>
                              <option value="glm-4.5-air">GLM-4.5-air（快速）</option>
                              <option value="MiniMax-M2.7">MiniMax-M2.7</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5 block text-muted-foreground">提示词优化</Label>
                            <select value={p.optimizeModel || 'glm-4.5-air'} onChange={e => setP({ optimizeModel: e.target.value })} className={selectCls}>
                              <option value="glm-4.5-air">GLM-4.5-air（推荐）</option>
                              <option value="glm-5.1">GLM-5.1</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5 block text-muted-foreground">生图模型</Label>
                            <select value={p.imageModel || 'gpt-image-2'} onChange={e => setP({ imageModel: e.target.value })} className={selectCls}>
                              <option value="gpt-image-2">GPT-Image-2（推荐）</option>
                              <option value="minimax">MiniMax Image</option>
                              <option value="jimeng">即梦</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5 block text-muted-foreground">视频模型</Label>
                            <select value={p.videoModel || 'seedance'} onChange={e => setP({ videoModel: e.target.value })} className={selectCls}>
                              <option value="seedance">Seedance（推荐）</option>
                              <option value="minimax">MiniMax Hailuo 2.3</option>
                              <option value="glm">GLM CogVideoX-3</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5 block text-muted-foreground">BGM 模型</Label>
                            <select value={p.bgmModel || 'music-2.6'} onChange={e => setP({ bgmModel: e.target.value })} className={selectCls}>
                              <option value="music-2.6">MiniMax Music-2.6</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 分镜头故事板 专属配置 */}
              {selectedNode.type === 'storyboard_generator' && (() => {
                const p = {
                  style: 'realistic', aspectRatio: '16:9', quality: 'hd', dataSource: '', count: 6,
                  referenceAssets: [] as string[], characterRefs: [] as any[],
                  videoProvider: 'minimax' as const, videoModel: 'hailuo-2.3-fast-768P', videoDuration: 5,
                  enableBgm: true, enableVoiceover: false, enableAssetSave: true,
                  ...(editData.params || {}),
                };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-xs rounded-md border px-2 py-1.5', isDark ? 'bg-white/[0.02] border-white/[0.06] text-slate-300' : 'bg-gray-50/50 border-gray-100 text-gray-700');
                const providerModels: Record<string, { label: string; value: string }[]> = {
                  minimax: [{ label: 'Hailuo-2.3-Fast', value: 'hailuo-2.3-fast-768P' }, { label: 'Hailuo-2.3', value: 'hailuo-2.3-768P' }],
                  glm: [{ label: 'CogVideoX-3', value: 'cogvideox-3' }],
                  jimeng: [{ label: 'Jimeng-Video', value: 'jimeng-video' }],
                };
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>图片参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">场景描述</Label>
                        <textarea value={p.dataSource} onChange={e => setP({ dataSource: e.target.value })} rows={3}
                          placeholder="从上游节点自动获取，或手动输入..."
                          className={cn('w-full text-xs resize-none rounded-md border px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200')} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">风格</Label>
                        <select value={p.style} onChange={e => setP({ style: e.target.value })} className={selectCls}>
                          <option value="realistic">写实风格</option>
                          <option value="anime">动漫风格</option>
                          <option value="watercolor">水彩风格</option>
                          <option value="oilpainting">油画风格</option>
                          <option value="3d">3D渲染</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">宽高比</Label>
                          <select value={p.aspectRatio} onChange={e => setP({ aspectRatio: e.target.value })} className={selectCls}>
                            <option value="16:9">16:9</option><option value="9:16">9:16</option>
                            <option value="4:3">4:3</option><option value="1:1">1:1</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">质量</Label>
                          <select value={p.quality} onChange={e => setP({ quality: e.target.value })} className={selectCls}>
                            <option value="standard">标清</option><option value="hd">高清</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>视频参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">视频 API</Label>
                        <select value={p.videoProvider} onChange={e => {
                          const prov = e.target.value;
                          const defaultModel = providerModels[prov]?.[0]?.value || '';
                          setP({ videoProvider: prov, videoModel: defaultModel });
                        }} className={selectCls}>
                          <option value="minimax">MiniMax Hailuo（推荐）</option>
                          <option value="glm">智谱 GLM CogVideoX</option>
                          <option value="jimeng">即梦 Jimeng</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">模型</Label>
                        <select value={p.videoModel} onChange={e => setP({ videoModel: e.target.value })} className={selectCls}>
                          {(providerModels[p.videoProvider] || []).map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">单镜头时长: {p.videoDuration}s</Label>
                        <input type="range" min={3} max={10} step={1} value={p.videoDuration}
                          onChange={e => setP({ videoDuration: Number(e.target.value) })}
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-[9px] text-muted-foreground"><span>3s</span><span>10s</span></div>
                      </div>
                    </div>

                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>音频</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={p.enableBgm} onChange={e => setP({ enableBgm: e.target.checked })} className="rounded" />
                        背景音乐（MiniMax Music）
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={p.enableVoiceover} onChange={e => setP({ enableVoiceover: e.target.checked })} className="rounded" />
                        配音旁白（MiniMax TTS）
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* TVC 视频合成 专属配置 */}
              {selectedNode.type === 'storyboard_video' && (() => {
                const p = {
                  transition: 'fade', outputFormat: 'mp4', resolution: '720p',
                  enableBgmMix: true, bgmVolume: 0.3,
                  ...(editData.params || {}),
                };
                const setP = (update: Record<string, any>) => {
                  const newParams = { ...p, ...update };
                  handleInputChange('params', newParams);
                  if (selectedNodeId) updateNode(selectedNodeId, { params: newParams });
                };
                const selectCls = cn('w-full text-xs rounded-md border px-2 py-1.5', isDark ? 'bg-white/[0.02] border-white/[0.06] text-slate-300' : 'bg-gray-50/50 border-gray-100 text-gray-700');
                return (
                  <div className={cn('space-y-4 p-4 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
                    <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>合成参数</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">镜头转场</Label>
                        <select value={p.transition} onChange={e => setP({ transition: e.target.value })} className={selectCls}>
                          <option value="fade">淡入淡出</option>
                          <option value="dissolve">溶解</option>
                          <option value="cut">硬切</option>
                          <option value="wipe">擦除</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">分辨率</Label>
                          <select value={p.resolution} onChange={e => setP({ resolution: e.target.value })} className={selectCls}>
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                            <option value="480p">480p</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1.5 block text-muted-foreground">格式</Label>
                          <select value={p.outputFormat} onChange={e => setP({ outputFormat: e.target.value })} className={selectCls}>
                            <option value="mp4">MP4</option>
                            <option value="webm">WebM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>音频</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={p.enableBgmMix} onChange={e => setP({ enableBgmMix: e.target.checked })} className="rounded" />
                        混合背景音乐
                      </label>
                      {p.enableBgmMix && (
                        <div>
                          <Label className="text-xs mb-1 block text-muted-foreground">BGM 音量: {Math.round(p.bgmVolume * 100)}%</Label>
                          <input type="range" min={0} max={1} step={0.05} value={p.bgmVolume}
                            onChange={e => setP({ bgmVolume: Number(e.target.value) })}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 节点参数（已有专属配置的节点跳过通用区域） */}
              {!CUSTOM_PANEL_NODE_TYPES.has(selectedNode.type || '') && (
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

// ==================== 提示词优化子组件 ====================

function StoryboardPromptOptimizer({
  rawPrompt, optimizedPrompt, editablePrompt, onOptimizedChange, onReset,
  temperature, systemPromptTemplate, model, style, quality, isDark,
}: {
  rawPrompt: string
  optimizedPrompt: string
  editablePrompt: string
  onOptimizedChange: (optimized: string, editable: string) => void
  onReset: () => void
  temperature: number
  systemPromptTemplate: string
  model: string
  style?: string
  quality?: string
  isDark: boolean
}) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const hasOptimized = !!optimizedPrompt

  const handleOptimize = useCallback(async () => {
    if (!rawPrompt) { toast.error('请先输入故事描述'); return }
    setIsOptimizing(true)
    setError(null)
    try {
      const optimized = await optimizePromptWithGLM(rawPrompt, { temperature, systemPromptTemplate, model, style, quality })
      onOptimizedChange(optimized, optimized)
      toast.success('提示词优化完成')
    } catch (err: any) {
      setError('优化失败: ' + (err.message?.includes('Unknown error') ? '网络错误，请检查连接' : err.message || '未知错误'))
    } finally {
      setIsOptimizing(false)
    }
  }, [rawPrompt, temperature, systemPromptTemplate, model, onOptimizedChange, toast])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>
          <Sparkles className="w-3.5 h-3.5 inline text-amber-400 mr-1" />
          提示词优化
        </h3>
        <div className="flex items-center gap-1">
          {hasOptimized && (
            <button onClick={onReset} className="p-1 rounded text-[10px] transition-colors hover:bg-white/10 text-slate-400">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !rawPrompt}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
              isOptimizing || !rawPrompt
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
            )}
          >
            {isOptimizing ? <><Loader2 className="w-3 h-3 animate-spin" />优化中...</> : <><Sparkles className="w-3 h-3" />{hasOptimized ? '重新优化' : '优化提示词'}</>}
          </button>
        </div>
      </div>

      {hasOptimized && (
        <div className="space-y-1.5">
          <textarea
            value={editablePrompt}
            onChange={(e) => onOptimizedChange(optimizedPrompt, e.target.value)}
            rows={4}
            className={cn('w-full text-xs resize-none rounded-md border px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary', isDark ? 'bg-slate-900/50 border-white/10 text-slate-200' : 'bg-white border-gray-200')}
            placeholder="优化后的提示词（可编辑）"
          />
          {editablePrompt !== optimizedPrompt && (
            <p className="text-[10px] text-amber-500">提示词已手动修改</p>
          )}
        </div>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
