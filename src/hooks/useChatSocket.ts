import { useEffect, useRef, useCallback } from 'react'
import { getChatWsUrl } from '@/lib/api/chat-api'
import type { Attachment, MessageType } from '@/lib/api/chat-api'

interface UseChatSocketOptions {
  userId: string | null
  onMessage?: (payload: any) => void
  onRead?: (payload: any) => void
  onOnlineStatus?: (payload: any) => void
  enabled?: boolean
}

const RECONNECT_BASE = 3000
const RECONNECT_MAX = 60000

export function useChatSocket({
  userId,
  onMessage,
  onRead,
  onOnlineStatus,
  enabled = true,
}: UseChatSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const callbacksRef = useRef({ onMessage, onRead, onOnlineStatus })
  const retryRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  callbacksRef.current = { onMessage, onRead, onOnlineStatus }

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
      } catch {}
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
