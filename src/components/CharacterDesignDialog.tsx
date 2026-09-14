'use client'

import { useState, useCallback, useRef } from 'react'
import { User, X, Loader2, Sparkles, ImagePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCharacterDesignStore } from '@/stores/nanoImageCharacterDesignStore'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// 模板定义
// ---------------------------------------------------------------------------

interface TemplateConfig {
  id: string
  label: string
  description: string
  ratio: string
  buildPrompt: (description: string) => string
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: '3:2',
    label: '3:2 横屏',
    description: '5 个视角，经典角色设定集',
    ratio: '3:2',
    buildPrompt: (desc) =>
      `3:2横屏角色设计图,展示同一角色的多个视角。
角色描述：${desc}
包含以下5个视角：
1. 正面全身视图
2. 侧面全身视图
3. 背面全身视图
4. 3/4角度视图
5. 头部特写（展示表情细节）

排版要求：
- 上排3个视角（正面、侧面、背面），下排2个视角（3/4角度、头部特写）
- 角色比例统一，各视角大小一致
- 背景简洁干净（白色或浅灰）
- 标注各视角名称（正面/侧面/背面/3/4角度/头部特写）
- 保持颜色、服装、配饰的一致性
- 高质量，细节丰富，专业角色设定集风格
high quality, detailed, character design sheet, turnaround, reference sheet, multiple views, 5 views, professional`,
  },
  {
    id: '16:9',
    label: '16:9 横屏',
    description: '5 个视角，宽屏电影感排版',
    ratio: '16:9',
    buildPrompt: (desc) =>
      `16:9宽屏横版角色设计图,展示同一角色的多个视角。
角色描述：${desc}
包含以下5个视角,采用横向一字排列：
1. 正面全身视图（居中,略大）
2. 左侧3/4角度视图（左侧）
3. 右侧3/4角度视图（右侧）
4. 背面全身视图（左外侧）
5. 头部表情特写（右外侧）

排版要求：
- 5个视角沿水平方向均匀排列,正面居中突出
- 充分利用16:9宽屏空间,横向展开布局
- 角色比例统一,正面视图可略大于其他视角
- 背景简洁干净（白色或浅灰）,各视角间以细线分隔
- 标注各视角名称
- 保持颜色、服装、配饰的一致性
- 高质量,细节丰富,专业角色设定集风格
high quality, detailed, character design sheet, turnaround, reference sheet, multiple views, 5 views horizontal layout, widescreen, cinematic, professional`,
  },
  {
    id: '16:9-face',
    label: '16:9 表情特写',
    description: '4 视角 + 4 表情正脸',
    ratio: '16:9',
    buildPrompt: (desc) =>
      `16:9横版角色表情特写设计图,展示同一角色的多角度表情。
角色描述：${desc}
左部分: 4个视角的站立人物（采用横向排列）
1. 正面人物站立
2. 左侧面人物站立
3. 3/4角度人物站立
4. 仰视/俯视人物站立
右部分: 4种表情变化的正脸特写（采用1x4网格排列）
1. 微笑表情正脸特写
2. 严肃表情正脸特写
3. 惊讶表情正脸特写
4. 悲伤表情正脸特写
排版要求:
- 左半部分4个视角横向均匀排列
- 右半部分4个表情采用1x4网格排列
- 所有脸部特写比例统一,大小一致
- 背景简洁干净（白色或浅灰）
- 标注各视角名称和表情名称
- 保持角色面部特征的一致性（眼睛颜色、发型、配饰等）
- 重点展示表情变化和面部细节
- 高质量,细节丰富,专业角色设定集风格
high quality, detailed, character design sheet, facial expressions, face close-up, multiple views, emotional variations, professional`,
  },
  {
    id: '16:9-sketch',
    label: '16:9 线稿特写',
    description: '4 视角 + 4 特性线稿',
    ratio: '16:9',
    buildPrompt: (desc) =>
      `16:9横版角色线稿特性设计图,展示同一角色的线稿绘制细节。
角色描述：${desc}
左半部分: 4个视角的角色线稿（采用横向排列）
1. 正面全身线稿
2. 侧面全身线稿
3. 背面全身线稿
4. 3/4角度线稿
右半部分: 4种脸部特性线稿（采用1x4网格排列）
1. 眼睛特性线稿（展示眼睛形状、瞳孔细节、睫毛等）
2. 发型特性线稿（展示发型轮廓、发丝走向、发饰等）
3. 嘴巴特性线稿（展示嘴唇形状、牙齿细节等）
4. 配饰特性线稿（展示眼镜、耳环、项链等配饰细节）
排版要求:
- 左半部分4个视角横向均匀排列
- 右半部分4个特性采用1x4网格排列
- 纯黑白线稿风格,线条清晰
- 背景纯白
- 标注各视角名称和特性名称
- 重点展示结构细节和绘制技法
- 高质量,细节丰富,专业角色设定集风格
high quality, detailed, character design sheet, black and white line art, sketch, multiple views, structural details, professional`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CharacterDesignDialogProps {
  onGenerate: (prompt: string, ratio?: string) => void
}

export function CharacterDesignDialog({ onGenerate }: CharacterDesignDialogProps) {
  const { isDialogOpen, closeDialog, referenceImage, setReferenceImage, clearReferenceImage } =
    useCharacterDesignStore()

  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('3:2')
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const url = URL.createObjectURL(file)
      setReferenceImage({
        id: crypto.randomUUID(),
        url,
        file,
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [setReferenceImage],
  )

  const handleGenerate = useCallback(() => {
    if (!description.trim()) {
      toast.error('请输入角色描述')
      return
    }

    setIsGenerating(true)

    try {
      const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0]
      let prompt = template.buildPrompt(description.trim())

      if (referenceImage) {
        prompt = `参考提供的角色图片，严格保持角色外观一致性。\n\n${prompt}`
      }

      onGenerate(prompt, template.ratio)
      closeDialog()
      setDescription('')
      clearReferenceImage()
      toast.success('角色设计提示词已生成')
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [description, selectedTemplate, referenceImage, onGenerate, closeDialog, clearReferenceImage])

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0]

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-lg bg-card/60 border-white/10 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          角色设计图生成器
        </DialogTitle>

        {/* Template Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">模板选择</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedTemplate === tpl.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {/* 比例示意条 */}
                  <div
                    className={`rounded-md border border-current/30 ${
                      tpl.id === '3:2'
                        ? 'w-8 h-[21px]'
                        : 'w-10 h-[18px]'
                    }`}
                  />
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
                alt="角色参考图"
                className="w-32 h-32 object-cover rounded-lg border border-white/10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full"
                onClick={clearReferenceImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">上传角色参考图</span>
              </div>
            </Button>
          )}
        </div>

        {/* Character Description */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">角色描述</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`描述角色的外观、服装、配饰等特征...\n\n例如：一个穿着蓝色校服的少女，短发，戴红色发夹`}
            rows={5}
            className="bg-transparent border-input"
          />
        </div>

        {/* Info note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg">
          <span>当前模板：{activeTemplate.label}，{activeTemplate.description}</span>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成提示词
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
