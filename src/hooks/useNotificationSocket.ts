/**
 * 消息通知 WebSocket Hook
 */

import { useEffect, useRef, useCallback } from 'react'
import { getWebSocketUrl } from '@/lib/api/notifications-api'
import { useNotificationStore } from '@/stores/notificationStore'

const HEARTBEAT_INTERVAL = 30000 // 30秒
const RECONNECT_DELAY = 5000 // 5秒
const MAX_RECONNECT_ATTEMPTS = 5

interface UseNotificationSocketOptions {
  userId: string | null
  enabled?: boolean
  onNewNotification?: (notification: any) => void
}

export function useNotificationSocket({
  userId,
  enabled = true,
  onNewNotification,
}: UseNotificationSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { setWsConnected, addNotification, incrementUnread } = useNotificationStore()

  const connect = useCallback(() => {
    if (!userId || !enabled) return

    const wsUrl = getWebSocketUrl(userId)
    console.log('[NotificationSocket] Connecting to:', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[NotificationSocket] Connected')
        setWsConnected(true)
        reconnectAttemptsRef.current = 0

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        if (event.data === 'pong') return

        try {
          const message = JSON.parse(event.data)
          console.log('[NotificationSocket] Received:', message)

          if (message.type === 'new_notification') {
            const notification = message.data
            addNotification({
              ...notification,
              status: 'delivered',
              created_at: new Date().toISOString(),
            })
            incrementUnread()
            onNewNotification?.(notification)
          }
        } catch (e) {
          console.error('[NotificationSocket] Parse error:', e)
        }
      }

      ws.onclose = () => {
        console.log('[NotificationSocket] Disconnected')
        setWsConnected(false)
        cleanup()
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error('[NotificationSocket] Error:', error)
      }
    } catch (error) {
      console.error('[NotificationSocket] Connection error:', error)
      scheduleReconnect()
    }
  }, [userId, enabled, setWsConnected, addNotification, incrementUnread, onNewNotification])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS // Prevent auto-reconnect
    cleanup()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsConnected(false)
  }, [setWsConnected])

  const cleanup = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[NotificationSocket] Max reconnect attempts reached')
      return
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      console.log(`[NotificationSocket] Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
      connect()
    }, RECONNECT_DELAY)
  }, [connect])

  useEffect(() => {
    if (enabled && userId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, userId, connect, disconnect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
    reconnect: connect,
  }
}
