'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModelSelector } from './ModelSelector'
import { AppConfig, AppType } from '@/stores/appsConfigStore'
import {
  Film,
  Image,
  Mic,
  MessageSquare,
  Type,
  Phone,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react'

// 应用图标映射
const APP_ICONS: Record<string, React.ElementType> = {
  film: Film,
  image: Image,
  mic: Mic,
  'message-square': MessageSquare,
  type: Type,
  phone: Phone,
  sparkles: Sparkles,
}

interface AppConfigCardProps {
  app: AppConfig
  onModelsChange: (appId: AppType, models: string[]) => void
  onEnabledChange: (appId: AppType) => void
  onSave: () => void
  saving?: boolean
}

export function AppConfigCard({
  app,
  onModelsChange,
  onEnabledChange,
  onSave,
  saving = false,
}: AppConfigCardProps) {
  const Icon = APP_ICONS[app.icon] || Film

  return (
    <Card className={!app.enabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{app.name}</h3>
              <p className="text-xs text-muted-foreground">{app.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={app.enabled}
              onCheckedChange={() => onEnabledChange(app.id)}
            />
            <span className="text-xs text-muted-foreground">
              {app.enabled ? '启用' : '禁用'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模型选择 */}
        <ModelSelector
          selectedModels={app.models}
          onChange={(models) => onModelsChange(app.id, models)}
          appId={app.id}
        />

        {/* 状态信息 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {app.models.length > 0 ? (
              <Badge variant="outline">
                {app.models.length} 个模型已配置
              </Badge>
            ) : (
              <Badge variant="secondary">未配置模型</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}