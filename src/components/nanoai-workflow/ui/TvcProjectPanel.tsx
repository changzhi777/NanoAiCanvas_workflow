'use client'

/**
 * TVC 项目列表面板
 * 展示所有 TVC 项目卡片，支持新建、查看、删除
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Film, Trash2, Clock, CheckCircle2, Loader2, AlertCircle, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { tvcProjectsApi, type TvcProjectListItem } from '@/lib/api/tvc-projects-api'
import { useToast } from '@/hooks/useToast'

interface TvcProjectPanelProps {
  onSelectProject?: (projectId: string) => void
  className?: string
}

const STATUS_CONFIG = {
  draft: { label: '草稿', icon: FolderOpen, color: 'text-slate-400 bg-slate-500/10' },
  processing: { label: '生成中', icon: Loader2, color: 'text-blue-400 bg-blue-500/10 animate-pulse' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-400 bg-green-500/10' },
  failed: { label: '失败', icon: AlertCircle, color: 'text-red-400 bg-red-500/10' },
}

export function TvcProjectPanel({ onSelectProject, className }: TvcProjectPanelProps) {
  const { toast } = useToast()
  const [projects, setProjects] = useState<TvcProjectListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await tvcProjectsApi.list({ limit: 50 })
      setProjects(data.items)
    } catch {
      // 未登录或网络错误，静默处理
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const result = await tvcProjectsApi.create({
        name: `TVC 项目 ${new Date().toLocaleDateString('zh-CN')}`,
        original_text: '',
      })
      toast.success('项目已创建')
      onSelectProject?.(result.id)
      loadProjects()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tvcProjectsApi.delete(id)
      toast.success('项目已删除')
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium">TVC 项目</h3>
          <span className="text-xs text-muted-foreground">{projects.length} 个</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={isCreating}
          className="h-7 text-xs gap-1"
        >
          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          新建项目
        </Button>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          加载中...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>暂无 TVC 项目</p>
          <p className="text-xs mt-1">点击「新建项目」开始创作</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {projects.map(project => {
            const statusCfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={project.id}
                className="group relative p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-colors cursor-pointer"
                onClick={() => onSelectProject?.(project.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{project.name}</span>
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]', statusCfg.color)}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusCfg.label}
                      </span>
                    </div>
                    {project.original_text && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{project.original_text}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
