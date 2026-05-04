'use client'

import { useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, ImagePlus, X, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// 模板定义
// ---------------------------------------------------------------------------

interface TemplateConfig {
  id: string
  label: string
  description: string
  icon: string
  systemPrompt: string
  initialMessage: string
  generatePrompt: string
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'general',
    label: '通用创作',
    description: '自由描述，灵活创作',
    icon: '🎨',
    systemPrompt: '你是"香蕉哥哥"，一个专业的AI绘画提示词顾问。帮助用户逐步构建专业的图像生成提示词。回复简洁专业，每次回答控制在100字以内。当用户提供了足够信息后，主动总结并生成最终提示词。',
    initialMessage: '你好！我是香蕉哥哥，你的AI绘画助手。请告诉我你想要创作什么样的图像？你可以描述主体、风格、构图等，我会帮你生成专业的提示词。',
    generatePrompt: '根据对话内容，生成一个专业的英文AI绘画提示词。只输出提示词本身，不要任何解释。格式：[主体描述], [构图/角度], [镜头类型], [光影效果], [风格], [技术参数], high quality, masterpiece',
  },
  {
    id: 'portrait',
    label: '人物肖像',
    description: '专注人物面部与姿态',
    icon: '👤',
    systemPrompt: '你是专业的肖像摄影提示词专家。帮助用户创建人物肖像画的提示词，关注面部特征、表情、姿态、服装、背景虚化等要素。回复简洁，控制在100字以内。',
    initialMessage: '让我帮你创建完美的人物肖像！请告诉我：1. 人物性别和大致年龄 2. 面部特征（发型、眼睛、表情）3. 服装风格 4. 背景环境',
    generatePrompt: '根据对话生成人物肖像的英文提示词。包含：人物描述、面部细节、服装、姿态、光影、背景、相机参数。格式：portrait of [人物], [面部特征], [服装], [姿态], [光影], [背景], [相机设置], high quality, professional photography',
  },
  {
    id: 'landscape',
    label: '风景场景',
    description: '自然与城市景观',
    icon: '🏔️',
    systemPrompt: '你是专业的风景摄影提示词专家。帮助用户创建风景画的提示词，关注构图、光线、氛围、季节、天气等要素。回复简洁，控制在100字以内。',
    initialMessage: '一起来创作壮丽的风景画！请描述：1. 场景类型（山川/海洋/城市/森林等）2. 时间（日出/日落/夜晚）3. 天气状况 4. 想要的氛围感',
    generatePrompt: '根据对话生成风景的英文提示词。包含：场景描述、时间、天气、光影、氛围、构图、相机参数。格式：[场景类型] landscape, [时间], [天气], [光影效果], [氛围], [构图方式], [相机设置], high quality, professional photography',
  },
  {
    id: 'product',
    label: '产品展示',
    description: '商业产品摄影风格',
    icon: '📦',
    systemPrompt: '你是专业的商业产品摄影提示词专家。帮助用户创建产品展示图的提示词，关注产品质感、光影、背景、道具搭配等。回复简洁，控制在100字以内。',
    initialMessage: '让我帮你创建专业的产品展示图！请告诉我：1. 产品类型和名称 2. 材质特点 3. 想要的背景风格 4. 目标受众或使用场景',
    generatePrompt: '根据对话生成产品展示的英文提示词。包含：产品描述、材质、光影、背景、道具、相机参数。格式：[产品类型] product photography, [材质细节], [光影布置], [背景风格], [道具搭配], [相机设置], high quality, commercial photography, studio lighting',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PromptWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  onPromptGenerated: (prompt: string) => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ReferenceImage {
  id: string
  url: string
  file: File
  base64?: string
}

export function PromptWizardDialog({ open, onOpenChange, apiKey, onPromptGenerated }: PromptWizardDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取当前模板
  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0]

  // 初始化对话
  const initConversation = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0]
    setMessages([{ role: 'assistant', content: template.initialMessage }])
  }, [])

  // 模板切换时重置对话
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    initConversation(templateId)
  }

  // 初始化
  useState(() => {
    initConversation(selectedTemplate)
  })

  // 图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || ''
      setReferenceImage({
        id: crypto.randomUUID(),
        url,
        file,
        base64,
      })
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 清除参考图
  const clearReferenceImage = useCallback(() => {
    setReferenceImage(null)
  }, [])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // 构建消息内容
      let userContent = input.trim()
      if (referenceImage?.base64) {
        userContent = `[用户上传了一张参考图片]\n${userContent}`
      }

      const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          max_tokens: 300,
          temperature: 0.7,
          system: activeTemplate.systemPrompt,
          messages: [
            { role: 'user', content: userContent },
          ],
        }),
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || '抱歉，我暂时无法回复。'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '网络错误，请稍后重试。' }])
    } finally {
      setLoading(false)
    }
  }

  // 生成最终提示词
  const handleGeneratePrompt = async () => {
    if (!apiKey || messages.length < 2) {
      toast.error('请先进行对话描述')
      return
    }

    setLoading(true)
    try {
      const conversationText = messages
        .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
        .join('\n')

      let finalPromptInput = conversationText
      if (referenceImage) {
        finalPromptInput = `[用户上传了参考图片]\n${conversationText}`
      }

      const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          max_tokens: 300,
          temperature: 0.8,
          system: activeTemplate.generatePrompt,
          messages: [
            { role: 'user', content: finalPromptInput },
          ],
        }),
      })

      const data = await response.json()
      const prompt = data.content?.[0]?.text || ''

      if (prompt) {
        onPromptGenerated(prompt)
        onOpenChange(false)
        toast.success('提示词已生成')
      }
    } catch {
      toast.error('生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 重置对话框
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // 关闭时重置
      setMessages([])
      setInput('')
      setReferenceImage(null)
    } else {
      // 打开时初始化
      initConversation(selectedTemplate)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          智能提示词向导
        </DialogTitle>

        {/* Template Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">创作类型</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleTemplateChange(tpl.id)}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  selectedTemplate === tpl.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{tpl.icon}</span>
                  <span className="text-sm font-medium">{tpl.label}</span>
                </div>
                <p className="text-[11px] opacity-70">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Reference Image Upload */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">参考图（可选）</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {referenceImage ? (
            <div className="relative inline-block">
              <img
                src={referenceImage.url}
                alt="参考图"
                className="w-24 h-24 object-cover rounded-lg border border-white/10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full"
                onClick={clearReferenceImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-16 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">上传参考图</span>
              </div>
            </Button>
          )}
        </div>

        {/* Chat Area */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">对话描述</label>
          <ScrollArea className="h-[200px] rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary/20 text-foreground'
                        : 'bg-muted/50 text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-lg px-3 py-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Quick Templates */}
        <div className="flex gap-1.5 flex-wrap">
          {['主体', '风格', '构图', '光影', '效果'].map((label) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => {
                const questions: Record<string, string> = {
                  主体: '请描述您想要生成的主体内容是什么？',
                  风格: '您希望什么艺术风格？如写实、动漫、油画等',
                  构图: '请描述您期望的构图方式，如特写、全景等',
                  光影: '您希望什么样的光影效果？如逆光、柔光等',
                  效果: '您希望添加什么特殊效果？如景深、运动模糊等',
                }
                setInput(questions[label] || '')
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你的想法..."
            className="flex-1 min-h-[36px] max-h-[72px] resize-none bg-transparent border-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleGeneratePrompt}
              disabled={loading || messages.length < 2}
              title="生成最终提示词"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg">
          <span>当前：{activeTemplate.icon} {activeTemplate.label}</span>
          <span className="opacity-50">|</span>
          <span>对话后点击 ✨ 生成提示词</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
