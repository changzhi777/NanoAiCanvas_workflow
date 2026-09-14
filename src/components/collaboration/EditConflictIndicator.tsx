import { memo, useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface EditingUser {
  userId: string
  userName: string
  color: string
  timestamp: number
}

interface EditConflictIndicatorProps {
  nodeId: string
  editingUsers: EditingUser[]
  currentUserId?: string
}

const EditConflictIndicator = memo(
  ({ nodeId: _nodeId, editingUsers, currentUserId }: EditConflictIndicatorProps) => {
    const [visible, setVisible] = useState(false)

    // 过滤出正在编辑此节点的其他用户
    const otherEditors = editingUsers.filter(
      (user) => user.userId !== currentUserId && Date.now() - user.timestamp < 10000 // 10秒内活跃
    )

    useEffect(() => {
      setVisible(otherEditors.length > 0)
    }, [otherEditors.length])

    if (!visible || otherEditors.length === 0) {
      return null
    }

    return (
      <div className="edit-conflict-indicator absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-xs text-destructive font-medium">
          {otherEditors.length === 1
            ? `${otherEditors[0].userName} 正在编辑`
            : `${otherEditors.map((u) => u.userName).join(', ')} 正在编辑`}
        </span>
      </div>
    )
  }
)

EditConflictIndicator.displayName = 'EditConflictIndicator'

export default EditConflictIndicator

// WebSocket 集成示例
export const useEditConflicts = (socket: WebSocket | null, currentUserId: string) => {
  const [editingUsers, setEditingUsers] = useState<Record<string, EditingUser[]>>({})

  useEffect(() => {
    if (!socket) return

    const handleNodeEditing = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'node:editing') {
          const { nodeId, userId, userName, color } = data.payload

          setEditingUsers((prev) => ({
            ...prev,
            [nodeId]: [
              ...(prev[nodeId] || []).filter((u) => u.userId !== userId),
              {
                userId,
                userName,
                color,
                timestamp: Date.now(),
              },
            ],
          }))
        } else if (data.type === 'node:editing:end') {
          const { nodeId, userId } = data.payload

          setEditingUsers((prev) => ({
            ...prev,
            [nodeId]: (prev[nodeId] || []).filter((u) => u.userId !== userId),
          }))
        }
      } catch (error) {
        console.error('Failed to parse edit conflict message:', error)
      }
    }

    socket.addEventListener('message', handleNodeEditing)

    return () => {
      socket.removeEventListener('message', handleNodeEditing)
    }
  }, [socket, currentUserId])

  // 开始编辑节点
  const startEditing = (nodeId: string, userName: string, color: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    socket.send(
      JSON.stringify({
        type: 'node:editing:start',
        payload: {
          nodeId,
          userId: currentUserId,
          userName,
          color,
        },
      })
    )
  }

  // 结束编辑节点
  const endEditing = (nodeId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    socket.send(
      JSON.stringify({
        type: 'node:editing:end',
        payload: {
          nodeId,
          userId: currentUserId,
        },
      })
    )
  }

  return {
    editingUsers,
    startEditing,
    endEditing,
  }
}
