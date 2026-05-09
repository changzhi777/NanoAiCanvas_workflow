'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAppVisibilityStore, NANO2_MODULE_META } from '@/stores/appVisibilityStore'
import { getAppVisibility, saveAppVisibility } from '@/lib/api/app-visibility-api'
import { VisibilityTable, VisibilityLegend } from '@/components/admin/apps/shared'
import { toast } from 'sonner'
import { Save, RotateCcw, Loader2, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Nano2AppsPage() {
  const {
    nano2Modules,
    setNano2ModuleVisibility,
    syncFromServer,
    resetToDefault,
  } = useAppVisibilityStore()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAppVisibility()
        if (data) syncFromServer(data)
      } catch (e) {
        console.error('Failed to load visibility config:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [syncFromServer])

  const handleSave = async () => {
    setSaving(true)
    try {
      const state = useAppVisibilityStore.getState()
      await saveAppVisibility({
        workflowTemplates: state.workflowTemplates,
        workflowNodes: state.workflowNodes,
        nano2Modules: state.nano2Modules,
      })
      toast.success('Nano 2 可见性配置已保存')
    } catch (e) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('确定要重置 Nano 2 可见性配置为默认值吗？')) {
      resetToDefault()
      toast.success('配置已重置')
    }
  }

  const counts = {
    active: NANO2_MODULE_META.filter(i => nano2Modules[i.id] === 'active').length,
    disabled: NANO2_MODULE_META.filter(i => nano2Modules[i.id] === 'disabled').length,
    hidden: NANO2_MODULE_META.filter(i => nano2Modules[i.id] === 'hidden').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Nano 2 应用管理"
        subtitle="管理 Nano 2 各模块的可见性状态"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">可见可用</p>
          <p className="text-2xl font-bold text-green-500">{counts.active}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">可见不可用</p>
          <p className="text-2xl font-bold text-yellow-500">{counts.disabled}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">不可见</p>
          <p className="text-2xl font-bold text-red-500">{counts.hidden}</p>
        </div>
      </div>

      <VisibilityTable
        title="模块列表"
        description="控制 Nano 2 页面中各功能模块的显示状态"
        items={NANO2_MODULE_META}
        visibility={nano2Modules}
        onChange={setNano2ModuleVisibility}
        fallbackState="active"
      />

      <VisibilityLegend />
    </div>
  )
}
