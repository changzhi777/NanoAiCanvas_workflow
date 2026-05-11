import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/remoteStore'
import { useChatStore } from '@/stores/chatStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useChatSocket } from '@/hooks/useChatSocket'
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  markConversationRead,
  getChatUsers,
  uploadChatFile,
  saveAttachmentToAssets,
  type ConversationInfo,
  type ChatMessage,
  type Attachment,
  type MessageType,
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
import {
  Send, Check, CheckCheck, MessageSquare, Bell,
  Paperclip, X, Download, Bookmark, Image, Film, Music,
  Loader2, FolderOpen, Trash2, Search, ArrowUp,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { AssetPicker } from '@/components/ui/AssetPicker'

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
    prependMessages,
    setUsers,
    decrementUnread,
    removeConversation,
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
  const [userSearch, setUserSearch] = useState('')
  const [convSearch, setConvSearch] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!currentConvId || !open) return
    setHasMoreMessages(true)
    getMessages(currentConvId).then((msgs) => {
      setMessages(msgs)
      setHasMoreMessages(msgs.length >= 50)
    }).catch(() => {})
    markConversationRead(currentConvId).then(() => decrementUnread(currentConvId)).catch(() => {})
    sendRead(currentConvId)
  }, [currentConvId, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // 加载更多历史消息
  const loadMoreMessages = useCallback(async () => {
    if (!currentConvId || loadingMore || !hasMoreMessages) return
    setLoadingMore(true)
    try {
      const oldest = messages[0]
      if (!oldest) return
      const older = await getMessages(currentConvId, 50, oldest.id)
      if (older.length === 0) {
        setHasMoreMessages(false)
      } else {
        prependMessages(older)
        setHasMoreMessages(older.length >= 50)
      }
    } catch {} finally {
      setLoadingMore(false)
    }
  }, [currentConvId, messages, loadingMore, hasMoreMessages, prependMessages])

  // 点击外部关闭附件菜单
  useEffect(() => {
    if (!showAttachMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.attach-menu-container')) setShowAttachMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showAttachMenu])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const result = await uploadChatFile(file)
        setPendingAttachments((prev) => [...prev, result])
      }
    } catch (err: any) {
      toast.error(err.message || '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!currentConvId || (!text && !pendingAttachments.length)) return

    let messageType: MessageType = 'text'
    if (pendingAttachments.length > 0) {
      if (text) {
        messageType = 'mixed'
      } else {
        const types = new Set(pendingAttachments.map((a) => a.type))
        messageType = types.size === 1 ? pendingAttachments[0].type : 'mixed'
      }
    }

    sendMessage(currentConvId, text, messageType, pendingAttachments)
    setInputText('')
    setPendingAttachments([])
  }

  const handleSaveAttachment = async (attachment: Attachment) => {
    try {
      await saveAttachmentToAssets({
        url: attachment.url,
        type: attachment.type,
        name: attachment.name,
        prompt: attachment.prompt,
        thumbnail_url: attachment.thumbnail_url,
      })
      toast.success('已保存到资产库')
    } catch {
      toast.error('保存失败')
    }
  }

  const handleSelectConv = (conv: ConversationInfo) => {
    setCurrentConvId(conv.id)
    setUserSearch('')
  }

  const handleStartChat = async (targetUserId: string) => {
    try {
      const { id } = await createConversation(targetUserId)
      await loadConversations()
      setCurrentConvId(id)
      setShowNewChat(false)
      setUserSearch('')
    } catch {
      toast.error('创建会话失败')
    }
  }

  const handleDeleteConv = async (convId: string) => {
    try {
      await deleteConversation(convId)
      removeConversation(convId)
      if (currentConvId === convId) {
        setCurrentConvId(null)
      }
      setDeleteConfirm(null)
      toast.success('会话已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const currentConv = conversations.find((c) => c.id === currentConvId)

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()),
  )

  const filteredConversations = convSearch
    ? conversations.filter((c) =>
        c.other_user?.username?.toLowerCase().includes(convSearch.toLowerCase())
        || c.last_message?.content?.toLowerCase().includes(convSearch.toLowerCase()),
      )
    : conversations

  const renderAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-3.5 h-3.5" />
      case 'video': return <Film className="w-3.5 h-3.5" />
      case 'audio': return <Music className="w-3.5 h-3.5" />
      default: return <Paperclip className="w-3.5 h-3.5" />
    }
  }

  const renderMessageContent = (msg: ChatMessage, isMine: boolean) => {
    const hasAttachments = msg.attachments && msg.attachments.length > 0
    const bubbleClass = cn(
      'px-3 py-1.5 rounded-2xl text-sm break-words',
      isMine
        ? isDark
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-primary text-primary-foreground rounded-br-md'
        : isDark
        ? 'bg-slate-700 text-slate-100 rounded-bl-md'
        : 'bg-gray-100 text-gray-900 rounded-bl-md',
    )

    return (
      <div className={cn('max-w-[75%]')}>
        {hasAttachments && msg.attachments.map((att, idx) => (
          <div key={idx} className="mb-1">
            {att.type === 'image' && (
              <img
                src={att.url}
                alt={att.name}
                className="max-w-full max-h-48 rounded-lg cursor-pointer object-cover"
                onClick={() => setPreviewImage(att.url)}
              />
            )}
            {att.type === 'video' && (
              <video src={att.url} controls className="max-w-full max-h-48 rounded-lg" />
            )}
            {att.type === 'audio' && (
              <div className={cn('flex items-center gap-2 p-2 rounded-lg', isDark ? 'bg-slate-600' : 'bg-gray-200')}>
                <Music className="w-5 h-5 flex-shrink-0" />
                <audio src={att.url} controls className="h-8 w-full" />
              </div>
            )}
            {att.prompt && (
              <p className={cn('text-xs mt-0.5 italic', isDark ? 'text-slate-400' : 'text-gray-500')}>
                Prompt: {att.prompt}
              </p>
            )}
            {!isMine && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => handleSaveAttachment(att)}
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
                    isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-500',
                  )}
                  title="保存到资产库"
                >
                  <Bookmark className="w-3 h-3" /> 保存
                </button>
                <a
                  href={att.url}
                  download={att.name}
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
                    isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-500',
                  )}
                >
                  <Download className="w-3 h-3" /> 下载
                </a>
              </div>
            )}
            {isMine && (
              <div className="flex gap-1 mt-1">
                <a
                  href={att.url}
                  download={att.name}
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
                    'hover:bg-white/10 text-primary-foreground/70',
                  )}
                >
                  <Download className="w-3 h-3" /> 下载
                </a>
              </div>
            )}
          </div>
        ))}

        {msg.content && (
          <div className={bubbleClass}>{msg.content}</div>
        )}

        <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-muted-foreground')}>
            {formatTime(msg.created_at)}
          </span>
          {isMine && (
            msg.is_read
              ? <CheckCheck className="w-3 h-3 text-blue-400" />
              : <Check className={cn('w-3 h-3', isDark ? 'text-slate-500' : 'text-muted-foreground')} />
          )}
        </div>
      </div>
    )
  }

  // 会话列表项（含删除）
  const renderConvItem = (conv: ConversationInfo) => {
    const isDeleting = deleteConfirm === conv.id
    return (
      <div
        key={conv.id}
        className={cn(
          'group flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors',
          currentConvId === conv.id
            ? isDark ? 'bg-blue-500/10' : 'bg-primary/10'
            : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-accent',
        )}
      >
        <button
          onClick={() => handleSelectConv(conv)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <div className="relative flex-shrink-0">
            {conv.other_user?.avatar_url ? (
              <img src={conv.other_user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium',
                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20',
              )}>
                {conv.other_user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            {conv.other_user?.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : '')}>
                {conv.other_user?.username || conv.name || '未知'}
              </span>
              {conv.last_message && (
                <span className={cn('text-[10px] flex-shrink-0', isDark ? 'text-slate-600' : 'text-muted-foreground')}>
                  {formatTime(conv.last_message.created_at)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-muted-foreground')}>
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

        {/* 删除按钮 */}
        {isDeleting ? (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => handleDeleteConv(conv.id)}
              className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded transition-colors hover:bg-red-600"
            >
              删除
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] rounded transition-colors',
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
              )}
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(conv.id)}
            className={cn(
              'flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
              isDark ? 'text-slate-500 hover:text-red-400 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100',
            )}
            title="删除会话"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-2xl p-0 gap-0 h-[560px] flex flex-col overflow-hidden',
        isDark
          ? 'bg-slate-900 border-white/10 text-slate-100'
          : 'bg-white border-gray-200 text-gray-900',
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center border-b px-4 py-2',
          isDark ? 'border-white/[0.06]' : 'border-gray-200',
        )}>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === 'chat'
                  ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-primary/10 text-primary'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-muted-foreground hover:text-foreground',
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
                  ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-primary/10 text-primary'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-muted-foreground hover:text-foreground',
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
              <div className={cn(
                'w-64 flex flex-col border-r',
                isDark ? 'border-white/[0.06]' : 'border-gray-200',
              )}>
                <div className="p-2 space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn('w-full text-xs', isDark && 'border-white/10 text-slate-300 hover:bg-white/[0.06]')}
                    onClick={() => setShowNewChat(!showNewChat)}
                  >
                    + 发起新对话
                  </Button>

                  {/* 会话搜索 */}
                  {conversations.length > 3 && (
                    <div className="relative">
                      <Search className={cn(
                        'absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3',
                        isDark ? 'text-slate-600' : 'text-gray-400',
                      )} />
                      <Input
                        placeholder="搜索会话..."
                        value={convSearch}
                        onChange={(e) => setConvSearch(e.target.value)}
                        className={cn('h-7 text-xs pl-6', isDark && 'bg-white/[0.03] border-white/[0.06] text-slate-300')}
                      />
                    </div>
                  )}
                </div>

                {showNewChat && (
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="搜索用户..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className={cn('h-8 text-xs', isDark && 'bg-white/[0.03] border-white/[0.06] text-slate-300')}
                    />
                    <ScrollArea className="max-h-40 mt-1">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleStartChat(u.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors',
                            isDark ? 'hover:bg-white/[0.06] text-slate-300' : 'hover:bg-accent',
                          )}
                        >
                          <div className="relative">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20',
                              )}>
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
                  {filteredConversations.length === 0 ? (
                    <div className={cn('text-center text-xs py-8', isDark ? 'text-slate-600' : 'text-muted-foreground')}>
                      {convSearch ? '未找到匹配的会话' : '暂无会话'}
                    </div>
                  ) : (
                    filteredConversations.map(renderConvItem)
                  )}
                </ScrollArea>
              </div>

              {/* 聊天窗口 */}
              <div className="flex-1 flex flex-col">
                {currentConv ? (
                  <>
                    {/* 聊天头部 */}
                    <div className={cn(
                      'flex items-center gap-2 px-4 py-2 border-b',
                      isDark ? 'border-white/[0.06]' : 'border-gray-200',
                    )}>
                      <div className="relative">
                        {currentConv.other_user?.avatar_url ? (
                          <img src={currentConv.other_user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                            isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20',
                          )}>
                            {currentConv.other_user?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        {currentConv.other_user?.online && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-background" />
                        )}
                      </div>
                      <span className={cn('text-sm font-medium', isDark && 'text-slate-200')}>
                        {currentConv.other_user?.username}
                      </span>
                      <span className={cn(
                        'text-xs',
                        currentConv.other_user?.online ? 'text-green-500' : isDark ? 'text-slate-500' : 'text-muted-foreground',
                      )}>
                        {currentConv.other_user?.online ? '在线' : '离线'}
                      </span>
                    </div>

                    {/* 消息列表 */}
                    <ScrollArea className="flex-1 px-4 py-2">
                      {hasMoreMessages && (
                        <div className="flex justify-center py-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn('text-xs h-6', isDark && 'text-slate-500')}
                            onClick={loadMoreMessages}
                            disabled={loadingMore}
                          >
                            {loadingMore ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <ArrowUp className="w-3 h-3 mr-1" />
                            )}
                            加载更早消息
                          </Button>
                        </div>
                      )}
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
                                  <div className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20',
                                  )}>
                                    {msg.sender_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            )}
                            {renderMessageContent(msg, isMine)}
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    {/* 待发送附件预览 */}
                    {pendingAttachments.length > 0 && (
                      <div className={cn(
                        'flex gap-2 px-4 py-2 border-t overflow-x-auto',
                        isDark ? 'border-white/[0.06]' : 'border-gray-200',
                      )}>
                        {pendingAttachments.map((att, idx) => (
                          <div key={idx} className="relative flex-shrink-0 group">
                            {att.type === 'image' ? (
                              <img src={att.url} className="w-16 h-16 rounded object-cover" />
                            ) : (
                              <div className={cn(
                                'w-16 h-16 rounded flex flex-col items-center justify-center text-xs gap-1',
                                isDark ? 'bg-white/[0.06]' : 'bg-accent',
                              )}>
                                {renderAttachmentIcon(att.type)}
                                <span className="truncate max-w-[56px] text-[10px]">{att.name}</span>
                              </div>
                            )}
                            <button
                              onClick={() => removePendingAttachment(idx)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 输入框 */}
                    <div className={cn(
                      'flex items-center gap-2 px-4 py-2 border-t',
                      isDark ? 'border-white/[0.06]' : 'border-gray-200',
                    )}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <div className="relative flex-shrink-0 attach-menu-container">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn('h-8 w-8 p-0', isDark && 'text-slate-400 hover:text-slate-200')}
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        </Button>
                        {showAttachMenu && (
                          <div className={cn(
                            'absolute bottom-10 left-0 w-36 rounded-lg shadow-lg py-1 z-10',
                            isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200',
                          )}>
                            <button
                              onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }}
                              className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors',
                                isDark ? 'hover:bg-white/[0.06] text-slate-300' : 'hover:bg-gray-100',
                              )}
                            >
                              <Paperclip className="w-3.5 h-3.5" /> 上传文件
                            </button>
                            <button
                              onClick={() => { setShowAssetPicker(true); setShowAttachMenu(false) }}
                              className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors',
                                isDark ? 'hover:bg-white/[0.06] text-slate-300' : 'hover:bg-gray-100',
                              )}
                            >
                              <FolderOpen className="w-3.5 h-3.5" /> 资产库
                            </button>
                          </div>
                        )}
                      </div>
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        placeholder={pendingAttachments.length > 0 ? '添加文字说明（可选）...' : '输入消息...'}
                        className={cn('h-8 text-sm', isDark && 'bg-white/[0.03] border-white/[0.06] text-slate-300')}
                      />
                      <Button size="sm" onClick={handleSend} disabled={!inputText.trim() && !pendingAttachments.length}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={cn(
                    'flex-1 flex items-center justify-center text-sm',
                    isDark ? 'text-slate-600' : 'text-muted-foreground',
                  )}>
                    选择一个会话开始聊天
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 通知 tab */
            <div className="flex-1 flex flex-col">
              <div className={cn(
                'flex items-center justify-between px-4 py-2 border-b',
                isDark ? 'border-white/[0.06]' : 'border-gray-200',
              )}>
                <span className={cn('text-sm font-medium', isDark && 'text-slate-200')}>系统通知</span>
                {notifUnread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('text-xs h-auto py-1 px-2', isDark && 'text-slate-400 hover:text-slate-200')}
                    onClick={async () => {
                      if (!user?.id) return
                      await markAllAsRead(user.id)
                      markAllNotifRead()
                    }}
                  >
                    全部已读
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                  <div className={cn('text-center text-sm py-12', isDark ? 'text-slate-600' : 'text-muted-foreground')}>
                    暂无通知
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 border-b cursor-pointer transition-colors',
                        n.status !== 'read'
                          ? isDark ? 'bg-blue-500/[0.06]' : 'bg-blue-50'
                          : '',
                        isDark ? 'border-white/[0.04]' : 'border-gray-100',
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
                          <p className={cn('text-sm font-medium truncate', isDark && 'text-slate-200')}>{n.title}</p>
                          <p className={cn('text-xs mt-0.5 line-clamp-2', isDark ? 'text-slate-500' : 'text-muted-foreground')}>
                            {n.content}
                          </p>
                          <p className={cn('text-[10px] mt-1', isDark ? 'text-slate-600' : 'text-muted-foreground')}>
                            {formatTime(n.created_at)}
                          </p>
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

        {/* 资产库选择器 */}
        <AssetPicker
          open={showAssetPicker}
          onClose={() => setShowAssetPicker(false)}
          onSelect={(att) => setPendingAttachments((prev) => [...prev, att])}
        />

        {/* 图片预览遮罩 */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <img src={previewImage} className="max-w-[90vw] max-h-[90vh] object-contain" />
            <button className="absolute top-4 right-4 text-white" onClick={() => setPreviewImage(null)}>
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
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
