import { useEffect, useRef, useCallback } from 'react'
import { getChatWsUrl } from '@/lib/api/chat-api'

interface UseChatSocketOptions {
  userId: string | null
  onMessage?: (payload: any) => void
  onRead?: (payload: any) => void
  onOnlineStatus?: (payload: any) => void
  enabled?: boolean
}

export function useChatSocket({
  userId,
  onMessage,
  onRead,
  onOnlineStatus,
  enabled = true,
}: UseChatSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const callbacksRef = useRef({ onMessage, onRead, onOnlineStatus })
  callbacksRef.current = { onMessage, onRead, onOnlineStatus }

  const connect = useCallback(() => {
    if (!userId || !enabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(getChatWsUrl(userId))

    ws.onopen = () => {
      console.log('[ChatWS] connected')
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
      console.log('[ChatWS] disconnected, reconnecting in 3s...')
      wsRef.current = null
      setTimeout(() => connect(), 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [userId, enabled])

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: { conversation_id: conversationId, content },
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
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [userId, enabled, connect])

  return { sendMessage, sendRead }
}
