/**
 * TVC 起始节点 — 文案/剧本生成
 *
 * 功能：输入区域 + 参考图上传 + 模型选择(功能名) + 分步/一键执行
 * 模式：分步执行(显示下游节点执行按钮) / 一键生成(隐藏下游节点执行按钮)
 */

import { memo, useCallback, useState, useRef, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  FileText, X, Image as ImageIcon,
  Play, Zap, Loader2, Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../ui/Theme';
import { useToast } from '@/hooks/useToast';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { tvcApi, type TvcScript, type ProductAnalysis, type TvcCharacter, type TvcScene } from '@/lib/api/tvc-api';
import { useIMETextarea } from '@/hooks/useIMETextarea';
import { useTvcExecution } from './useTvcExecution';
import { calcTvcParams } from '@/lib/tvc-cascade';

// ==================== 类型 ====================

export interface TvcScriptData extends WorkflowNodeData {
  params: {
    inputText: string;
    referenceImage: string | null;
    optimizeMode: string;
    executionMode: 'step' | 'auto';
    style: string;
    quality: string;
    temperature: number;
    maxLength: number;
    shotCount?: number;
    shotDuration?: number;
    totalDuration?: number;
    imageModel?: string;
    videoModel?: string;
  };
  result?: {
    script?: TvcScript;
    analysis?: ProductAnalysis;
    taskId?: string;
  };
}

// ==================== 常量 ====================

const OPTIMIZE_MODES = [
  { key: 'tvc_minimax', label: 'MiniMax 2.7（推荐）' },
  { key: 'tvc_deep', label: '深度分析优化' },
  { key: 'tvc_fast', label: '快速优化' },
  { key: 'tvc_vision', label: '参考图优化' },
] as const;

const INPUT_PLACEHOLDER = `描述你的 TVC 广告创意，例如：
"30秒咖啡品牌TVC：清晨第一杯咖啡唤醒都市生活的温暖故事"

支持上传产品参考图 → 自动分析视觉风格 → 注入脚本生成`;

// ==================== 组件 ====================

export const TvcScriptNode = memo(({ id, data }: { id: string; data: TvcScriptData }) => {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore();

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ime = useIMETextarea(data.params.inputText);

  const { isExecuting, executeStep, executeAuto } = useTvcExecution(id, data, updateNodeParams, updateNode);

  const params = data.params;
  const result = data.result;

  // ---- 模型选择 ----
  const handleModeChange = useCallback((mode: string) => {
    updateNodeParams(id, { optimizeMode: mode });
  }, [id, updateNodeParams]);

  // ---- 参考图上传 ----
  const handleImageUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      updateNodeParams(id, {
        referenceImage: base64,
        optimizeMode: 'tvc_vision',
      });

      setAnalysisLoading(true);
      try {
        const { analysis } = await tvcApi.analyzeProductReference({ imageUrl: base64 });
        updateNode(id, { result: { ...data.result, analysis } });
        toast.success('产品参考图分析完成');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`参考图分析失败: ${message}`);
      } finally {
        setAnalysisLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [id, updateNodeParams, updateNode, data.result, toast]);

  const handleRemoveImage = useCallback(() => {
    updateNodeParams(id, { referenceImage: null });
    if (params.optimizeMode === 'tvc_vision') {
      updateNodeParams(id, { optimizeMode: 'tvc_deep' });
    }
    updateNode(id, { result: { ...data.result, analysis: undefined } });
  }, [id, params.optimizeMode, updateNodeParams, updateNode, data.result]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  }, [handleImageUpload]);

  // ---- 积分预估 ----
  const costEstimate = useMemo(() => {
    const calc = calcTvcParams(params.totalDuration || 30);
    return calc;
  }, [params.totalDuration]);

  // ---- 渲染 ----
  const isRunning = data.status === NodeStatus.RUNNING || isExecuting;
  const hasScript = !!result?.script;
  const hasImage = !!params.referenceImage;

  return (
    <div className={cn(
      'w-[320px] rounded-2xl backdrop-blur-xl border overflow-hidden',
      'card-node',
      isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-gray-200',
      isRunning && 'ring-2 ring-blue-500/50',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-b',
        isDark ? 'border-white/5 bg-blue-500/10' : 'border-gray-100 bg-blue-50',
      )}>
        <FileText className="w-4 h-4 text-blue-500" />
        <span className={cn('text-sm font-semibold flex-1', isDark ? 'text-slate-100' : 'text-gray-800')}>
          TVC 文案/剧本
        </span>
        <div className={cn(
          'w-2.5 h-2.5 rounded-full',
          isRunning ? 'bg-blue-500 animate-pulse' :
          data.status === NodeStatus.SUCCESS ? 'bg-green-500' :
          data.status === NodeStatus.ERROR ? 'bg-red-500' :
          'bg-gray-400',
        )} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* 输入区域 */}
        <div className="relative">
          <textarea
            value={ime.value}
            onChange={ime.createOnChange((v) => updateNodeParams(id, { inputText: v }))}
            onCompositionStart={ime.onCompositionStart}
            onCompositionEnd={(e) => ime.handleCompositionEnd(e, (v) => updateNodeParams(id, { inputText: v }))}
            placeholder={INPUT_PLACEHOLDER}
            disabled={isRunning}
            className={cn(
              'w-full min-h-[120px] max-h-[120px] rounded-xl px-3 py-2.5 text-sm resize-none',
              'border focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              'placeholder:text-muted-foreground/50',
              isDark
                ? 'bg-slate-800/50 border-white/10 text-slate-200'
                : 'bg-gray-50 border-gray-200 text-gray-800',
            )}
          />
          {hasScript && (
            <div className={cn(
              'absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full',
              'bg-green-500/20 text-green-600',
            )}>
              已生成 {result.script?.shots?.length || 0} 个镜头
            </div>
          )}
        </div>

        {/* 参考图 + 模型选择 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {hasImage ? (
              <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/10">
                <img src={params.referenceImage!} alt="ref" className="w-full h-full object-cover" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  'border border-dashed transition-colors',
                  isDark
                    ? 'border-white/20 hover:border-blue-400 text-white/40 hover:text-blue-400'
                    : 'border-gray-300 hover:border-blue-400 text-gray-400 hover:text-blue-400',
                )}
              >
                {analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </button>
            )}
          </div>

          <select
            value={params.optimizeMode}
            onChange={(e) => handleModeChange(e.target.value)}
            disabled={isRunning || hasImage}
            className={cn(
              'flex-1 h-9 rounded-lg px-2 text-xs border',
              isDark
                ? 'bg-slate-800/50 border-white/10 text-slate-200'
                : 'bg-gray-50 border-gray-200 text-gray-700',
            )}
          >
            {OPTIMIZE_MODES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* 参考图分析结果 */}
        {result?.analysis && (
          <div className={cn(
            'text-[11px] px-2 py-1.5 rounded-lg',
            isDark ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-50 text-purple-700',
          )}>
            <span className="font-medium">风格：</span>{result.analysis.visual_style}
            <span className="ml-2 font-medium">情绪：</span>{result.analysis.mood}
          </div>
        )}

        {/* 脚本结果预览 */}
        {hasScript && result.script && (
          <div className={cn(
            'rounded-lg p-2.5 text-[11px] space-y-2 max-h-[160px] overflow-y-auto',
            isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200',
          )}>
            <div className="font-semibold text-green-600">
              {result.script.tvc_title} · {result.script.shots?.length || 0} 镜头
            </div>
            {result.script.logline && (
              <div className="text-muted-foreground italic">{result.script.logline}</div>
            )}
            {/* 人物 */}
            {(result.script.characters as TvcCharacter[])?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(result.script.characters as TvcCharacter[]).map((c, i) => (
                  <span key={i} className={cn(
                    'px-1.5 py-0.5 rounded text-[10px]',
                    c.role === '主角' ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-500/20 text-muted-foreground',
                  )}>
                    {c.name}({c.role})
                  </span>
                ))}
              </div>
            )}
            {/* 镜头列表 */}
            {result.script.shots?.map((shot, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex gap-1 text-muted-foreground">
                  <span className="text-green-500 w-8 shrink-0">#{shot.shot_id}</span>
                  <span className="truncate">{shot.scene_description}</span>
                </div>
                {(shot.dialogue ?? []).length > 0 && (
                  <div className="pl-8 text-muted-foreground/70">
                    {(shot.dialogue ?? []).map((d, j) => (
                      <span key={j} className="mr-1.5">{d.character}:「{d.line}」</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {result.script.narration && (
              <div className="text-muted-foreground border-t border-green-500/20 pt-1 mt-1 italic">
                旁白：{result.script.narration.slice(0, 80)}...
              </div>
            )}
          </div>
        )}

        {/* 积分成本预估 */}
        <div className={cn(
          'rounded-lg p-2.5 text-[11px] space-y-1.5',
          isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200',
        )}>
          <div className="flex items-center gap-1 font-semibold text-amber-600">
            <Coins className="w-3.5 h-3.5" />
            积分成本预估
            <span className="ml-auto font-mono text-amber-500">{params.totalDuration || 30}s</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>文本生成</span>
            <span className="text-right font-mono">{costEstimate.costBreakdown.text} 分</span>
            <span>生图 ×{costEstimate.imageCount}（首帧+尾帧）</span>
            <span className="text-right font-mono">{costEstimate.costBreakdown.image} 分</span>
            <span>视频 ×{costEstimate.shotCount}</span>
            <span className="text-right font-mono">{costEstimate.costBreakdown.video} 分</span>
            <span>BGM</span>
            <span className="text-right font-mono">{costEstimate.costBreakdown.bgm} 分</span>
          </div>
          <div className={cn(
            'flex justify-between items-center pt-1.5 border-t font-semibold',
            isDark ? 'border-amber-500/20' : 'border-amber-200',
          )}>
            <span className="text-amber-700">预估总计</span>
            <span className="font-mono text-amber-600 text-sm">{costEstimate.estimatedCost} 分</span>
          </div>
        </div>
      </div>

      {/* 底部双模式按钮 */}
      <div className={cn(
        'flex gap-2 px-4 py-3 border-t',
        isDark ? 'border-white/5 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50',
      )}>
        <button
          onClick={executeStep}
          disabled={isRunning || !params.inputText.trim()}
          className={cn(
            'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5',
            'text-xs font-medium transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            isDark
              ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-200'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200',
          )}
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          分步执行
        </button>
        <button
          onClick={executeAuto}
          disabled={isRunning || !params.inputText.trim()}
          className={cn(
            'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5',
            'text-xs font-medium transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
            'text-white shadow-lg shadow-blue-500/25',
          )}
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          一键生成
        </button>
      </div>

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-script"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
    </div>
  );
});

TvcScriptNode.displayName = 'TvcScriptNode';

export default TvcScriptNode;
