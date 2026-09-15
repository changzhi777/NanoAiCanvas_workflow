/**
 * TVC 起始节点 — 文案/剧本生成
 *
 * 功能：输入区域 + 参考图上传 + 模型选择(功能名) + 分步/一键执行
 * 模式：分步执行(显示下游节点执行按钮) / 一键生成(隐藏下游节点执行按钮)
 */

import { memo, useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import {
  FileText, X, Image as ImageIcon,
  Play, Zap, Loader2, Coins, ChevronDown, ChevronRight, Square, Eye, EyeOff, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../ui/Theme';
import { useToast } from '@/hooks/useToast';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { tvcApi, type TvcScript, type ProductAnalysis, type TvcCharacter } from '@/lib/api/tvc-api';
import { useIMETextarea } from '@/hooks/useIMETextarea';
import { useTvcExecution } from './useTvcExecution';
import { calcTvcParams } from '@/lib/tvc-cascade';
import { LanternImage } from '../ui/LanternImage';
import { MiniVideoPlayer } from '../ui/MiniVideoPlayer';
import { PromptOptimizerDialog } from '../ui/PromptOptimizerDialog';

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
    oneShot?: boolean;      // 一镜到底：单段长镜头（shotCount=1）
    imageModel?: string;
    videoModel?: string;
    scriptModel?: string;
    optimizeModel?: string;
    bgmModel?: string;
    cameraMovement?: string;
    lightStyle?: string;
    negativePrompts?: string[];
    /** 一镜到底模式（K3）：产品参考图（与 referenceImage 独立） */
    productImage?: string | null;
    /** 一镜到底"再生成一次"：复用的 composition_seed */
    oneShotSeed?: string;
  };
  result?: {
    script?: TvcScript;
    analysis?: ProductAnalysis;
    taskId?: string;
    tvcProjectId?: string;
    /** SSE 实时进度（运行中更新） */
    progress?: import('@/lib/api/tvc-api').TvcTaskProgress;
    /** 完成后产物：视频 URL + 一镜到底 meta */
    videoUrl?: string;
    oneShot?: {
      narrative?: string;
      composition?: string;
      composition_seed?: string;
      duration?: number;
      template_name?: string;
    };
  };
}

// ==================== 常量 ====================

