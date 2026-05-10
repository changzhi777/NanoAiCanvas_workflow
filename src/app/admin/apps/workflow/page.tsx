'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAppVisibilityStore, WORKFLOW_TEMPLATE_META, WORKFLOW_NODE_META } from '@/stores/appVisibilityStore'
import {
  getAppVisibility,
  saveAppVisibility,
  getStats,
  getAuditLog,
  batchUpdate,
  resetConfig,
} from '@/lib/api/app-visibility-api'
import type { VisibilityStats, AuditLogEntry } from '@/lib/api/app-visibility-api'
import type { VisibilityState } from '@/stores/appVisibilityStore'
import {
  StatsCards,
  FilterBar,
  VisibilityDataTable,
  BatchActionBar,
  AuditTimeline,
  VisibilityLegend,
} from '@/components/admin/apps/shared'
import { toast } from 'sonner'
import { Save, RotateCcw, Loader2, RefreshCw } from 'lucide-react'
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
  const [stats, setStats] = useState<VisibilityStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // 模板筛选
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateCategory, setTemplateCategory] = useState('all')
  const [templateStatus, setTemplateStatus] = useState('all')
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())

  // 节点筛选
  const [nodeSearch, setNodeSearch] = useState('')
  const [nodeCategory, setNodeCategory] = useState('all')
  const [nodeStatus, setNodeStatus] = useState('all')
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())

  const loadAll = useCallback(async () => {
    try {
      const [visData, statsData, logsData] = await Promise.all([
        getAppVisibility(),
        getStats().catch(() => null),
        getAuditLog({ page: 1, page_size: 20 }).catch(() => ({ data: [], total: 0, page: 1, page_size: 20 })),
      ])
      if (visData) syncFromServer(visData)
      setStats(statsData)
      setAuditLogs(logsData.data || [])
    } catch (e) {
      console.error('Failed to load config:', e)
    } finally {
      setLoading(false)
    }
  }, [syncFromServer])

  useEffect(() => { loadAll() }, [loadAll])

  // 筛选后的模板
  const filteredTemplates = WORKFLOW_TEMPLATE_META.filter(item => {
    const matchSearch = item.name.includes(templateSearch) || item.description.includes(templateSearch)
    const matchCat = templateCategory === 'all' || item.category === templateCategory
    const matchStatus = templateStatus === 'all' || workflowTemplates[item.id] === templateStatus
    return matchSearch && matchCat && matchStatus
  })

  // 筛选后的节点
  const filteredNodes = WORKFLOW_NODE_META.filter(item => {
    const matchSearch = item.name.includes(nodeSearch) || item.description.includes(nodeSearch)
    const matchCat = nodeCategory === 'all' || item.category === nodeCategory
    const matchStatus = nodeStatus === 'all' || workflowNodes[item.id] === nodeStatus
    return matchSearch && matchCat && matchStatus
  })

  // 保存
  const handleSave = async () => {
    setSaving(true)
    try {
      const state = useAppVisibilityStore.getState()
      await saveAppVisibility({
        workflowTemplates,
        workflowNodes,
        nano2Modules: state.nano2Modules,
      })
      toast.success('配置已保存')
      await loadAll()
    } catch (e) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 重置
  const handleReset = async (scope: string) => {
    if (!confirm(`确定要重置${scope === 'template' ? '模板' : '节点'}可见性为默认值吗？`)) return
    try {
      await resetConfig(scope)
      resetToDefault()
      toast.success('已重置为默认值')
      await loadAll()
    } catch (e) {
      toast.error('重置失败')
    }
  }

  // 批量设置模板
  const handleBatchTemplates = async (state: VisibilityState) => {
    const items = Array.from(selectedTemplates).map(id => ({ item_id: id, visibility: state }))
    try {
      await batchUpdate('template', items)
      items.forEach(i => setTemplateVisibility(i.item_id, i.visibility))
      setSelectedTemplates(new Set())
      toast.success(`已批量设置 ${items.length} 个模板`)
      await loadAll()
    } catch (e) {
      toast.error('批量操作失败')
    }
  }

  // 批量设置节点
  const handleBatchNodes = async (state: VisibilityState) => {
    const items = Array.from(selectedNodes).map(id => ({ item_id: id, visibility: state }))
    try {
      await batchUpdate('node', items)
      items.forEach(i => setNodeVisibility(i.item_id, i.visibility))
      setSelectedNodes(new Set())
      toast.success(`已批量设置 ${items.length} 个节点`)
      await loadAll()
    } catch (e) {
      toast.error('批量操作失败')
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

  // 提取分类列表
  const templateCategories = [...new Set(WORKFLOW_TEMPLATE_META.map(i => i.category))]
  const nodeCategories = [...new Set(WORKFLOW_NODE_META.map(i => i.category))]

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Workflow 应用管理"
        subtitle="管理工作流模板和节点的可见性状态"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadAll()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        }
      />

      {/* 统计卡片 */}
      {stats && <StatsCards stats={stats} />}

      {/* 标签页 */}
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">模板管理 ({WORKFLOW_TEMPLATE_META.length})</TabsTrigger>
          <TabsTrigger value="nodes">节点管理 ({WORKFLOW_NODE_META.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <FilterBar
              searchQuery={templateSearch}
              onSearchChange={setTemplateSearch}
              categoryFilter={templateCategory}
              onCategoryChange={setTemplateCategory}
              statusFilter={templateStatus}
              onStatusChange={setTemplateStatus}
              categories={templateCategories}
            />
            <Button variant="outline" size="sm" onClick={() => handleReset('template')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置模板
            </Button>
          </div>

          <BatchActionBar
            selectedCount={selectedTemplates.size}
            onBatchSet={handleBatchTemplates}
            onClearSelection={() => setSelectedTemplates(new Set())}
          />

          <VisibilityDataTable
            title="工作流模板"
            description="控制模板在模板选择面板中的显示状态"
            items={filteredTemplates}
            visibility={workflowTemplates}
            onChange={setTemplateVisibility}
            selectedIds={selectedTemplates}
            onToggleSelect={(id) => {
              setSelectedTemplates(prev => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }}
            onSelectAll={() => {
              const allIds = filteredTemplates.map(i => i.id)
              const allSelected = allIds.every(id => selectedTemplates.has(id))
              setSelectedTemplates(allSelected ? new Set() : new Set(allIds))
            }}
          />
        </TabsContent>

        <TabsContent value="nodes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <FilterBar
              searchQuery={nodeSearch}
              onSearchChange={setNodeSearch}
              categoryFilter={nodeCategory}
              onCategoryChange={setNodeCategory}
              statusFilter={nodeStatus}
              onStatusChange={setNodeStatus}
              categories={nodeCategories}
            />
            <Button variant="outline" size="sm" onClick={() => handleReset('node')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置节点
            </Button>
          </div>

          <BatchActionBar
            selectedCount={selectedNodes.size}
            onBatchSet={handleBatchNodes}
            onClearSelection={() => setSelectedNodes(new Set())}
          />

          <VisibilityDataTable
            title="工作流节点"
            description="控制节点在侧边栏节点库中的显示状态"
            items={filteredNodes}
            visibility={workflowNodes}
            onChange={setNodeVisibility}
            selectedIds={selectedNodes}
            onToggleSelect={(id) => {
              setSelectedNodes(prev => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }}
            onSelectAll={() => {
              const allIds = filteredNodes.map(i => i.id)
              const allSelected = allIds.every(id => selectedNodes.has(id))
              setSelectedNodes(allSelected ? new Set() : new Set(allIds))
            }}
          />
        </TabsContent>
      </Tabs>

      {/* 审计时间线 */}
      <AuditTimeline logs={auditLogs} />

      <VisibilityLegend extraNote={'（显示"未开放"标签）'} />
    </div>
  )
}
