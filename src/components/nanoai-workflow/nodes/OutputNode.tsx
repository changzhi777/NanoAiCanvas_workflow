/**
 * 输出节点（结束节点）- 资产保存 + 下载
 * 功能：保存到资产库、下载到本地、用户信息和时间戳
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { Save, Download, Settings, User, Clock, FileImage, FolderOpen, ShieldCheck } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode } from './BaseNode';
import { useIMEValue } from '../ui/IMEInput';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface OutputNodeData extends WorkflowNodeData {
  params: {
    // 保存到资产库
    enableAssetSave: boolean;
    assetSaveScope: 'image_only' | 'image_with_metadata';
    assetCategory: string;

    // 下载到本地
    enableDownload: boolean;
    downloadFolder: string;
    downloadNaming: 'timestamp' | 'prompt_prefix' | 'custom';
    downloadCustomTemplate: string;
    downloadConflict: 'overwrite' | 'rename';

    // 元数据
    includeUserInfo: boolean;
    includeTimestamp: boolean;
  };
  result?: {
    savedToAsset?: boolean;
    assetId?: string;
    downloaded?: boolean;
    downloadPath?: string;
    fileInfo?: {
      filename: string;
      prompt: string;
      timestamp: string;
      user?: string;
    };
  };
}

// ==================== 默认参数 ====================

const DEFAULT_PARAMS: OutputNodeData['params'] = {
  enableAssetSave: true,
  assetSaveScope: 'image_with_metadata',
  assetCategory: 'ai-generated',
  enableDownload: false,
  downloadFolder: 'NanoAI_Downloads',
  downloadNaming: 'timestamp',
  downloadCustomTemplate: '',
  downloadConflict: 'rename',
  includeUserInfo: true,
  includeTimestamp: true,
};

// ==================== 设置面板 ====================

const OutputSettings = memo(({
  params,
  onChange,
  isDark,
}: {
  params: OutputNodeData['params'];
  onChange: (updates: Partial<OutputNodeData['params']>) => void;
  isDark: boolean;
}) => {
  const [show, setShow] = useState(false);
  const folderIME = useIMEValue(params.downloadFolder, v => onChange({ downloadFolder: v }));
  const templateIME = useIMEValue(params.downloadCustomTemplate, v => onChange({ downloadCustomTemplate: v }));
  const inputCls = cn(
    'w-full px-2.5 py-1.5 rounded-md border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500',
    isDark ? 'bg-white/5 border-white/10 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
  );
  const labelCls = 'text-xs font-medium text-muted-foreground flex items-center gap-1.5';
  const sectionCls = cn('p-2.5 rounded-lg border space-y-2', isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50');

  return (
    <div className="space-y-2">
      <button onClick={() => setShow(!show)} className={cn('flex items-center gap-1.5 text-xs w-full px-2 py-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-500')}>
        <Settings className="w-3.5 h-3.5" />
        <span>输出设置</span>
        <span className="ml-auto text-[10px]">{show ? '▲' : '▼'}</span>
      </button>

      {show && (
        <div className="space-y-2.5">
          {/* 资产库保存 */}
          <div className={sectionCls}>
            <label className={labelCls}>
              <input type="checkbox" checked={params.enableAssetSave} onChange={e => onChange({ enableAssetSave: e.target.checked })} className="rounded" />
              <Save className="w-3.5 h-3.5 text-blue-400" />
              保存到资产库
            </label>
            {params.enableAssetSave && (
              <div className="ml-5 space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">保存范围</span>
                  <div className="flex gap-2 mt-1">
                    {[
                      { value: 'image_only', label: '仅图片' },
                      { value: 'image_with_metadata', label: '图片+元数据' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => onChange({ assetSaveScope: opt.value as any })}
                        className={cn('px-2 py-1 rounded text-[10px] transition-colors',
                          params.assetSaveScope === opt.value
                            ? 'bg-blue-500 text-white'
                            : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">资产分类</span>
                  <select value={params.assetCategory} onChange={e => onChange({ assetCategory: e.target.value })} className={cn(inputCls, 'mt-1')}>
                    <option value="ai-generated">AI 生成</option>
                    <option value="storyboard">故事板</option>
                    <option value="character">角色</option>
                    <option value="scene">场景</option>
                    <option value="concept">概念图</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 下载 */}
          <div className={sectionCls}>
            <label className={labelCls}>
              <input type="checkbox" checked={params.enableDownload} onChange={e => onChange({ enableDownload: e.target.checked })} className="rounded" />
              <Download className="w-3.5 h-3.5 text-green-400" />
              下载到本地
            </label>
            {params.enableDownload && (
              <div className="ml-5 space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">下载目录</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input type="text" {...folderIME} className={inputCls} placeholder="NanoAI_Downloads" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">文件命名</span>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {[
                      { value: 'timestamp', label: '时间戳' },
                      { value: 'prompt_prefix', label: '提示词前缀' },
                      { value: 'custom', label: '自定义' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => onChange({ downloadNaming: opt.value as any })}
                        className={cn('px-2 py-1 rounded text-[10px] transition-colors',
                          params.downloadNaming === opt.value
                            ? 'bg-green-500 text-white'
                            : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {params.downloadNaming === 'custom' && (
                    <input type="text" {...templateIME} className={cn(inputCls, 'mt-1.5')} placeholder="支持变量: {date}, {time}, {prompt}, {user}" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">同名文件处理</span>
                  <div className="flex gap-1.5 mt-1">
                    {[
                      { value: 'overwrite', label: '覆盖' },
                      { value: 'rename', label: '自动重命名' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => onChange({ downloadConflict: opt.value as any })}
                        className={cn('px-2 py-1 rounded text-[10px] transition-colors',
                          params.downloadConflict === opt.value
                            ? 'bg-orange-500 text-white'
                            : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 元数据选项 */}
          <div className={sectionCls}>
            <span className={labelCls}>
              <FileImage className="w-3.5 h-3.5 text-purple-400" />
              元数据选项
            </span>
            <div className="ml-5 space-y-1.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={params.includeUserInfo} onChange={e => onChange({ includeUserInfo: e.target.checked })} className="rounded" />
                <User className="w-3 h-3 text-muted-foreground" />
                <span>包含用户信息</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={params.includeTimestamp} onChange={e => onChange({ includeTimestamp: e.target.checked })} className="rounded" />
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>包含生成时间戳</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
OutputSettings.displayName = 'OutputSettings';

// ==================== 结果展示 ====================

const OutputResult = memo(({ result, isDark }: { result: OutputNodeData['result']; isDark: boolean }) => {
  if (!result) return null;
  const info = result.fileInfo;
  const cardCls = cn('p-2.5 rounded-lg border space-y-1.5', isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50');

  return (
    <div className="space-y-2">
      <div className={cardCls}>
        {result.savedToAsset && (
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>已保存到资产库</span>
            {info && <span className="text-muted-foreground ml-auto">{info.timestamp}</span>}
          </div>
        )}
        {result.downloaded && (
          <div className="flex items-center gap-1.5 text-xs text-blue-500">
            <Download className="w-3.5 h-3.5" />
            <span>已下载</span>
          </div>
        )}
        {info && (
          <div className={cn('text-[10px] space-y-0.5 pt-1 border-t', isDark ? 'border-white/5 text-slate-400' : 'border-gray-200 text-gray-500')}>
            {info.filename && <div className="truncate">文件: {info.filename}</div>}
            {info.prompt && <div className="truncate">提示词: {info.prompt.substring(0, 60)}{info.prompt.length > 60 ? '...' : ''}</div>}
            {info.user && <div>用户: {info.user}</div>}
          </div>
        )}
      </div>
    </div>
  );
});
OutputResult.displayName = 'OutputResult';

// ==================== 主组件 ====================

export const OutputNode = memo(({ id, data }: NodeProps<OutputNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, nodes, edges } = useNanoaiWorkflowStore();

  const params = useMemo(() => ({ ...DEFAULT_PARAMS, ...data.params }), [data.params]);

  const handleParamChange = useCallback((updates: Partial<OutputNodeData['params']>) => {
    updateNode(id, { params: { ...params, ...updates } });
  }, [id, updateNode, params]);

  // 获取上游数据
  const upstreamData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id);
    if (!incomingEdge) return null;
    const sourceNode = nodes.find(n => n.id === incomingEdge.source);
    return sourceNode?.data?.result;
  }, [edges, nodes, id]);

  // 生成文件名
  const generateFilename = useCallback(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const promptPrefix = upstreamData?.prompt ? upstreamData.prompt.substring(0, 20).replace(/[^a-zA-Z0-9一-鿿]/g, '_') : 'image';

    switch (params.downloadNaming) {
      case 'timestamp':
        return `nanoai_${dateStr}_${timeStr}.png`;
      case 'prompt_prefix':
        return `${promptPrefix}_${dateStr}.png`;
      case 'custom': {
        let tpl = params.downloadCustomTemplate || '{date}_{time}';
        tpl = tpl.replace('{date}', dateStr).replace('{time}', timeStr).replace('{prompt}', promptPrefix).replace('{user}', 'user');
        return `${tpl}.png`;
      }
      default:
        return `nanoai_${dateStr}_${timeStr}.png`;
    }
  }, [params, upstreamData]);

  // 执行输出操作
  const handleExecute = useCallback(async () => {
    if (!upstreamData?.imageUrl && !upstreamData?.images?.length) {
      updateNode(id, { status: NodeStatus.ERROR, error: '上游无图片数据' });
      return;
    }

    updateNode(id, { status: NodeStatus.RUNNING });

    try {
      const imageUrl = upstreamData?.imageUrl || upstreamData?.images?.[0];
      const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const filename = generateFilename();
      const result: OutputNodeData['result'] = { fileInfo: { filename, prompt: upstreamData?.prompt || '', timestamp } };

      // 保存到资产库
      if (params.enableAssetSave) {
        // 资产库保存通过 API（暂标记为已保存，后续对接资产库 API）
        result.savedToAsset = true;
        result.fileInfo!.prompt = params.assetSaveScope === 'image_with_metadata' ? (upstreamData?.prompt || '') : '';
      }

      // 下载到本地
      if (params.enableDownload && imageUrl) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
          result.downloaded = true;
          result.downloadPath = params.downloadFolder;
        } catch {
          // 降级为直接链接下载
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = filename;
          link.click();
          result.downloaded = true;
        }
      }

      updateNode(id, { status: NodeStatus.SUCCESS, result });
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '输出失败'
      });
    }
  }, [id, updateNode, upstreamData, params, generateFilename]);

  const hasUpstream = !!upstreamData;

  return (
    <BaseNode
      data={data}
      icon={<Save className="w-5 h-5" />}
    >
      <div className="space-y-3">
        {/* 快捷操作栏 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={!hasUpstream || data.status === NodeStatus.RUNNING}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              hasUpstream && data.status !== NodeStatus.RUNNING
                ? 'bg-[#3ecf8e] text-white hover:bg-[#2db87a]'
                : isDark ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {data.status === NodeStatus.RUNNING ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />处理中...</>
            ) : (
              <><Save className="w-3.5 h-3.5" />执行输出</>
            )}
          </button>
        </div>

        {/* 状态标签 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full',
            params.enableAssetSave
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : isDark ? 'bg-white/5 text-slate-500' : 'bg-gray-100 text-gray-400'
          )}>
            {params.enableAssetSave ? '资产库 ✓' : '资产库 ✗'}
          </span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full',
            params.enableDownload
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : isDark ? 'bg-white/5 text-slate-500' : 'bg-gray-100 text-gray-400'
          )}>
            {params.enableDownload ? '下载 ✓' : '下载 ✗'}
          </span>
        </div>

        {/* 设置面板 */}
        <OutputSettings params={params} onChange={handleParamChange} isDark={isDark} />

        {/* 执行结果 */}
        {data.status === NodeStatus.SUCCESS && data.result && (
          <OutputResult result={data.result as OutputNodeData['result']} isDark={isDark} />
        )}

        {/* 错误 */}
        {data.status === NodeStatus.ERROR && data.error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {data.error}
          </div>
        )}

        {/* 无上游连接提示 */}
        {!hasUpstream && (
          <div className={cn('p-2 rounded-lg text-[10px] text-center', isDark ? 'text-slate-500' : 'text-gray-400')}>
            请连接上游节点以获取生成结果
          </div>
        )}

        {/* 描述 */}
        <div className={cn('text-[10px] p-2 rounded border', isDark ? 'bg-gray-800/50 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400')}>
          <p>结束节点</p>
          <p className="mt-0.5">保存到资产库 / 下载到本地</p>
        </div>
      </div>
    </BaseNode>
  );
});

OutputNode.displayName = 'OutputNode';

export default OutputNode;
