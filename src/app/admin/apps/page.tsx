'use client'

import { useState, useCallback, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AppConfigCard } from '@/components/admin/apps'
import { useAppsConfigStore, AppType } from '@/stores/appsConfigStore'
import { getAppsConfig, saveAppsConfig } from '@/lib/api/apps-api'
import { toast } from 'sonner'
import { Save, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppsManagementPage() {
  const { apps, setAppModels, toggleAppEnabled, resetToDefault, syncFromServer } = useAppsConfigStore()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // 页面加载时从后端同步数据
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await getAppsConfig()
        if (data.apps.length > 0) {
          syncFromServer(data.apps)
        }
      } catch (error) {
        console.error('Failed to load config from server:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [syncFromServer])

  const handleModelsChange = useCallback((appId: AppType, models: string[]) => {
    setAppModels(appId, models)
  }, [setAppModels])

  const handleEnabledChange = useCallback((appId: AppType) => {
    toggleAppEnabled(appId)
  }, [toggleAppEnabled])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 保存到后端
      await saveAppsConfig(apps)
      setLastSaved(new Date().toLocaleTimeString())
      toast.success('应用配置已保存')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('确定要重置所有配置吗？')) {
      resetToDefault()
      toast.success('配置已重置')
    }
  }

  // 统计信息
  const enabledApps = apps.filter((app) => app.enabled).length
  const configuredApps = apps.filter((app) => app.models.length > 0).length

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
        title="应用管理"
        subtitle="配置各应用模块调用的模型（支持多模型负载均衡）"
        action={
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground mr-2">
                已保存 {lastSaved}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              保存全部
            </Button>
          </div>
        }
      />

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">已启用应用</p>
          <p className="text-2xl font-bold">{enabledApps}/{apps.length}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">已配置模型</p>
          <p className="text-2xl font-bold">{configuredApps}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">负载均衡模式</p>
          <p className="text-sm font-medium">多模型同时启用</p>
        </div>
      </div>

      {/* 应用配置卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map((app) => (
          <AppConfigCard
            key={app.id}
            app={app}
            onModelsChange={handleModelsChange}
            onEnabledChange={handleEnabledChange}
            onSave={handleSave}
            saving={saving}
          />
        ))}
      </div>

      {/* 使用说明 */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">使用说明</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 每个应用模块可以配置多个模型同时启用</li>
          <li>• 启用多个模型时，系统将自动进行负载均衡</li>
          <li>• 配置保存在本地浏览器和后端服务器</li>
          <li>• 禁用应用不会删除已配置模型，下次启用时可恢复</li>
        </ul>
      </div>
    </div>
  )
}