import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/remoteStore'
import { useChatStore } from '@/stores/chatStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useChatSocket } from '@/hooks/useChatSocket'
import {
  getConversations,
  createConversation,
  getMessages,
  markConversationRead,
  getChatUsers,
  type ConversationInfo,
  type ChatMessage,
} from '@/lib/api/chat-api'
import { getUserNotifications, markAsRead, markAllAsRead } from '@/lib/api/notifications-api'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/nanoai-workflow/ui/Theme'
import { Send, Check, CheckCheck, MessageSquare, Bell, Loader2, Search } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface ChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  const { isDark } = useTheme()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const {
    conversations,
    currentConvId,
    messages,
    users,
    totalUnread,
    setConversations,
    setCurrentConvId,
    setMessages,
    addMessage,
    setUsers,
    decrementUnread,
  } = useChatStore()

  const {
    notifications,
    unreadCount: notifUnread,
    setNotifications,
    markAsRead: markNotifRead,
    markAllAsRead: markAllNotifRead,
  } = useNotificationStore()

  const [tab, setTab] = useState<'chat' | 'notifications'>('chat')
  const [inputText, setInputText] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket
  const { sendMessage, sendRead } = useChatSocket({
    userId: user?.id || null,
    enabled: !!user && open,
    onMessage: (payload) => {
      if (payload.conversation_id === currentConvId) {
        addMessage(payload as ChatMessage)
      }
      useChatStore.getState().updateConvLastMessage(payload.conversation_id, payload as ChatMessage)
    },
    onOnlineStatus: (payload) => {
      useChatStore.getState().updateOnlineStatus(payload.user_id, payload.online)
    },
  })

  // 加载数据
  const loadConversations = useCallback(async () => {
    if (!token) return
    try {
      const convs = await getConversations()
      setConversations(convs)
    } catch {}
  }, [token, setConversations])

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getUserNotifications(user.id, 1, 30)
      setNotifications(data.notifications, data.total, data.unread_count)
    } catch {}
  }, [user?.id, setNotifications])

  useEffect(() => {
    if (open) {
      loadConversations()
      loadNotifications()
      getChatUsers().then((d) => setUsers(d.users)).catch(() => {})
    }
  }, [open])

  // 加载当前会话消息
  useEffect(() => {
    if (!currentConvId || !open) return
    getMessages(currentConvId).then(setMessages).catch(() => {})
    markConversationRead(currentConvId).then(() => decrementUnread(currentConvId)).catch(() => {})
    sendRead(currentConvId)
  }, [currentConvId, open])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || !currentConvId) return
    sendMessage(currentConvId, text)
    setInputText('')
  }

  const handleSelectConv = (conv: ConversationInfo) => {
    setCurrentConvId(conv.id)
    setSearchQuery('')
  }

  const handleStartChat = async (targetUserId: string) => {
    try {
      const { id } = await createConversation(targetUserId)
      await loadConversations()
      setCurrentConvId(id)
      setShowNewChat(false)
      setSearchQuery('')
    } catch {
      toast.error('创建会话失败')
    }
  }

  const currentConv = conversations.find((c) => c.id === currentConvId)
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const combinedUnread = totalUnread + notifUnread

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 h-[560px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={cn('flex items-center border-b px-4 py-2', isDark ? 'border-white/10' : 'border-gray-200')}>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === 'chat'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MessageSquare className="w-4 h-4" />
              聊天
              {totalUnread > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('notifications')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === 'notifications'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Bell className="w-4 h-4" />
              通知
              {notifUnread > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {tab === 'chat' ? (
            <>
              {/* 会话列表 */}
              <div className={cn('w-64 flex flex-col border-r', isDark ? 'border-white/10' : 'border-gray-200')}>
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowNewChat(!showNewChat)}
                  >
                    + 发起新对话
                  </Button>
                </div>

                {showNewChat && (
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="搜索用户..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <ScrollArea className="max-h-40 mt-1">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleStartChat(u.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors',
                          )}
                        >
                          <div className="relative">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {u.online && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                            )}
                          </div>
                          <span className="truncate">{u.username}</span>
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <ScrollArea className="flex-1">
                  {conversations.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs py-8">暂无会话</div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConv(conv)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors',
                          currentConvId === conv.id
                            ? 'bg-primary/10'
                            : 'hover:bg-accent',
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          {conv.other_user?.avatar_url ? (
                            <img src={conv.other_user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                              {conv.other_user?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          {conv.other_user?.online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">
                              {conv.other_user?.username || conv.name || '未知'}
                            </span>
                            {conv.last_message && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {formatTime(conv.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">
                              {conv.last_message?.content || '暂无消息'}
                            </span>
                            {conv.unread_count > 0 && (
                              <span className="flex-shrink-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>

              {/* 聊天窗口 */}
              <div className="flex-1 flex flex-col">
                {currentConv ? (
                  <>
                    {/* 聊天头部 */}
                    <div className={cn('flex items-center gap-2 px-4 py-2 border-b', isDark ? 'border-white/10' : 'border-gray-200')}>
                      <div className="relative">
                        {currentConv.other_user?.avatar_url ? (
                          <img src={currentConv.other_user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {currentConv.other_user?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        {currentConv.other_user?.online && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-background" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{currentConv.other_user?.username}</span>
                      <span className={cn('text-xs', currentConv.other_user?.online ? 'text-green-500' : 'text-muted-foreground')}>
                        {currentConv.other_user?.online ? '在线' : '离线'}
                      </span>
                    </div>

                    {/* 消息列表 */}
                    <ScrollArea className="flex-1 px-4 py-2">
                      {messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id}
                            className={cn('flex mb-3', isMine ? 'justify-end' : 'justify-start')}
                          >
                            {!isMine && (
                              <div className="mr-2 flex-shrink-0 mt-1">
                                {msg.sender_avatar ? (
                                  <img src={msg.sender_avatar} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium">
                                    {msg.sender_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={cn('max-w-[70%]')}>
                              <div
                                className={cn(
                                  'px-3 py-1.5 rounded-2xl text-sm break-words',
                                  isMine
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : isDark
                                    ? 'bg-slate-700 text-slate-100 rounded-bl-md'
                                    : 'bg-gray-100 text-gray-900 rounded-bl-md',
                                )}
                              >
                                {msg.content}
                              </div>
                              <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
                                <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                {isMine && (
                                  msg.is_read
                                    ? <CheckCheck className="w-3 h-3 text-blue-400" />
                                    : <Check className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    {/* 输入框 */}
                    <div className={cn('flex items-center gap-2 px-4 py-2 border-t', isDark ? 'border-white/10' : 'border-gray-200')}>
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        placeholder="输入消息..."
                        className="h-8 text-sm"
                      />
                      <Button size="sm" onClick={handleSend} disabled={!inputText.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    选择一个会话开始聊天
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 通知 tab */
            <div className="flex-1 flex flex-col">
              <div className={cn('flex items-center justify-between px-4 py-2 border-b', isDark ? 'border-white/10' : 'border-gray-200')}>
                <span className="text-sm font-medium">系统通知</span>
                {notifUnread > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2" onClick={async () => {
                    if (!user?.id) return
                    await markAllAsRead(user.id)
                    markAllNotifRead()
                  }}>
                    全部已读
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-12">暂无通知</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 border-b cursor-pointer transition-colors',
                        n.status !== 'read' ? (isDark ? 'bg-blue-950/30' : 'bg-blue-50') : '',
                        isDark ? 'border-white/5' : 'border-gray-100',
                      )}
                      onClick={async () => {
                        if (n.status !== 'read') {
                          await markAsRead(n.id)
                          markNotifRead(n.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
                        </div>
                        {n.status !== 'read' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString()
}
