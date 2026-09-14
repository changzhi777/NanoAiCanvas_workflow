/**
 * AgentChatPanel — Nanoai Team8 Agent 对话面板
 *
 * 功能：
 * - Agent 对话（9 角色选择）
 * - 管线进度实时显示
 * - WebSocket 双向通信
 *
 * Usage:
 *   <AgentChatPanel userId={currentUserId} />
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/stores/agentStore'

const AGENT_LABELS: Record<string, string> = {
  producer: '制片人',
  screenwriter: '编剧',
  director: '导演',
  art_director: '美术指导',
  character_designer: '角色设计',
  scene_designer: '场景设计',
  voice_director: '配音导演',
  editor: '剪辑师',
  composer: '作曲家',
}

interface AgentChatPanelProps {
  userId: string
  isDark?: boolean
}

export function AgentChatPanel({ userId, isDark = true }: AgentChatPanelProps) {
  const chatMessages = useAgentStore((s) => s.chatMessages)
  const chatLoading = useAgentStore((s) => s.chatLoading)
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus)
  const pipelineLoading = useAgentStore((s) => s.pipelineLoading)
  const sendChat = useAgentStore((s) => s.sendChat)
  const clearChat = useAgentStore((s) => s.clearChat)

  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('producer')
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const connectedRef = useRef(false)

  // 连接 WebSocket — 仅一次，依赖 userId
  useEffect(() => {
    if (!userId || connectedRef.current) return
    connectedRef.current = true
    const { connectWS, disconnectWS } = useAgentStore.getState()
    connectWS(userId)
    return () => {
      connectedRef.current = false
      disconnectWS()
    }
  }, [userId])

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || chatLoading) return
    setInput('')
    await sendChat([{ role: 'user', content: trimmed }], selectedAgent)
  }, [input, chatLoading, selectedAgent, sendChat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className={cn('flex flex-col h-full', isDark ? 'bg-[#1a1a2e]' : 'bg-white')}>
      {/* Agent 选择 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="relative">
          <button
            onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-white/80'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            {AGENT_LABELS[selectedAgent] || selectedAgent}
            <ChevronDown className="w-3 h-3" />
          </button>

          {agentDropdownOpen && (
            <div
              className={cn(
                'absolute top-full left-0 mt-1 w-36 rounded-md shadow-lg z-50 border',
                isDark ? 'bg-[#252540] border-white/10' : 'bg-white border-gray-200',
              )}
            >
              {Object.entries(AGENT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedAgent(key)
                    setAgentDropdownOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs',
                    key === selectedAgent
                      ? 'text-primary font-medium'
                      : isDark
                        ? 'text-white/70 hover:bg-white/5'
                        : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={clearChat}
          className={cn(
            'px-2 py-1 rounded text-xs',
            isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          清空
        </button>
      </div>

      {/* 管线进度 */}
      {pipelineLoading && pipelineStatus && (
        <div className="px-3 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-primary font-medium">
              管线执行中 ({pipelineStatus.current_stage + 1}/{pipelineStatus.total_stages})
            </span>
          </div>
          <div className="mt-1.5 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${((pipelineStatus.current_stage + 1) / pipelineStatus.total_stages) * 100}%`,
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {pipelineStatus.stages.map((s, i) => (
              <span
                key={i}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  s.status === 'completed'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-white/5 text-white/40',
                )}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chatMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className={cn('text-xs', isDark ? 'text-white/30' : 'text-gray-400')}>
              选择 Agent 开始对话
            </p>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[75%] rounded-lg px-3 py-1.5 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : isDark
                    ? 'bg-white/5 text-white/80'
                    : 'bg-gray-100 text-gray-800',
              )}
            >
              {msg.agent && msg.role === 'assistant' && (
                <span className="text-[10px] text-primary/60 block mb-0.5">
                  {AGENT_LABELS[msg.agent] || msg.agent}
                </span>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-white/40" />
              </div>
            )}
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>思考中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="px-3 py-2 border-t border-border">
        <div className={cn('flex gap-2 rounded-lg p-1', isDark ? 'bg-white/5' : 'bg-gray-50')}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`向 ${AGENT_LABELS[selectedAgent]} 发送消息...`}
            rows={1}
            className={cn(
              'flex-1 bg-transparent text-xs resize-none outline-none px-2 py-1',
              isDark ? 'text-white placeholder:text-white/30' : 'text-gray-800 placeholder:text-gray-400',
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatLoading}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              input.trim() && !chatLoading
                ? 'bg-primary text-white hover:bg-primary/90'
                : isDark
                  ? 'text-white/20'
                  : 'text-gray-300',
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
