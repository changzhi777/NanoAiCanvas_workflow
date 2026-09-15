'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trash2, Database, RefreshCw, Pencil, Plus, Save, X } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { client } from '@/lib/api/client'
import { toast } from 'sonner'

// ─── 类型 ───────────────────────────────────────────────────────────

interface OneShotTemplate {
  id: string
  narrative: string
  composition: string
  name: string
  prompt_template: string
  recommended_duration: number
  motion_chain: string
  bpm_hint: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface LogStatsRow {
  narrative: string | null
  composition: string | null
  name: string
  action: string | null
  count: number
}

interface RecentLog {
  id: string
  task_id: string
  user_id: string | null
  narrative: string
  composition: string
  action: string
  created_at: string
}

interface TemplateForm {
  narrative: string
  composition: string
  name: string
  prompt_template: string
  recommended_duration: number
  motion_chain: string
  bpm_hint: number | null
  is_active: boolean
}

const NARRATIVES = ['display', 'plot', 'hybrid'] as const
const COMPOSITIONS = ['character_object', 'front_side', 'merged', 'clean_bg'] as const
const MOTION_CHAINS = ['human_motion', 'product_motion', 'interactive', 'orbit_motion', 'orbit_product', 'dolly_pan', 'subtle_pushin'] as const
const ACTIONS = ['generated', 'shown', 'downloaded', 'cancelled', 'optimized'] as const

const NARRATIVE_LABEL: Record<string, string> = {
  display: '纯展示',
  plot: '剧情',
  hybrid: '混合',
}

const COMPOSITION_LABEL: Record<string, string> = {
  character_object: '人+物',
  front_side: '正+侧',
  merged: '合并',
  clean_bg: '纯色底',
}

const ACTION_LABEL: Record<string, string> = {
  generated: '生成',
  shown: '展示',
  downloaded: '下载',
  cancelled: '取消',
  optimized: '优化',
}

const NARRATIVE_COLOR: Record<string, string> = {
  display: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  plot: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  hybrid: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
}

const EMPTY_FORM: TemplateForm = {
  narrative: 'display',
  composition: 'character_object',
  name: '',
  prompt_template: '',
  recommended_duration: 12,
  motion_chain: 'human_motion',
  bpm_hint: null,
  is_active: true,
}

// ─── A/B 统计卡片 ───────────────────────────────────────────────────

function StatsCard() {
  const [stats, setStats] = useState<LogStatsRow[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await client.get<LogStatsRow[]>(`/v2/admin/tvc-one-shot-logs/stats?days=${days}`)
      setStats(data)
    } catch (e) {
      toast.error('加载 A/B 统计失败：' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  // 按 name 聚合：generated 为分母计算触达率
  const byName = new Map<string, LogStatsRow[]>()
  for (const row of stats) {
    const key = row.name || '未命名'
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(row)
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold">A/B 埋点统计</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs"
          >
            <option value={7}>近 7 天</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
          <button onClick={load} className="p-1.5 hover:bg-white/10 rounded" title="刷新">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {byName.size === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">暂无埋点数据（用户使用一镜到底后自动积累）</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-white/10">
                <th className="py-2 pr-4">模板</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="py-2 pr-4 text-center">{ACTION_LABEL[a]}</th>
                ))}
                <th className="py-2 text-center">触达率</th>
              </tr>
            </thead>
            <tbody>
              {[...byName.entries()].map(([name, rows]) => {
                const cnt = (a: string) => rows.find((r) => r.action === a)?.count ?? 0
                const gen = cnt('generated')
                const shown = cnt('shown')
                const rate = gen > 0 ? Math.round((shown / gen) * 100) : 0
                return (
                  <tr key={name} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <span className="font-medium">{name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {NARRATIVE_LABEL[rows[0].narrative || ''] || '-'} · {COMPOSITION_LABEL[rows[0].composition || ''] || '-'}
                      </span>
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="py-2 pr-4 text-center text-slate-300">{cnt(a)}</td>
                    ))}
                    <td className="py-2 text-center">
                      <span className={rate >= 50 ? 'text-emerald-400' : rate >= 20 ? 'text-amber-400' : 'text-slate-500'}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── 编辑弹窗 ───────────────────────────────────────────────────────

function TemplateDialog({
  form,
  isNew,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: TemplateForm
  isNew: boolean
  saving: boolean
  onChange: (f: TemplateForm) => void
  onSave: () => void
  onClose: () => void
}) {
  const set = <K extends keyof TemplateForm>(k: K, v: TemplateForm[K]) => onChange({ ...form, [k]: v })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isNew ? '新建模板' : '编辑模板'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">名称</span>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">动作链</span>
            <select
              value={form.motion_chain}
              onChange={(e) => set('motion_chain', e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            >
              {MOTION_CHAINS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">叙事类型</span>
            <select
              value={form.narrative}
              onChange={(e) => set('narrative', e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            >
              {NARRATIVES.map((n) => <option key={n} value={n}>{n}（{NARRATIVE_LABEL[n]}）</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">构图类型</span>
            <select
              value={form.composition}
              onChange={(e) => set('composition', e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            >
              {COMPOSITIONS.map((c) => <option key={c} value={c}>{c}（{COMPOSITION_LABEL[c]}）</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">推荐时长（秒）</span>
            <input
              type="number" min={4} max={15}
              value={form.recommended_duration}
              onChange={(e) => set('recommended_duration', Number(e.target.value))}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">BPM 提示（可空）</span>
            <input
              type="number" min={40} max={200}
              value={form.bpm_hint ?? ''}
              onChange={(e) => set('bpm_hint', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs text-slate-400">
            提示词模板（占位符：{'{subject} {object} {composition_motion} {lighting} {duration_s}'}
          </span>
          <textarea
            value={form.prompt_template}
            onChange={(e) => set('prompt_template', e.target.value)}
            rows={8}
            className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="accent-cyan-500"
          />
          <span className="text-sm">启用（未启用的模板不会被随机选中）</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">
            取消
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.prompt_template.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 主页面 ─────────────────────────────────────────────────────────

export default function TvcOneShotAdminPage() {
  const [templates, setTemplates] = useState<OneShotTemplate[]>([])
  const [recent, setRecent] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterNarrative, setFilterNarrative] = useState('')
  const [filterComposition, setFilterComposition] = useState('')
  const [editing, setEditing] = useState<TemplateForm | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterNarrative) params.set('narrative', filterNarrative)
      if (filterComposition) params.set('composition', filterComposition)
      const qs = params.toString()
      const [tpl, logs] = await Promise.all([
        client.get<OneShotTemplate[]>(`/v2/admin/tvc-one-shot-templates${qs ? `?${qs}` : ''}`),
        client.get<RecentLog[]>('/v2/admin/tvc-one-shot-logs/recent?limit=20'),
      ])
      setTemplates(tpl)
      setRecent(logs)
    } catch (e) {
      toast.error('加载失败：' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filterNarrative, filterComposition])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditingId(null)
    setEditing({ ...EMPTY_FORM })
  }

  const openEdit = (t: OneShotTemplate) => {
    setEditingId(t.id)
    setEditing({
      narrative: t.narrative,
      composition: t.composition,
      name: t.name,
      prompt_template: t.prompt_template,
      recommended_duration: t.recommended_duration,
      motion_chain: t.motion_chain,
      bpm_hint: t.bpm_hint,
      is_active: t.is_active,
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await client.post('/v2/admin/tvc-one-shot-templates', editing)
      toast.success(editingId ? '模板已更新' : '模板已创建')
      setEditing(null)
      await load()
    } catch (e) {
      toast.error('保存失败：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: OneShotTemplate) => {
    if (!confirm(`确认删除模板「${t.name}」？A/B 统计历史会保留（template_id 置空）。`)) return
    try {
      await client.delete(`/v2/admin/tvc-one-shot-templates/${t.id}`)
      toast.success('已删除')
      await load()
    } catch (e) {
      toast.error('删除失败：' + (e as Error).message)
    }
  }

  const handleSeed = async () => {
    if (!confirm('确认重置为 12 个默认模板？现有模板（含自定义）将被覆盖删除。')) return
    setSeeding(true)
    try {
      const r = await client.post<{ seeded: number }>('/v2/admin/tvc-one-shot-templates/seed-defaults')
      toast.success(`已重置 ${r.seeded} 个默认模板`)
      setFilterNarrative('')
      setFilterComposition('')
      await load()
    } catch (e) {
      toast.error('重置失败：' + (e as Error).message)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="一镜到底模板"
        subtitle="4 构图 × 3 叙事 = 12 模板，AI 随机选配；支持自定义编辑与 A/B 埋点分析"
        action={
          <div className="flex gap-2">
            <button
              onClick={openNew}
              className="px-3 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> 新建
            </button>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 flex items-center gap-1.5 disabled:opacity-40"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              重置默认
            </button>
          </div>
        }
      />

      <StatsCard />

      {/* 模板列表 */}
      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">模板列表（{templates.length}）</h2>
          <div className="flex gap-2">
            <select
              value={filterNarrative}
              onChange={(e) => setFilterNarrative(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs"
            >
              <option value="">全部叙事</option>
              {NARRATIVES.map((n) => <option key={n} value={n}>{NARRATIVE_LABEL[n]}</option>)}
            </select>
            <select
              value={filterComposition}
              onChange={(e) => setFilterComposition(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs"
            >
              <option value="">全部构图</option>
              {COMPOSITIONS.map((c) => <option key={c} value={c}>{COMPOSITION_LABEL[c]}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">无匹配模板（当前过滤条件下）</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-white/10">
                  <th className="py-2 pr-4">叙事</th>
                  <th className="py-2 pr-4">构图</th>
                  <th className="py-2 pr-4">名称</th>
                  <th className="py-2 pr-4 text-center">时长</th>
                  <th className="py-2 pr-4">动作链</th>
                  <th className="py-2 pr-4 text-center">BPM</th>
                  <th className="py-2 pr-4 text-center">启用</th>
                  <th className="py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs border ${NARRATIVE_COLOR[t.narrative] || 'border-white/10'}`}>
                        {NARRATIVE_LABEL[t.narrative] || t.narrative}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{COMPOSITION_LABEL[t.composition] || t.composition}</td>
                    <td className="py-2.5 pr-4 font-medium">{t.name}</td>
                    <td className="py-2.5 pr-4 text-center text-slate-300">{t.recommended_duration}s</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{t.motion_chain}</td>
                    <td className="py-2.5 pr-4 text-center text-slate-400">{t.bpm_hint ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className={t.is_active ? 'text-emerald-400' : 'text-slate-600'}>
                        {t.is_active ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-white/10 rounded" title="编辑">
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 hover:bg-red-500/10 rounded" title="删除">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 最近埋点 */}
      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-5 space-y-3">
        <h2 className="text-base font-semibold">最近埋点（{recent.length}）</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">暂无记录</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {recent.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5">
                <span className="font-mono text-slate-500 w-32 truncate">{log.task_id}</span>
                <span className="text-slate-400">{NARRATIVE_LABEL[log.narrative] || log.narrative} · {COMPOSITION_LABEL[log.composition] || log.composition}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{ACTION_LABEL[log.action] || log.action}</span>
                <span className="ml-auto text-slate-600">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TemplateDialog
          form={editing}
          isNew={editingId === null}
          saving={saving}
          onChange={setEditing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
