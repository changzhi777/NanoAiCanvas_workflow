'use client'

import { MessageSquare, Trash2, Edit3, Plus } from 'lucide-react'
import { useChatStore } from '@/stores/nanoImageChatStore'
import { Button } from '@/components/ui/button'

interface SessionHistoryTabProps {
  onViewSession: (sessionId: string) => void
}

export function SessionHistoryTab({ onViewSession }: SessionHistoryTabProps) {
  const { sessions, currentSession, selectSession, deleteSessionById, renameSession, createNewSession } =
    useChatStore()

  const handleNewSession = async () => {
    await createNewSession()
  }

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteSessionById(sessionId)
  }

  const handleRename = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const session = sessions.find((s) => s.id === sessionId)
    if (!session) return
    const newTitle = prompt('重命名会话', session.title)
    if (newTitle && newTitle !== session.title) {
      await renameSession(sessionId, newTitle)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-muted-foreground">共 {sessions.length} 个会话</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewSession}
          className="h-6 px-2 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          新建
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => {
              selectSession(session.id)
              onViewSession(session.id)
            }}
            className={`group p-2 rounded-md cursor-pointer transition-colors ${
              currentSession?.id === session.id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{session.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {session.messages.length} 条消息 · {new Date(session.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => handleRename(session.id, e)}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => handleDelete(session.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
