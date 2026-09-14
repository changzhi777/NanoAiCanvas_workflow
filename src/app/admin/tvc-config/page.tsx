'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw, Loader2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { client } from '@/lib/api/client'
import { toast } from 'sonner'

interface StepConfig {
  model?: string
  mode?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  default_provider?: string
  timeout?: number
  max_retries?: number
  batch_size?: number
  resolution?: string
  duration?: number
  prompt_template?: string
  is_instrumental?: boolean
  fallback_model?: string
}

interface TvcConfig {
  step1_script: StepConfig
  step2_optimize: StepConfig
  step3_breakdown: StepConfig
  step4_image: StepConfig
  step5_video: StepConfig
  step5_bgm: StepConfig
}

const DEFAULT_CONFIG: TvcConfig = {
  step1_script: { model: 'glm-5.1', fallback_model: 'MiniMax-M2.7', temperature: 1.0, max_tokens: 8192 },
  step2_optimize: { model: 'glm-4.5-air', temperature: 0.7, max_tokens: 4096 },
  step3_breakdown: { mode: 'logic' },
  step4_image: { default_provider: 'minimax', timeout: 120, max_retries: 3, batch_size: 3 },
  step5_video: { default_provider: 'minimax', timeout: 300, max_retries: 3, resolution: '768P', duration: 6 },
  step5_bgm: { model: 'music-2.6', is_instrumental: true },
}

const STEP_LABELS: Record<string, string> = {
  step1_script: 'Step 1: 剧本生成',
  step2_optimize: 'Step 2: 提示词优化',
  step3_breakdown: 'Step 3: 分镜拆分',
  step4_image: 'Step 4: 生图',
  step5_video: 'Step 5: 视频生成',
  step5_bgm: 'Step 5: BGM',
}

function StepCard({ step, label, config, onChange }: {
  step: string; label: string; config: StepConfig; onChange: (step: string, update: Partial<StepConfig>) => void
}) {
  const inputCls = 'w-full text-sm rounded-md border px-3 py-2 bg-white/5 border-white/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'text-xs text-muted-foreground mb-1.5 block'

  return (
    <div className="rounded-lg border border-white/10 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-blue-400">{label}</h4>

      {step !== 'step3_breakdown' && (
        <div>
          <label className={labelCls}>模型</label>
          <input value={config.model || ''} onChange={e => onChange(step, { model: e.target.value })} className={inputCls} />
        </div>
      )}

      {step === 'step1_script' && (
        <div>
          <label className={labelCls}>Fallback 模型</label>
          <input value={config.fallback_model || ''} onChange={e => onChange(step, { fallback_model: e.target.value })} className={inputCls} />
        </div>
      )}

      {(step === 'step1_script' || step === 'step2_optimize') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Temperature</label>
              <input type="number" step="0.1" value={config.temperature ?? 0.7} onChange={e => onChange(step, { temperature: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Tokens</label>
              <input type="number" value={config.max_tokens ?? 4096} onChange={e => onChange(step, { max_tokens: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>System Prompt</label>
            <textarea rows={4} value={config.system_prompt || ''} onChange={e => onChange(step, { system_prompt: e.target.value })} placeholder="留空使用默认提示词" className={`${inputCls} resize-none`} />
          </div>
        </>
      )}

      {(step === 'step4_image' || step === 'step5_video') && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Provider</label>
            <input value={config.default_provider || ''} onChange={e => onChange(step, { default_provider: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>超时(s)</label>
            <input type="number" value={config.timeout ?? 120} onChange={e => onChange(step, { timeout: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>重试次数</label>
            <input type="number" value={config.max_retries ?? 3} onChange={e => onChange(step, { max_retries: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
      )}

      {step === 'step5_video' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>分辨率</label>
            <input value={config.resolution || '768P'} onChange={e => onChange(step, { resolution: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>时长(s)</label>
            <input type="number" value={config.duration ?? 6} onChange={e => onChange(step, { duration: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
      )}

      {step === 'step5_video' && (
        <div>
          <label className={labelCls}>视频 Prompt 模板</label>
          <input value={config.prompt_template || ''} onChange={e => onChange(step, { prompt_template: e.target.value })} placeholder="TVC镜头{shot_num}，{duration}秒..." className={inputCls} />
        </div>
      )}

      {step === 'step5_bgm' && (
        <>
          <div>
            <label className={labelCls}>BGM Prompt 模板</label>
            <input value={config.prompt_template || ''} onChange={e => onChange(step, { prompt_template: e.target.value })} placeholder="TVC广告背景音乐，{mode}风格..." className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={config.is_instrumental ?? true} onChange={e => onChange(step, { is_instrumental: e.target.checked })} className="rounded" />
            纯器乐（无歌词）
          </label>
        </>
      )}
    </div>
  )
}

export default function TvcConfigPage() {
  const [config, setConfig] = useState<TvcConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const data = await client.get('/v2/tvc-config/global') as Record<string, any>
      setConfig({ ...DEFAULT_CONFIG, ...data })
    } catch (err) {
      toast.warning('加载配置失败，使用默认值')
      console.warn('TVC config load failed:', err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleChange = (step: string, update: Partial<StepConfig>) => {
    setConfig(prev => ({ ...prev, [step]: { ...(prev[step as keyof TvcConfig] || {}), ...update } }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await client.put('/v2/tvc-config/global', config)
      toast.success('TVC 全局配置已保存')
    } catch (err) {
      toast.error(`保存失败: ${err}`)
    } finally { setSaving(false) }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    toast.info('已恢复默认值（未保存）')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AdminHeader
        title="TVC 工作流配置"
        subtitle="管理 TVC 广告视频工作流各步骤的模型、提示词和参数"
        action={
          <div className="flex gap-2">
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-slate-300">
              <RotateCcw className="w-4 h-4" /> 恢复默认
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存配置
            </button>
          </div>
        }
      />

      <div className="grid gap-4">
        {(Object.keys(STEP_LABELS) as (keyof TvcConfig)[]).map(step => (
          <StepCard key={step} step={step} label={STEP_LABELS[step]} config={config[step]} onChange={handleChange} />
        ))}
      </div>
    </div>
  )
}
