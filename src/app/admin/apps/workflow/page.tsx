'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAppVisibilityStore, WORKFLOW_TEMPLATE_META, WORKFLOW_NODE_META } from '@/stores/appVisibilityStore'
import { getAppVisibility, saveAppVisibility } from '@/lib/api/app-visibility-api'
import { VisibilityTable, VisibilityLegend } from '@/components/admin/apps/shared'
import { toast } from 'sonner'
import { Save, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function WorkflowAppsPage() {
  const {
    workflowTemplates,
    workflowNodes,
    setTemplateVisibility,
    setNodeVisibility,
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
      await saveAppVisibility({ workflowTemplates, workflowNodes, nano2Modules: state.nano2Modules })
      toast.success('Workflow 可见性配置已保存')
    } catch (e) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('确定要重置 Workflow 可见性配置为默认值吗？')) {
      resetToDefault()
      toast.success('配置已重置')
    }
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
        title="Workflow 应用管理"
        subtitle="管理工作流模板和节点的可见性状态"
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

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">模板管理 ({WORKFLOW_TEMPLATE_META.length})</TabsTrigger>
          <TabsTrigger value="nodes">节点管理 ({WORKFLOW_NODE_META.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <VisibilityTable
            title="工作流模板"
            description="控制模板在模板选择面板中的显示状态"
            items={WORKFLOW_TEMPLATE_META}
            visibility={workflowTemplates}
            onChange={setTemplateVisibility}
          />
        </TabsContent>

        <TabsContent value="nodes" className="mt-4">
          <VisibilityTable
            title="工作流节点"
            description="控制节点在侧边栏节点库中的显示状态"
            items={WORKFLOW_NODE_META}
            visibility={workflowNodes}
            onChange={setNodeVisibility}
          />
        </TabsContent>
      </Tabs>

      <VisibilityLegend extraNote={'（显示"未开放"标签）'} />
    </div>
  )
}
