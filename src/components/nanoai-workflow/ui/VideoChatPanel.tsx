/**
 * VideoChatPanel — 可复用 AI 视频剪辑对话组件
 *
 * 功能：
 * - 对话式 AI 视频编辑（GLM-4.5-air）
 * - 时间轴缩略预览
 * - 操作反馈（正在拼接/渲染/完成）
 *
 * Usage:
 *   <VideoChatPanel
 *     clips={videoUrls}
 *     bgmUrl={bgmUrl}
 *     onCommand={(cmd) => handleAgentCommand(cmd)}
 *   />
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Loader2, Video, Music, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoAgentCommand } from '@/lib/api/video-editor-api'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  command?: VideoAgentCommand
  timestamp: Date
}

export interface VideoChatPanelProps {
  /** 当前可用的视频片段 URL */
  clips: string[]
  /** BGM URL */
  bgmUrl?: string
  /** 已合成的视频 URL */
  composedUrl?: string
  /** Agent 回调 */
  onCommand?: (cmd: VideoAgentCommand) => void
  /** Agent 对话请求函数 */
  onChat?: (messages: { role: string; content: string }[]) => Promise<{ message: string; command?: VideoAgentCommand }>
  /** 暗色模式 */
  isDark?: boolean
}

export function VideoChatPanel({
  clips,
  bgmUrl,
  composedUrl,
  onCommand,
  onChat,
  isDark = true,
}: VideoChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `已加载 ${clips.length} 个镜头${bgmUrl ? ' + BGM' : ''}。告诉我你想怎么剪辑？`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      if (onChat) {
        const history = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }))
        const response = await onChat(history)

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          command: response.command,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMsg])

        if (response.command && onCommand) {
          onCommand(response.command)
        }
      } else {
        // Fallback: 无 agent 后端时模拟回复
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Agent 服务未连接，请检查后端服务状态。',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `处理失败: ${(err as Error).message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, onChat, onCommand])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className={cn('flex flex-col h-full', isDark ? 'text-slate-200' : 'text-gray-700')}>
      {/* 时间轴缩略 */}
      {clips.length > 0 && (
        <div className="px-3 py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
          <div className="flex items-center gap-1 mb-1.5">
            <Video className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-muted-foreground">{clips.length} 个镜头</span>
            {bgmUrl && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <Music className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-muted-foreground">BGM</span>
              </>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {clips.slice(0, 8).map((url, i) => (
              <div key={i} className="relative shrink-0 w-16 rounded overflow-hidden border" style={{ aspectRatio: '16/9', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db' }}>
                <video src={url} className="w-full h-full object-cover" muted />
                <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[7px] bg-black/60 text-white">{i + 1}</span>
              </div>
            ))}
            {clips.length > 8 && (
              <div className="shrink-0 w-10 flex items-center justify-center text-[9px] text-muted-foreground">+{clips.length - 8}</div>
            )}
          </div>
        </div>
      )}

      {/* 对话区域 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-1.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-blue-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed',
              msg.role === 'user'
                ? isDark ? 'bg-blue-600/30 text-blue-100' : 'bg-blue-100 text-blue-800'
                : isDark ? 'bg-white/[0.04] text-slate-300' : 'bg-gray-100 text-gray-700',
            )}>
              <p>{msg.content}</p>
              {msg.command && (
                <div className="mt-1.5 pt-1.5 border-t flex items-center gap-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-medium text-amber-400">{msg.command.description}</span>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                <User className="w-3 h-3 text-purple-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5 px-2">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
            <span className="text-[10px] text-muted-foreground">AI 思考中...</span>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="px-3 py-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入剪辑指令，如「拼接前3个镜头」..."
            disabled={isLoading}
            className={cn(
              'flex-1 text-[11px] rounded-md border px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50',
              isDark
                ? 'bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-500'
                : 'bg-white border-gray-200 text-gray-700 placeholder:text-gray-400',
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              'shrink-0 px-2.5 py-1.5 rounded-md transition-colors',
              input.trim() && !isLoading
                ? 'bg-blue-500 text-white hover:bg-blue-400'
                : isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-gray-100 text-gray-400',
            )}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex gap-2 mt-1.5">
          {['拼接全部', '左右对比', '加字幕', '换BGM'].map(hint => (
            <button
              key={hint}
              onClick={() => setInput(hint)}
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded transition-colors',
                isDark ? 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
