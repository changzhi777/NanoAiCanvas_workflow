'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  RefreshCw,
  Route,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { client } from '@/lib/api/client'

interface ModelOption {
  id: number
  name: string
  code: string
  provider_name: string
}

interface RouteEntry {
  id: number
  category: string
  model_id: number
  model_name: string
  model_code: string
  provider_name: string
  is_active: boolean
}

const NODE_CATEGORIES = [
  { category: 'glm_text', label: 'GLM 文本', provider: 'zhipu' },
  { category: 'glm_video', label: 'GLM 视频', provider: 'zhipu' },
  { category: 'glm_multimodal', label: 'GLM 多模态', provider: 'zhipu' },
  { category: 'glm_tts', label: 'GLM TTS', provider: 'zhipu' },
  { category: 'glm_tts_clone', label: 'GLM 语音克隆', provider: 'zhipu' },
  { category: 'glm_realtime', label: 'GLM 实时语音', provider: 'zhipu' },
  { category: 'minimax_text', label: 'MiniMax 文本', provider: 'minimax' },
  { category: 'minimax_speech', label: 'MiniMax 语音', provider: 'minimax' },
  { category: 'minimax_video', label: 'MiniMax 视频', provider: 'minimax' },
  { category: 'minimax_music', label: 'MiniMax 音乐', provider: 'minimax' },
  { category: 'minimax_image', label: 'MiniMax 图片', provider: 'minimax' },
  { category: 'minimax_coding', label: 'MiniMax 编程', provider: 'minimax' },
  { category: 'jimeng_image', label: '即梦图片', provider: 'jimeng' },
  { category: 'jimeng_video', label: '即梦视频', provider: 'jimeng' },
  { category: 'qwen_text', label: '通义千问文本', provider: 'qwen' },
  { category: 'qwen_coding', label: '通义千问编程', provider: 'qwen' },
  { category: 'kimi_text', label: 'Kimi 文本', provider: 'kimi' },
  { category: 'kimi_longcontext', label: 'Kimi 长文本', provider: 'kimi' },
  { category: 'skills_optimize', label: 'Skills 提示词优化', provider: 'zhipu' },
  { category: 'skills_task', label: 'Skills 图片生成', provider: 'wuyin' },
  { category: 'script_generator', label: '脚本生成', provider: 'zhipu' },
  { category: 'prompt_wizard', label: '提示词向导', provider: 'zhipu' },
  { category: 'text_enhance', label: '提示词增强', provider: 'minimax' },
  { category: 'image_to_prompt', label: '图片识图生词', provider: 'zhipu' },
  { category: 'storyboard', label: '分镜脚本', provider: 'zhipu' },
  { category: 'realtime_voice', label: '实时语音对话', provider: 'zhipu' },
  { category: 'voice_clone', label: '声音克隆', provider: 'zhipu' },
]

export default function ModelRoutesPage() {
  const [routes, setRoutes] = useState<RouteEntry[]>([])
  const [allModels, setAllModels] = useState<ModelOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // 本地编辑状态：category → model_id
  const [editMap, setEditMap] = useState<Record<string, number>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [routesData, providersData] = await Promise.all([
        client.get<RouteEntry[]>('/api/v2/admin/model-routes'),
        client.get<Array<{ id: number; name: string }>>('/api/v2/admin/providers'),
      ])
      setRoutes(routesData)

      // 构建路由映射
      const map: Record<string, number> = {}
      for (const r of routesData) {
        map[r.category] = r.model_id
      }
      setEditMap(map)

      // 加载所有模型作为选项
      const models: ModelOption[] = []
      for (const p of providersData) {
        try {
          const pModels = await client.get<Array<{ id: number; name: string; code: string }>>(
            `/api/v2/admin/providers/${p.id}/models`
          )
          models.push(...pModels.map(m => ({ ...m, provider_name: p.name })))
        } catch { /* skip */ }
      }
      setAllModels(models)
    } catch {
      toast.error('加载数据失败')
    }
    setLoading(false)
  }

  const handleSave = async (category: string) => {
    const modelId = editMap[category]
    if (!modelId) {
      toast.error('请选择一个模型')
      return
    }
    setSaving(category)
    try {
      await client.post('/api/v2/admin/model-routes', { category, model_id: modelId })
      toast.success(`路由 "${category}" 已保存`)
      // 刷新
      const routesData = await client.get<RouteEntry[]>('/api/v2/admin/model-routes')
      setRoutes(routesData)
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
    setSaving(null)
  }

  const handleDelete = async (routeId: number, category: string) => {
    if (!confirm(`确定删除路由 "${category}" 吗？删除后将使用默认模型。`)) return
    try {
      await client.delete(`/api/v2/admin/model-routes/${routeId}`)
      setRoutes(prev => prev.filter(r => r.id !== routeId))
      setEditMap(prev => {
        const n = { ...prev }
        delete n[category]
        return n
      })
      toast.success('路由已删除，将使用默认模型')
    } catch {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader title="模型路由" subtitle="配置节点类型使用的模型" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="模型路由"
        subtitle="配置 Workflow 节点类型使用哪个模型，动态切换无需改代码"
        action={
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium w-48">节点类型</th>
                  <th className="text-left p-3 font-medium">当前模型</th>
                  <th className="text-left p-3 font-medium">切换到</th>
                  <th className="text-right p-3 font-medium w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                {NODE_CATEGORIES.map(({ category, label }) => {
                  const existing = routes.find(r => r.category === category)
                  const selectedModelId = editMap[category] || existing?.model_id
                  const isModified = existing ? editMap[category] !== existing.model_id : !!editMap[category]

                  return (
                    <tr key={category} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground font-mono">{category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {existing ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{existing.model_name}</div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-muted-foreground">{existing.model_code}</code>
                              <Badge variant="outline" className="text-[10px]">{existing.provider_name}</Badge>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">使用默认配置</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={selectedModelId || ''}
                          onChange={(e) => setEditMap(prev => ({
                            ...prev,
                            [category]: Number(e.target.value),
                          }))}
                          className="w-full max-w-xs px-2 py-1.5 border rounded-md bg-background text-sm"
                        >
                          <option value="">-- 使用默认 --</option>
                          {allModels.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.provider_name})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isModified && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSave(category)}
                              disabled={saving === category}
                            >
                              {saving === category ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                          {existing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(existing.id, category)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
