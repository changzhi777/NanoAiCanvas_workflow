'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, ListTodo, Images } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SessionHistoryTab } from './HistoryPanelTabs/SessionHistoryTab'
import { TaskQueueTab } from './HistoryPanelTabs/TaskQueueTab'
import { ImageRecordsTab } from './HistoryPanelTabs/ImageRecordsTab'
import type { TaskQueueItem } from '@/types'

export default function HistoryPanel() {
  const [activeTab, setActiveTab] = useState<string>('sessions')

  // 监听切换到任务队列的事件
  useEffect(() => {
    const handleSwitchToTasks = () => {
      setActiveTab('tasks')
    }

    window.addEventListener('history:switchToTasks', handleSwitchToTasks)
    return () => {
      window.removeEventListener('history:switchToTasks', handleSwitchToTasks)
    }
  }, [])

  const handleViewSession = (sessionId: string) => {
    window.dispatchEvent(new CustomEvent('history:viewDetail', { detail: { sessionId } }))
  }

  const handleCopyAndExecute = (task: TaskQueueItem) => {
    // Dispatch event to GenerationPanel to copy prompt
    window.dispatchEvent(
      new CustomEvent('taskQueue:copyAndExecute', {
        detail: { task },
      })
    )
  }

  const handleViewTask = (task: TaskQueueItem) => {
    // Dispatch event to TaskDetailPanel to view task
    window.dispatchEvent(
      new CustomEvent('taskQueue:viewTask', {
        detail: { task },
      })
    )
  }

  const handleViewImage = (imageUrl: string) => {
    window.dispatchEvent(
      new CustomEvent('history:previewImage', {
        detail: { imageUrl },
      } as CustomEventInit)
    )
  }

  return (
    <div className="bg-card/60 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-white/5 shrink-0">
          <TabsList className="bg-transparent gap-1 p-0">
              <TabsTrigger
                value="sessions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm data-[active]:bg-white/10 data-[active]:text-foreground text-muted-foreground transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>会话历史</span>
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm data-[active]:bg-white/10 data-[active]:text-foreground text-muted-foreground transition-colors"
              >
                <ListTodo className="h-4 w-4" />
                <span>任务队列</span>
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm data-[active]:bg-white/10 data-[active]:text-foreground text-muted-foreground transition-colors"
              >
                <Images className="h-4 w-4" />
                <span>生图记录</span>
              </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full p-3" hidden={activeTab !== 'sessions'}>
            <SessionHistoryTab onViewSession={handleViewSession} />
          </div>
          <div className="h-full p-3" hidden={activeTab !== 'tasks'}>
            <TaskQueueTab onCopyAndExecute={handleCopyAndExecute} onViewTask={handleViewTask} />
          </div>
          <div className="h-full p-3" hidden={activeTab !== 'images'}>
            <ImageRecordsTab onViewImage={handleViewImage} />
          </div>
        </div>
      </Tabs>
    </div>
  )
}