'use client'

/**
 * Nano2 TVC 视频生成面板
 * 三栏布局：输入+配置 | 执行+进度 | 项目列表
 *
 * 使用方法:
 *   import { Nano2TvcPanel } from '@/components/Nano2TvcPanel'
 *   <Nano2TvcPanel />
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  FileText, Image as ImageIcon, Upload, Zap, Loader2, AlertCircle,
  Settings2, ChevronDown, ChevronRight, Play, X, Coins,
  Package, Film, Video, Clock, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTvcStore } from '@/stores/tvcStore'
import { useIMETextarea } from '@/hooks/useIMETextarea'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/remoteStore'
import { AssetSelector } from '@/components/ui/AssetLibrary'
import { TvcExecutionPanel, type TvcExecutionState } from '@/components/nanoai-workflow/ui/TvcExecutionPanel'
import { TvcProjectDetail } from '@/components/nanoai-workflow/ui/TvcProjectDetail'
import { calcTvcParams, formatDuration, getModelDurationOptions } from '@/lib/tvc-cascade'
import { CAMERA_MOVEMENTS, LIGHT_DESCRIPTIONS, VIDEO_STYLES, NEGATIVE_PROMPTS } from '@/lib/seedance-prompt'
import type { Asset } from '@/lib/api/client'

// ==================== 常量 ====================

const OPTIMIZE_MODES = [
  { key: 'tvc_deep', label: '深度分析优化' },
  { key: 'tvc_fast', label: '快速优化' },
  { key: 'tvc_vision', label: '参考图优化' },
] as const

const STYLE_OPTIONS = VIDEO_STYLES.map(s => ({ value: s.value, label: s.label }))

const VIDEO_MODELS = [
  { value: 'auto', label: '自动（推荐）' },
  { value: 'jimeng-video-01', label: 'Seedance 2.0（即梦）' },
  { value: 'hailuo-2.3-fast-768P', label: 'Hailuo 2.3 Fast（MiniMax）' },
  { value: 'cogvideox-3', label: 'CogVideoX-3（GLM）' },
]

// 总时长选项由视频模型动态生成（见下方 getDurationOptions）

const INPUT_PLACEHOLDER = `描述你的 TVC 广告创意，例如：
"30秒咖啡品牌TVC：清晨第一杯咖啡唤醒都市生活的温暖故事"

支持上传产品参考图或从资产库选择 → 自动分析视觉风格`

// ==================== 主组件 ====================

export function Nano2TvcPanel() {
  const inputText = useTvcStore((s) => s.inputText)
  const referenceImage = useTvcStore((s) => s.referenceImage)
  const analysis = useTvcStore((s) => s.analysis)
  const optimizeMode = useTvcStore((s) => s.optimizeMode)
  const style = useTvcStore((s) => s.style)
  const totalDuration = useTvcStore((s) => s.totalDuration)
  const videoModel = useTvcStore((s) => s.videoModel)
  const cameraMovement = useTvcStore((s) => s.cameraMovement)
  const lightStyle = useTvcStore((s) => s.lightStyle)
  const negativePrompts = useTvcStore((s) => s.negativePrompts)
  const isExecuting = useTvcStore((s) => s.isExecuting)
  const phase = useTvcStore((s) => s.phase)
  const progress = useTvcStore((s) => s.progress)
  const projectId = useTvcStore((s) => s.projectId)
  const projects = useTvcStore((s) => s.projects)
  const isLoadingProjects = useTvcStore((s) => s.isLoadingProjects)
  const calcResult = useTvcStore((s) => s.calcResult)
  const error = useTvcStore((s) => s.error)

  const setInputText = useTvcStore((s) => s.setInputText)
  const setReferenceImage = useTvcStore((s) => s.setReferenceImage)
  const setOptimizeMode = useTvcStore((s) => s.setOptimizeMode)
  const setStyle = useTvcStore((s) => s.setStyle)
  const setTotalDuration = useTvcStore((s) => s.setTotalDuration)
  const setVideoModel = useTvcStore((s) => s.setVideoModel)
  const setCameraMovement = useTvcStore((s) => s.setCameraMovement)
  const setLightStyle = useTvcStore((s) => s.setLightStyle)
  const setNegativePrompts = useTvcStore((s) => s.setNegativePrompts)
  const recalcParams = useTvcStore((s) => s.recalcParams)
  const executeAuto = useTvcStore((s) => s.executeAuto)
  const cancelExecution = useTvcStore((s) => s.cancelExecution)
  const reset = useTvcStore((s) => s.reset)
  const analyzeReferenceImage = useTvcStore((s) => s.analyzeReferenceImage)
  const loadProjects = useTvcStore((s) => s.loadProjects)
  const selectProject = useTvcStore((s) => s.selectProject)
  const deleteProject = useTvcStore((s) => s.deleteProject)

  const { toast } = useToast()
  const token = useAuthStore((s) => s.token)
  const ime = useIMETextarea(inputText)

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const imeOnChange = ime.createOnChange((v) => setInputText(v))

  // 加载项目列表
  useEffect(() => {
    if (token) loadProjects()
  }, [token, loadProjects])

  // 首次计算级联参数
  useEffect(() => {
    recalcParams()
  }, [recalcParams])

  // 组件卸载时关闭 SSE + 清理状态
  useEffect(() => {
    return () => { reset() }
  }, [reset])

  // ---- 文件上传 ----
  const handleFileUpload = useCallback(async (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setReferenceImage(base64, 'upload')
      await analyzeReferenceImage(base64)
      toast.success('参考图分析完成')
    }
    reader.readAsDataURL(file)
  }, [setReferenceImage, analyzeReferenceImage, toast])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }, [handleFileUpload])

  // ---- 资产选择 ----
  const handleAssetSelect = useCallback(async (asset: Asset) => {
    if (asset.url) {
      setReferenceImage(asset.url, 'asset')
      await analyzeReferenceImage(asset.url)
      toast.success('参考图分析完成')
    }
    setAssetPickerOpen(false)
  }, [setReferenceImage, analyzeReferenceImage, toast])

  // ---- 执行 ----
  const handleExecute = useCallback(async () => {
    await executeAuto()
  }, [executeAuto])

  // ---- 进度转换 ----
  const executionState: TvcExecutionState | null = useMemo(() => {
    if (!progress) return null
    return {
      task_id: progress.task_id,
      status: progress.status,
      overall_progress: progress.overall_progress,
      nodes: progress.nodes,
    }
  }, [progress])

  // ---- 正在查看项目详情 ----
  if (selectedProjectId) {
    return (
      <div className="col-span-12 min-h-0">
        <TvcProjectDetail
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
      </div>
    )
  }

  // ---- 正在执行 ----
  if (phase === 'executing' && executionState) {
    return (
      <div className="col-span-12 flex flex-col min-h-0 gap-3 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">TVC 视频生成中</span>
          </div>
          <Button size="sm" variant="outline" onClick={cancelExecution} className="h-7 text-xs">
            取消任务
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <TvcExecutionPanel state={executionState} onCancel={cancelExecution} />
        </div>
      </div>
    )
  }

  // ---- 查看结果 ----
  if (phase === 'result' && projectId) {
    return (
      <div className="col-span-12 grid grid-cols-12 gap-3 p-3 min-h-0">
        <div className="col-span-8 min-h-0">
          <TvcProjectDetail projectId={projectId} />
        </div>
        <div className="col-span-4 min-h-0">
          <ProjectList
            projects={projects}
            isLoading={isLoadingProjects}
            onSelect={selectProject}
            onDelete={deleteProject}
          />
        </div>
      </div>
    )
  }

  // ---- 默认：输入 + 配置 ----
  const calc = calcResult || calcTvcParams(totalDuration)
  const durationOptions = getModelDurationOptions(
    videoModel === 'auto' ? 'jimeng-video-01' : videoModel
  )

  return (
    <>
      {/* 隐藏文件上传 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 资产选择弹窗 */}
      <AssetSelector
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleAssetSelect}
        filterType="IMAGE"
        title="选择参考图"
      />

      {/* 左栏：输入 + 配置 */}
      <div className="col-span-5 min-h-0 flex flex-col gap-3 overflow-auto">
        {/* 文案输入 */}
        <div className="rounded-xl bg-card/60 border border-white/10 backdrop-blur-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-primary" />
            TVC 文案
          </div>
          <Textarea
            value={ime.value}
            onCompositionStart={ime.onCompositionStart}
            onCompositionEnd={(e) => ime.handleCompositionEnd(e, (v) => setInputText(v))}
            onChange={imeOnChange}
            placeholder={INPUT_PLACEHOLDER}
            className="min-h-[120px] resize-none bg-white/[0.02] border-white/5"
          />

          {/* 参考图 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="w-3 h-3" />
              参考图（可选）
            </div>
            {referenceImage ? (
              <div className="relative rounded-lg overflow-hidden border border-white/10">
                <img src={referenceImage} alt="参考图" className="w-full max-h-40 object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70"
                  onClick={() => setReferenceImage(null, null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                  上传图片
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={() => setAssetPickerOpen(true)}
                >
                  <Package className="w-3 h-3" />
                  从资产库
                </Button>
              </div>
            )}

            {/* 产品分析结果 */}
            {analysis && (
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-muted-foreground space-y-1">
                <div>产品：{analysis.product_name}</div>
                <div>风格：{analysis.visual_style}</div>
                <div>色调：{analysis.color_palette.join(', ')}</div>
              </div>
            )}
          </div>
        </div>

        {/* 配置 */}
        <div className="rounded-xl bg-card/60 border border-white/10 backdrop-blur-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">配置</span>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <Settings2 className="w-3 h-3" />
              高级
              {advancedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {/* 基础配置 */}
          <div className="grid grid-cols-2 gap-2">
            <ConfigSelect
              label="优化模式"
              value={optimizeMode}
              options={OPTIMIZE_MODES.map((m) => ({ value: m.key, label: m.label }))}
              onChange={setOptimizeMode}
            />
            <ConfigSelect
              label="风格"
              value={style}
              options={STYLE_OPTIONS}
              onChange={setStyle}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ConfigSelect
              label="总时长"
              value={String(totalDuration)}
              options={durationOptions.map((d) => ({ value: String(d), label: d < 60 ? `${d}s` : `${d / 60}m` }))}
              onChange={(v) => setTotalDuration(Number(v))}
            />
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">镜头数</div>
              <div className="h-8 flex items-center px-2 rounded-md bg-white/[0.02] border border-white/5 text-sm">
                {calc.shotCount}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">预估耗时</div>
              <div className="h-8 flex items-center px-2 rounded-md bg-white/[0.02] border border-white/5 text-sm">
                {formatDuration(calc.estimatedTimeMin)}
              </div>
            </div>
          </div>

          {/* 高级配置 */}
          {advancedOpen && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <ConfigSelect
                label="视频模型"
                value={videoModel}
                options={VIDEO_MODELS}
                onChange={setVideoModel}
              />
              <ConfigSelect
                label="默认镜头运动"
                value={cameraMovement}
                options={CAMERA_MOVEMENTS.map(c => ({ value: c.value, label: c.label }))}
                onChange={setCameraMovement}
              />
              <ConfigSelect
                label="光线风格"
                value={lightStyle}
                options={LIGHT_DESCRIPTIONS.map(l => ({ value: l.value, label: l.label }))}
                onChange={setLightStyle}
              />
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">负面约束</div>
                <div className="flex flex-wrap gap-1.5">
                  {NEGATIVE_PROMPTS.map(np => (
                    <label key={np.value} className="flex items-center gap-1 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(negativePrompts || ['avoid_jitter', 'avoid_bent_limbs']).includes(np.value)}
                        onChange={e => {
                          const current: string[] = negativePrompts || ['avoid_jitter', 'avoid_bent_limbs']
                          const next = e.target.checked
                            ? [...current, np.value]
                            : current.filter(v => v !== np.value)
                          setNegativePrompts(next)
                        }}
                        className="rounded"
                      />
                      {np.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Coins className="w-3 h-3" />
                预估消耗：{calc.estimatedCost} 积分
              </div>
              <div className="text-[10px] text-muted-foreground">
                图片 {calc.imageCount} 张 + 视频 {calc.videoCount} 个 + BGM
              </div>
            </div>
          )}
        </div>

        {/* 执行按钮 */}
        <Button
          className="w-full h-10 gap-2"
          onClick={handleExecute}
          disabled={isExecuting || !inputText.trim()}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              一键生成 TVC
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* 中栏：说明 + 最近项目预览 */}
      <div className="col-span-4 min-h-0 flex flex-col gap-3 overflow-auto">
        <div className="rounded-xl bg-card/60 border border-white/10 backdrop-blur-xl p-4">
          <h3 className="text-sm font-medium mb-3">TVC 视频生成流程</h3>
          <div className="space-y-2">
            {[
              { icon: FileText, label: '文案输入', desc: '输入广告创意描述' },
              { icon: ImageIcon, label: '参考图分析（可选）', desc: '上传产品图或从资产库选择' },
              { icon: Film, label: '脚本生成', desc: 'AI 自动生成结构化剧本' },
              { icon: ImageIcon, label: '分镜图片', desc: '为每个镜头生成首帧/尾帧' },
              { icon: Video, label: '视频合成', desc: '每个镜头生成视频片段' },
              { icon: Play, label: '成片输出', desc: '自动拼接 + BGM' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <step.icon className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium">{step.label}</div>
                  <div className="text-[10px] text-muted-foreground">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右栏：项目列表 */}
      <div className="col-span-3 min-h-0">
        <ProjectList
          projects={projects}
          isLoading={isLoadingProjects}
          onSelect={selectProject}
          onDelete={deleteProject}
        />
      </div>
    </>
  )
}

// ==================== 子组件 ====================

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 rounded-md bg-white/[0.02] border border-white/5 text-sm text-foreground focus:outline-none focus:border-primary/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ProjectList({
  projects,
  isLoading,
  onSelect,
  onDelete,
}: {
  projects: { id: string; name: string; status: string; updated_at: string; original_text: string }[]
  isLoading: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'text-slate-400' },
    processing: { label: '生成中', color: 'text-blue-400' },
    completed: { label: '已完成', color: 'text-green-400' },
    failed: { label: '失败', color: 'text-red-400' },
  }

  return (
    <div className="h-full rounded-xl bg-card/60 border border-white/10 backdrop-blur-xl flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
        <Film className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">TVC 项目</span>
        <span className="text-xs text-muted-foreground ml-auto">{projects.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
            加载中...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <Film className="w-6 h-6 mx-auto mb-2 opacity-30" />
            暂无项目
          </div>
        ) : (
          projects.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.draft
            return (
              <div
                key={p.id}
                className="group p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-colors cursor-pointer"
                onClick={() => onSelect(p.id)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{p.name}</span>
                      <span className={cn('text-[10px]', st.color)}>{st.label}</span>
                    </div>
                    {p.original_text && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.original_text}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <button
                    className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
