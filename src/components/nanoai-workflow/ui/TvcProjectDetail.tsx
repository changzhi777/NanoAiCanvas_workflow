'use client'

/**
 * TVC 项目详情面板
 * 展示：原始文案 → 剧本 → 逐镜头(prompt+图+视频) → 成片预览
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Film, Play, Image as ImageIcon, Video, Music,
  Clock, FileText, CheckCircle2, Loader2, AlertCircle, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { tvcProjectsApi, type TvcProject, type TvcProjectShot } from '@/lib/api/tvc-projects-api'
import { useToast } from '@/hooks/useToast'

interface TvcProjectDetailProps {
  projectId: string
  onBack?: () => void
  className?: string
}

const SHOT_STATUS = {
  pending: { label: '待生成', icon: Clock, color: 'text-slate-400' },
  generating: { label: '生成中', icon: Loader2, color: 'text-blue-400 animate-pulse' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-400' },
  failed: { label: '失败', icon: AlertCircle, color: 'text-red-400' },
}

export function TvcProjectDetail({ projectId, onBack, className }: TvcProjectDetailProps) {
  const { toast } = useToast()
  const [project, setProject] = useState<TvcProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedShot, setExpandedShot] = useState<number | null>(null)

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await tvcProjectsApi.get(projectId)
      setProject(data)
    } catch {
      toast.error('加载项目失败')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => { loadProject() }, [loadProject])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        加载中...
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <p>项目不存在</p>
        <Button variant="link" onClick={onBack} className="mt-2">返回列表</Button>
      </div>
    )
  }

  const script = project.script as any
  const characters = script?.characters || []
  const scenes = script?.scenes || []

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{project.name}</h3>
          <div className="text-xs text-muted-foreground">
            {new Date(project.updated_at).toLocaleString('zh-CN')}
          </div>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded text-xs',
          project.status === 'completed' && 'bg-green-500/10 text-green-400',
          project.status === 'processing' && 'bg-blue-500/10 text-blue-400',
          project.status === 'draft' && 'bg-slate-500/10 text-slate-400',
          project.status === 'failed' && 'bg-red-500/10 text-red-400',
        )}>
          {project.status === 'completed' ? '已完成' :
           project.status === 'processing' ? '生成中' :
           project.status === 'failed' ? '失败' : '草稿'}
        </span>
      </div>

      {/* 原始文案 */}
      {project.original_text && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>原始文案</span>
          </div>
          <p className="text-xs text-foreground/80 whitespace-pre-wrap">{project.original_text}</p>
        </div>
      )}

      {/* 剧本概要 */}
      {script && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Film className="w-3 h-3" />
            <span>剧本 — {script.tvc_title || '未命名'}</span>
            {script.total_duration && (
              <span className="ml-auto text-muted-foreground">{script.total_duration}秒</span>
            )}
          </div>

          {/* 角色 */}
          {characters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {characters.map((c: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px]">
                  {c.name} ({c.role})
                </span>
              ))}
            </div>
          )}

          {/* 场景列表 */}
          {scenes.length > 0 && (
            <div className="space-y-1">
              {scenes.map((s: any, i: number) => (
                <div key={i} className="text-[11px] text-muted-foreground">
                  <span className="text-primary/70">场景 {s.scene_number || i + 1}:</span>{' '}
                  {s.description || s.location}
                  {s.time_of_day && <span className="opacity-50"> ({s.time_of_day})</span>}
                </div>
              ))}
            </div>
          )}

          {script.logline && (
            <p className="text-[11px] text-muted-foreground italic">「{script.logline}」</p>
          )}
        </div>
      )}

      {/* 逐镜头卡片 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Video className="w-3 h-3" />
          <span>镜头 ({project.shots.length})</span>
        </div>

        {project.shots.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            执行 TVC 工作流后，镜头将自动关联到项目
          </div>
        ) : (
          <div className="space-y-1.5">
            {project.shots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                expanded={expandedShot === shot.shot_index}
                onToggle={() => setExpandedShot(expandedShot === shot.shot_index ? null : shot.shot_index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 成片预览 */}
      {project.composed_video_url && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center gap-1.5 mb-2 text-xs text-purple-300">
            <Play className="w-3 h-3" />
            <span>TVC 成片</span>
          </div>
          <video
            src={project.composed_video_url}
            controls
            className="w-full rounded-lg max-h-60"
          />
        </div>
      )}

      {/* BGM */}
      {project.bgm_url && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Music className="w-3 h-3" />
            <span>背景音乐</span>
          </div>
          <audio src={project.bgm_url} controls className="w-full h-8" />
        </div>
      )}
    </div>
  )
}

// ==================== 镜头卡片 ====================

function ShotCard({ shot, expanded, onToggle }: { shot: TvcProjectShot; expanded: boolean; onToggle: () => void }) {
  const statusCfg = SHOT_STATUS[shot.status as keyof typeof SHOT_STATUS] || SHOT_STATUS.pending
  const StatusIcon = statusCfg.icon

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors cursor-pointer',
        expanded ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]',
      )}
      onClick={onToggle}
    >
      {/* 缩略行 */}
      <div className="flex items-center gap-2 p-2">
        {/* 缩略图 */}
        <div className="w-12 h-7 rounded bg-white/5 flex-shrink-0 overflow-hidden">
          {shot.image_url ? (
            <img src={shot.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-3 h-3 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">镜头 {shot.shot_index + 1}</span>
            <StatusIcon className={cn('w-2.5 h-2.5', statusCfg.color)} />
            {shot.duration && (
              <span className="text-[10px] text-muted-foreground">{shot.duration}s</span>
            )}
          </div>
          {!expanded && shot.scene_description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">{shot.scene_description}</p>
          )}
        </div>

        {shot.video_url && (
          <Video className="w-3 h-3 text-green-400 flex-shrink-0" />
        )}
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-white/5 pt-2">
          {/* 场景描述 */}
          {shot.scene_description && (
            <p className="text-xs text-foreground/70">{shot.scene_description}</p>
          )}

          {/* 提示词 */}
          {shot.video_prompt && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Tag className="w-2.5 h-2.5" />
                <span>Video Prompt</span>
              </div>
              <p className="text-[10px] text-foreground/60 bg-white/[0.02] rounded p-1.5 font-mono break-all">
                {shot.video_prompt}
              </p>
            </div>
          )}

          {shot.start_frame_prompt && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Start Frame</div>
              <p className="text-[10px] text-foreground/60 bg-white/[0.02] rounded p-1.5 font-mono break-all">
                {shot.start_frame_prompt}
              </p>
            </div>
          )}

          {/* 图片预览 */}
          {shot.image_url && (
            <div className="rounded-lg overflow-hidden border border-white/5">
              <img src={shot.image_url} alt="" className="w-full max-h-40 object-cover" />
            </div>
          )}

          {/* 视频预览 */}
          {shot.video_url && (
            <div className="rounded-lg overflow-hidden border border-white/5">
              <video src={shot.video_url} controls className="w-full max-h-40" />
            </div>
          )}

          {/* 对话 */}
          {shot.dialogue && shot.dialogue.length > 0 && (
            <div className="space-y-0.5">
              {shot.dialogue.map((d, i) => (
                <div key={i} className="text-[10px]">
                  <span className="text-primary/70">{d.character}:</span>
                  <span className="text-foreground/60 ml-1">{d.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