const OPTIMIZE_MODES = [
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
  const [costExpanded, setCostExpanded] = useState(false);
  const ime = useIMETextarea(data.params.inputText);

  const { isExecuting, executeStep, executeAuto } = useTvcExecution(id, data, updateNodeParams, updateNode);

  // ---- 终止任务 ----
  const handleCancelTask = useCallback(async () => {
    if (!window.confirm('确认终止当前 TVC 任务？已扣积分不予退还。')) return;
    const taskId = (data.result as { taskId?: string } | undefined)?.taskId;
    try {
      if (taskId) {
        await tvcApi.cancelTask(taskId);
      }
      updateNode(id, { status: NodeStatus.ERROR, error: '任务已手动终止' });
      toast.success('任务已终止');
    } catch (err) {
      toast.error(`终止失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [id, data.result, updateNode, toast]);

  const params = data.params;
  const result = data.result;

  // ---- 参考图上传（双图位：character + object） ----
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = useCallback(async (field: 'referenceImage' | 'productImage', file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const updates: Record<string, unknown> = { [field]: base64 };
      if (field === 'referenceImage') {
        updates.optimizeMode = 'tvc_vision';  // 触发现有分析流程
      }
      updateNodeParams(id, updates);

      if (field === 'referenceImage') {
        setAnalysisLoading(true);
        try {
          const { analysis } = await tvcApi.analyzeProductReference({ imageUrl: base64 });
          updateNode(id, { result: { ...data.result, analysis } });
          toast.success('参考图分析完成');
        } catch (err) {
          toast.error(`参考图分析失败: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setAnalysisLoading(false);
        }
      }
    } catch (err) {
      toast.error(`图片读取失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [id, updateNodeParams, updateNode, data.result, toast]);

  const handleRemoveImage = useCallback((field: 'referenceImage' | 'productImage') => {
    updateNodeParams(id, { [field]: null });
    if (field === 'referenceImage' && params.optimizeMode === 'tvc_vision') {
      updateNodeParams(id, { optimizeMode: 'tvc_deep' });
      updateNode(id, { result: { ...data.result, analysis: undefined } });
    }
  }, [id, params.optimizeMode, updateNodeParams, updateNode, data.result]);


  // ---- 积分预估 ----
  const costEstimate = useMemo(() => {
    const calc = calcTvcParams(params.totalDuration || 30);
    return calc;
  }, [params.totalDuration]);

  // ---- 渲染 ----
  const isRunning = data.status === NodeStatus.RUNNING || isExecuting;
  const hasScript = !!result?.script;
  
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
          {data.label || 'TVC 文案/剧本'}
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
              'w-full min-h-[90px] max-h-[120px] rounded-xl px-3 py-2.5 text-sm resize-none',
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

        {/* 双灯笼图位（character + object）+ 模型选择 */}
        <div className="flex items-center gap-2">
          <LanternImage
            label="请上传人物"
            value={params.referenceImage ?? null}
            onChange={(f) => f ? handleImageUpload('referenceImage', f) : handleRemoveImage('referenceImage')}
            status={analysisLoading ? 'uploading' : (params.referenceImage ? 'done' : 'empty')}
            variant="character"
          />
          <LanternImage
            label="请上传产品"
            value={params.productImage ?? null}
            onChange={(f) => f ? handleImageUpload('productImage', f) : handleRemoveImage('productImage')}
            status={params.productImage ? 'done' : 'empty'}
            variant="object"
          />
          <div className={cn(
            'flex-1 h-9 rounded-lg px-2 text-xs flex items-center border',
            isDark
              ? 'bg-slate-800/50 border-white/10 text-slate-400'
              : 'bg-gray-50 border-gray-200 text-gray-500',
          )}>
            {OPTIMIZE_MODES.find(m => m.key === params.optimizeMode)?.label || '深度分析优化'}
          </div>
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
            'rounded-lg p-2.5 text-[11px] space-y-2 max-h-[120px] overflow-y-auto',
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
          'rounded-lg text-[11px]',
          isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200',
        )}>
          <button
            onClick={() => setCostExpanded(!costExpanded)}
            className="w-full flex items-center gap-1 font-semibold text-amber-600 px-2.5 py-2"
          >
            {costExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Coins className="w-3.5 h-3.5" />
            积分预估
            <span className="ml-auto font-mono text-amber-600 text-sm">{costEstimate.estimatedCost} 分</span>
            <span className="font-mono text-amber-500">·{params.totalDuration || 30}s</span>
          </button>
          {costExpanded && (
            <div className="px-2.5 pb-2 space-y-1.5">
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
            </div>
          )}
        </div>
      </div>

      {/* 运行中：实时进度 + ETA */}
      {isRunning && (() => {
        const prog = result?.progress;
        const pct = prog?.overall_progress ?? 0;
        const eta = prog?.eta_seconds;
        const fmt = (s: number) => s >= 3600 ? `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m` : `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
        return (
          <div className={cn('px-4 pb-2 space-y-1.5', isDark ? '' : '')}>
            <div className={cn('flex items-center justify-between text-[10px] font-mono', isDark ? 'text-slate-400' : 'text-gray-500')}>
              <span>执行中 {pct}%{prog?.elapsed_seconds != null && ` · 已用 ${fmt(prog.elapsed_seconds)}`}</span>
              {typeof eta === 'number' && eta > 0 ? (
                <span className={isDark ? 'text-cyan-400/80' : 'text-cyan-600'}>
                  剩余 ~{fmt(eta)}{prog?.eta_confidence === 'low' ? ' (粗估)' : ''}
                </span>
              ) : (
                <span className="opacity-60">计算中…</span>
              )}
            </div>
            <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-slate-800' : 'bg-gray-200')}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* 一镜到底完成：内嵌播放器 + "再生成一次"（复用 composition_seed） */}
      {!isRunning && result?.videoUrl && params.shotCount === 1 && (() => {
        const one = result.oneShot;
        const handleRegenerate = () => {
          const seed = one?.composition_seed;
          if (!seed) {
            toast.error('无可用 seed，无法复现');
            return;
          }
          executeAuto({ oneShotSeed: seed });
        };
        return (
          <div className="px-4 pb-3">
            <MiniVideoPlayer
              src={result.videoUrl}
              meta={{
                duration: one?.duration,
                composition: one?.composition,
                narrative: one?.narrative,
                composition_seed: one?.composition_seed,
              }}
              onRegenerate={handleRegenerate}
            />
          </div>
        );
      })()}

      {/* K1 一镜到底：底部按钮区分（带提示词优化入口） */}
      {isRunning ? (
        <div className={cn(
          'flex gap-2 px-4 py-3 border-t',
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50',
        )}>
          <button
            onClick={handleCancelTask}
            className={cn(
              'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5',
              'text-xs font-medium transition-all',
              'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30',
            )}
          >
            <Square className="w-3.5 h-3.5" />
            终止任务
          </button>
        </div>
      ) : (
        <div className={cn(
          'flex gap-2 px-4 py-3 border-t',
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50',
        )}>
          <button
            onClick={executeStep}
            disabled={!params.inputText.trim()}
            className={cn(
              'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5',
              'text-xs font-medium transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isDark
                ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-200'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200',
            )}
          >
            <Play className="w-3.5 h-3.5" />
            分步执行
          </button>
          <button
            onClick={() => executeAuto()}
            disabled={!params.inputText.trim()}
            className={cn(
              'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5',
              'text-xs font-medium transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
              'text-white shadow-lg shadow-blue-500/25',
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            一键生成
          </button>
        </div>
      )}

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
