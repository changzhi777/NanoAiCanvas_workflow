import { useEffect, useRef, useCallback } from 'react'
import { getChatWsUrl } from '@/lib/api/chat-api'
import type { Attachment, MessageType, ChatMessage } from '@/lib/api/chat-api'

interface ChatWsMessage {
  type: 'new_message' | 'message_read' | 'online_status' | 'conversation_deleted'
  data: Record<string, unknown>
}

interface ChatWsMessageEvent {
  type: 'new_message'
  message: ChatMessage
}

interface ChatWsReadEvent {
  type: 'message_read'
  conversation_id: string
  message_ids: string[]
}

interface ChatWsOnlineEvent {
  type: 'online_status'
  user_id: string
  online: boolean
}

interface ChatWsDeleteEvent {
  type: 'conversation_deleted'
  conversation_id: string
}

type ChatWsPayload = ChatWsMessageEvent | ChatWsReadEvent | ChatWsOnlineEvent | ChatWsDeleteEvent

interface UseChatSocketOptions {
  userId: string | null
  onMessage?: (payload: ChatWsMessageEvent) => void
  onRead?: (payload: ChatWsReadEvent) => void
  onOnlineStatus?: (payload: ChatWsOnlineEvent) => void
  onConversationDeleted?: (payload: ChatWsDeleteEvent) => void
  enabled?: boolean
}

const RECONNECT_BASE = 3000
const RECONNECT_MAX = 60000

export function useChatSocket({
  userId,
  onMessage,
  onRead,
  onOnlineStatus,
  onConversationDeleted,
  enabled = true,
}: UseChatSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const callbacksRef = useRef({ onMessage, onRead, onOnlineStatus, onConversationDeleted })
  const retryRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  callbacksRef.current = { onMessage, onRead, onOnlineStatus, onConversationDeleted }

  const connect = useCallback(() => {
    if (!userId || !enabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(getChatWsUrl(userId))

    ws.onopen = () => {
      console.log('[ChatWS] connected')
      retryRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const { type, payload } = data
        if (type === 'message') callbacksRef.current.onMessage?.(payload)
        else if (type === 'read') callbacksRef.current.onRead?.(payload)
        else if (type === 'online_status') callbacksRef.current.onOnlineStatus?.(payload)
        else if (type === 'conversation_deleted') callbacksRef.current.onConversationDeleted?.(payload)
      } catch (e) {
        console.warn('[ChatWS] failed to parse message:', e)
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      const delay = Math.min(RECONNECT_BASE * Math.pow(2, retryRef.current), RECONNECT_MAX)
      retryRef.current++
      console.log(`[ChatWS] disconnected, reconnecting in ${delay}ms (attempt ${retryRef.current})`)
      timerRef.current = setTimeout(() => connect(), delay)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [userId, enabled])

  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    messageType: MessageType = 'text',
    attachments: Attachment[] = [],
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: { conversation_id: conversationId, content, message_type: messageType, attachments },
      }))
    }
  }, [])

  const sendRead = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read',
        payload: { conversation_id: conversationId },
      }))
    }
  }, [])

  // 心跳
  useEffect(() => {
    if (!enabled || !userId) return
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [userId, enabled])

  // 连接/断开
  useEffect(() => {
    if (enabled && userId) {
      connect()
    }
    return () => {
      clearTimeout(timerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [userId, enabled, connect])

  return { sendMessage, sendRead }
}
