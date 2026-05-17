'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, Lightbulb, Network, Sparkles } from 'lucide-react'
import { useKnowledgeCardStore } from '@/stores/nanoImageKnowledgeCardStore'
import {
  buildKnowledgeCardPrompt,
  buildMindmapPrompt,
  KNOWLEDGE_CARD_CATEGORIES,
  CARD_STYLE_OPTIONS,
  MINDMAP_STYLE_OPTIONS,
  CATEGORY_ICONS,
} from '@/lib/constants/card-templates'
import type { KnowledgeCardCategory, MindmapStyle, MindmapNode } from '@/types'
import { cn } from '@/lib/utils'

interface KnowledgeCardDialogProps {
  onGenerate: (prompt: string) => void
}


export function KnowledgeCardDialog({ onGenerate }: KnowledgeCardDialogProps) {
  const { isDialogOpen, closeDialog, selectedCategory, selectedStyle, setCategory, setStyle } =
    useKnowledgeCardStore()

  const [activeTab, setActiveTab] = useState<TabType>('card')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mindmapTitle, setMindmapTitle] = useState('')
  const [mindmapContent, setMindmapContent] = useState('')
  const [mindmapStyle, setMindmapStyle] = useState<MindmapStyle>('tree')

  const handleGenerateCard = () => {
    const prompt = buildKnowledgeCardPrompt(title, content, selectedCategory, selectedStyle)
    onGenerate(prompt)
    handleClose()
  }

  const handleGenerateMindmap = () => {
    const mindmapData: MindmapNode = {
      id: 'root',
      text: mindmapTitle.trim() || '思维导图',
      children: mindmapContent.trim()
        ? mindmapContent.split('\n').filter(line => line.trim()).map((line, idx) => ({
            id: `node-${idx}`,
            text: line.trim(),
            children: [],
          }))
        : [],
    }
    const prompt = buildMindmapPrompt(mindmapData, selectedCategory, mindmapStyle)
    onGenerate(prompt)
    handleClose()
  }

  const handleClose = () => {
    closeDialog()
    setTitle('')
    setContent('')
    setMindmapTitle('')
    setMindmapContent('')
  }

  const isCardValid = title.trim() && content.trim()
  const isMindmapValid = mindmapTitle.trim()

  return (
    <Dialog open={isDialogOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card/60 border-white/10 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-primary" />
            知识卡片 / 思维导图
          </DialogTitle>

          {/* Tab Switcher */}
          <div className="flex rounded-lg border border-white/10 p-0.5">
            <button
              onClick={() => setActiveTab('card')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
                activeTab === 'card'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              卡片
            </button>
            <button
              onClick={() => setActiveTab('mindmap')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
                activeTab === 'mindmap'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Network className="w-3.5 h-3.5" />
              导图
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-muted-foreground">学科分类</label>
          <div className="grid grid-cols-5 gap-1.5">
            {KNOWLEDGE_CARD_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value as KnowledgeCardCategory)}
                className={cn(
                  'flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-colors text-center',
                  selectedCategory === c.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                )}
              >
                <span className="text-base">{CATEGORY_ICONS[c.value]}</span>
                <span className="text-[10px] leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Tab Content */}
        {activeTab === 'card' && (
          <>
            {/* Style Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-muted-foreground">卡片风格</label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      selectedStyle === s.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    <div className="text-sm font-medium mb-0.5">{s.label}</div>
                    <p className="text-[10px] opacity-70">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2 mb-3">
              <label className="text-xs text-muted-foreground">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="知识卡片标题..."
                className="bg-transparent border-input"
              />
            </div>

            {/* Content */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-muted-foreground">内容</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入知识点内容..."
                rows={4}
                className="bg-transparent border-input"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateCard}
              disabled={!isCardValid}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              生成提示词
            </Button>
          </>
        )}

        {/* Mindmap Tab Content */}
        {activeTab === 'mindmap' && (
          <>
            {/* Style Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-muted-foreground">布局风格</label>
              <div className="grid grid-cols-3 gap-2">
                {MINDMAP_STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setMindmapStyle(s.value)}
                    className={cn(
                      'rounded-lg border p-2 text-left transition-colors',
                      mindmapStyle === s.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>{s.icon}</span>
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                    <p className="text-[10px] opacity-70">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2 mb-3">
              <label className="text-xs text-muted-foreground">中心主题</label>
              <Input
                value={mindmapTitle}
                onChange={(e) => setMindmapTitle(e.target.value)}
                placeholder="思维导图标题..."
                className="bg-transparent border-input"
              />
            </div>

            {/* Content */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-muted-foreground">分支内容</label>
              <Textarea
                value={mindmapContent}
                onChange={(e) => setMindmapContent(e.target.value)}
                placeholder="每行一个要点，将作为导图的分支节点..."
                rows={4}
                className="bg-transparent border-input"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateMindmap}
              disabled={!isMindmapValid}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              生成提示词
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
