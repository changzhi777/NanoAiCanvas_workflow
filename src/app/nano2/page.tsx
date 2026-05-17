'use client'

import { useEffect, useState } from 'react'
import { Nano2Header, type Nano2Mode } from '@/components/Nano2Header'
import { Nano2Footer } from '@/components/Nano2Footer'
import { Nano2ErrorBanner } from '@/components/Nano2ErrorBanner'
import { GenerationPanel } from '@/components/GenerationPanel'
import { Nano2TvcPanel } from '@/components/Nano2TvcPanel'
import { TaskDetailPanel } from '@/components/TaskDetailPanel'
import HistoryPanel from '@/components/HistoryPanel'
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog'
import { BananaBrotherDialog } from '@/components/BananaBrotherDialog'
import AssetLibraryPanel from '@/components/ui/AssetLibrary/AssetLibraryPanel'
import { useBananaBrotherStore } from '@/stores/nanoImageBananaBrotherStore'
import { useAuthStore } from '@/stores/remoteStore'
import { useToast } from '@/hooks/useToast'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History, Package } from 'lucide-react'

export default function Nano2Page() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [rightPanelTab, setRightPanelTab] = useState<'history' | 'assets'>('history')
  const [mode, setMode] = useState<Nano2Mode>('image')
  const { toast } = useToast()

  // Stores
  const isOpen = useBananaBrotherStore((s) => s.isOpen)
  const closeDialog = useBananaBrotherStore((s) => s.closeDialog)
  const user = useAuthStore((s) => s.user)
  const apiKey = user?.textApiKey || user?.imageApiKey || ''
  const token = useAuthStore((s) => s.token)

  // 监听图片预览事件
  useEffect(() => {
    const handlePreviewImage = (e: CustomEvent<{ imageUrl: string }>) => {
      setPreviewImageUrl(e.detail.imageUrl)
      setPreviewOpen(true)
    }

    window.addEventListener('history:previewImage', handlePreviewImage as unknown as EventListener)
    return () => {
      window.removeEventListener('history:previewImage', handlePreviewImage as unknown as EventListener)
    }
  }, [])

  // 监听生图成功事件，自动保存到资产库
  useEffect(() => {
    const handleImageGenerated = async (e: CustomEvent<{ images: string[]; prompt: string }>) => {
      if (!token) return
      const { images, prompt } = e.detail
      try {
        const { assets } = await import('@/lib/api/client')
        for (const imageUrl of images) {
          await assets.create({
            type: 'image',
            name: `生成_${Date.now()}`,
            url: imageUrl,
            category: 'image',
            tags: prompt ? [prompt.substring(0, 50)] : [],
          }, token)
        }
        toast.success(`${images.length} 张图片已保存到资产库`)
      } catch (err) {
        console.error('保存到资产库失败:', err)
      }
    }

    window.addEventListener('image:generated', handleImageGenerated as unknown as EventListener)
    return () => {
      window.removeEventListener('image:generated', handleImageGenerated as unknown as EventListener)
    }
  }, [token, toast])

  // 切换模式时同步右侧 Tab
  const handleModeChange = (newMode: Nano2Mode) => {
    setMode(newMode)
    if (newMode === 'tvc') setRightPanelTab('assets')
  }

  return (
    <div className="flex flex-col h-screen">
      <Nano2Header
        onSwitchToAssets={() => setRightPanelTab('assets')}
        mode={mode}
        onModeChange={handleModeChange}
      />
      <Nano2ErrorBanner />

      {mode === 'tvc' ? (
        // TVC 模式：全屏面板
        <main className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
          <Nano2TvcPanel />
        </main>
      ) : (
        // 生图模式：原有三栏布局
        <main className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
          <div className="col-span-4 min-h-0">
            <GenerationPanel />
          </div>
          <div className="col-span-5 min-h-0">
            <TaskDetailPanel />
          </div>
          <div className="col-span-3 min-h-0 flex flex-col">
            <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'history' | 'assets')} className="flex flex-col h-full">
              <div className="flex items-center gap-1 px-3 py-2 bg-card/60 border border-white/10 backdrop-blur-xl rounded-t-xl shrink-0">
                <TabsList className="bg-transparent gap-1 p-0 h-auto">
                  <TabsTrigger
                    value="history"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm data-[active]:bg-white/10 data-[active]:text-foreground text-muted-foreground transition-colors"
                  >
                    <History className="h-4 w-4" />
                    <span>历史</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="assets"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm data-[active]:bg-white/10 data-[active]:text-foreground text-muted-foreground transition-colors"
                  >
                    <Package className="h-4 w-4" />
                    <span>资产库</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden border border-t-0 border-white/10">
                {rightPanelTab === 'history' ? (
                  <HistoryPanel />
                ) : (
                  <AssetLibraryPanel
                    open={true}
                    onClose={() => setRightPanelTab('history')}
                    selectionMode={false}
                  />
                )}
              </div>
            </Tabs>
          </div>
        </main>
      )}

      <Nano2Footer />

      <ImagePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={previewImageUrl}
      />

      <BananaBrotherDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        apiKey={apiKey}
        onPromptGenerated={(prompt) => {
          window.dispatchEvent(new CustomEvent('banana:promptGenerated', { detail: { prompt } }))
          closeDialog()
          toast.success('香蕉哥哥已生成提示词')
        }}
      />
    </div>
  )
}
