/**
 * StoryboardVideoPanel — TVC 第3节点「视频合成」属性面板
 *
 * 两个 Tab:
 * - 合成参数（原有功能：转场/分辨率/BGM）
 * - AI 剪辑（VideoChatPanel 对话式编辑）
 *
 * 从 WorkflowPropertiesPanel.tsx 抽离，保持可复用。
 */

import { useState, useMemo, useCallback } from 'react'
import { Settings2, MessageSquare, Film, Music, Loader2, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore'
import { useToast } from '@/hooks/useToast'
import { VideoChatPanel } from './VideoChatPanel'
import type { VideoAgentCommand } from '@/lib/api/video-editor-api'
import { chatWithVideoAgent, submitComposeTask } from '@/lib/api/video-editor-api'

interface Props {
  nodeId: string
  isDark: boolean
}

export function StoryboardVideoPanel({ nodeId, isDark }: Props) {
  const [activeTab, setActiveTab] = useState<'params' | 'chat'>('params')
  const { nodes, edges, updateNode } = useNanoaiWorkflowStore()
  const { toast } = useToast()

  // 从 store 读取当前节点参数
  const node = nodes.find(n => n.id === nodeId)
  const params = {
    transition: 'fade',
    outputFormat: 'mp4',
    resolution: '720p',
    enableBgmMix: true,
    bgmVolume: 0.3,
    ...(node?.data?.params || {}),
  }

  const setParams = useCallback((update: Record<string, any>) => {
    const newParams = { ...params, ...update }
    updateNode(nodeId, { params: newParams })
  }, [nodeId, params, updateNode])

  // 上游数据
  const sourceData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === nodeId)
    if (!incomingEdge) return null
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    return sourceNode?.data
  }, [edges, nodes, nodeId])

  const sourceVideos: string[] = useMemo(() => sourceData?.result?.videos || [], [sourceData])
  const sourceBgm = sourceData?.result?.bgmUrl

  const selectCls = cn(
    'w-full text-xs rounded-md border px-2 py-1.5',
    isDark ? 'bg-white/[0.02] border-white/[0.06] text-slate-300' : 'bg-gray-50/50 border-gray-100 text-gray-700',
  )

  // === AI 剪辑回调 ===
  const handleChat = useCallback(async (messages: { role: string; content: string }[]) => {
    return chatWithVideoAgent({
      messages: messages.map(m => ({ role: m.role as any, content: m.content })),
      context: {
        clips: sourceVideos,
        bgmUrl: sourceBgm,
        composedUrl: node?.data?.result?.composedUrl,
      },
    })
  }, [sourceVideos, sourceBgm, node?.data?.result?.composedUrl])

  const handleCommand = useCallback(async (cmd: VideoAgentCommand) => {
    toast.info(`执行: ${cmd.description}`)
    try {
      if (cmd.action === 'compose' || cmd.action === 'concat') {
        updateNode(nodeId, { status: 'running' as any })
        const result = await submitComposeTask({
          video_urls: sourceVideos,
          bgm_url: params.enableBgmMix ? sourceBgm : undefined,
          bgm_volume: params.bgmVolume,
          transition: params.transition,
          resolution: params.resolution,
          output_format: params.outputFormat,
        })
        updateNode(nodeId, {
          status: 'success' as any,
          result: { composedUrl: result.url, duration: result.duration, shotCount: sourceVideos.length },
        })
        toast.success('AI 剪辑完成')
      }
    } catch (err) {
      updateNode(nodeId, { status: 'error' as any, error: (err as Error).message })
      toast.error(`AI 剪辑失败: ${(err as Error).message}`)
    }
  }, [nodeId, sourceVideos, sourceBgm, params, updateNode, toast])

  return (
    <div className={cn('space-y-3 p-3 rounded-lg', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
      {/* Tab 切换 */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }}>
        <button
          onClick={() => setActiveTab('params')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex-1 justify-center',
            activeTab === 'params'
              ? isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-gray-800 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Settings2 className="w-3 h-3" />
          合成参数
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex-1 justify-center',
            activeTab === 'chat'
              ? isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-gray-800 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <MessageSquare className="w-3 h-3" />
          AI 剪辑
        </button>
      </div>

      {/* Tab: 合成参数 */}
      {activeTab === 'params' && (
        <div className="space-y-3">
          <h3 className={cn('text-sm font-semibold', isDark ? 'text-slate-200' : 'text-gray-700')}>合成参数</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block text-muted-foreground">镜头转场</Label>
              <select value={params.transition} onChange={e => setParams({ transition: e.target.value })} className={selectCls}>
                <option value="fade">淡入淡出</option>
                <option value="dissolve">溶解</option>
                <option value="cut">硬切</option>
                <option value="wipe">擦除</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">分辨率</Label>
                <select value={params.resolution} onChange={e => setParams({ resolution: e.target.value })} className={selectCls}>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4k">4K</option>
                  <option value="480p">480p</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">格式</Label>
                <select value={params.outputFormat} onChange={e => setParams({ outputFormat: e.target.value })} className={selectCls}>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
            </div>
          </div>

          <h3 className={cn('text-sm font-semibold pt-2 border-t', isDark ? 'text-slate-200 border-white/10' : 'text-gray-700 border-gray-200')}>音频</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={params.enableBgmMix} onChange={e => setParams({ enableBgmMix: e.target.checked })} className="rounded" />
              混合背景音乐
            </label>
            {params.enableBgmMix && (
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">BGM 音量: {Math.round(params.bgmVolume * 100)}%</Label>
                <input type="range" min={0} max={1} step={0.05} value={params.bgmVolume}
                  onChange={e => setParams({ bgmVolume: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-primary" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: AI 剪辑 */}
      {activeTab === 'chat' && (
        <div className="-mx-3 -mb-3" style={{ height: 360 }}>
          <VideoChatPanel
            clips={sourceVideos}
            bgmUrl={sourceBgm}
            composedUrl={node?.data?.result?.composedUrl}
            onChat={handleChat}
            onCommand={handleCommand}
            isDark={isDark}
          />
        </div>
      )}
    </div>
  )
}
