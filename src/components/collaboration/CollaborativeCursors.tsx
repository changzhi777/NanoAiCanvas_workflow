import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface RemoteCursor {
  userId: string
  userName: string
  color: string
  position: { x: number; y: number }
  timestamp: number
}

interface CollaborativeCursorsProps {
  cursors: RemoteCursor[]
  currentUserId?: string
}

const CollaborativeCursors = memo(({ cursors, currentUserId }: CollaborativeCursorsProps) => {
  const [visibleCursors, setVisibleCursors] = useState<RemoteCursor[]>([])

  // 自动清理过期光标（5秒后移除）
  useEffect(() => {
    const now = Date.now()
    const filtered = cursors.filter((cursor) => now - cursor.timestamp < 5000)
    setVisibleCursors(filtered)
  }, [cursors])

  return createPortal(
    <div className="collaborative-cursors-container pointer-events-none fixed inset-0 z-[1000]">
      {visibleCursors
        .filter((cursor) => cursor.userId !== currentUserId) // 不显示自己的光标
        .map((cursor) => (
          <div
            key={cursor.userId}
            className="remote-cursor absolute transition-all duration-100 ease-linear"
            style={{
              left: cursor.position.x,
              top: cursor.position.y,
            }}
          >
            {/* 光标箭头 */}
            <svg
              className="cursor-icon"
              viewBox="0 0 24 24"
              fill={cursor.color}
              style={{
                width: '20px',
                height: '20px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z" />
            </svg>

            {/* 用户名标签 */}
            <div
              className="cursor-label absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap animate-fade-in"
              style={{
                background: cursor.color,
              }}
            >
              {cursor.userName}
            </div>
          </div>
        ))}
    </div>,
    document.body
  )
})

CollaborativeCursors.displayName = 'CollaborativeCursors'

export default CollaborativeCursors

// WebSocket 集成示例
export const useCollaborativeCursors = (socket: WebSocket | null, currentUserId: string) => {
  const [cursors, setCursors] = useState<RemoteCursor[]>([])

  useEffect(() => {
    if (!socket) return

    // 监听其他用户的光标位置
    const handleCursorUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'cursor:update') {
          const cursor: RemoteCursor = data.payload
          setCursors((prev) => {
            const existing = prev.findIndex((c) => c.userId === cursor.userId)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = cursor
              return updated
            } else {
              return [...prev, cursor]
            }
          })

          // 5秒后自动移除
          setTimeout(() => {
            setCursors((prev) => prev.filter((c) => c.userId !== cursor.userId))
          }, 5000)
        }
      } catch (error) {
        console.error('Failed to parse cursor update:', error)
      }
    }

    socket.addEventListener('message', handleCursorUpdate)

    return () => {
      socket.removeEventListener('message', handleCursorUpdate)
    }
  }, [socket, currentUserId])

  // 发送当前光标位置
  const sendCursorPosition = (position: { x: number; y: number }) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    socket.send(
      JSON.stringify({
        type: 'cursor:update',
        payload: {
          userId: currentUserId,
          position,
          timestamp: Date.now(),
        },
      })
    )
  }

  return { cursors, sendCursorPosition }
}
