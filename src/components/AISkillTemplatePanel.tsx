'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Send, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

import {
  chatAnalyzeTemplate,
  getTemplates,
  getTemplateCategories,
  generateImage,
  getTaskStatus,
  type SkillChatResponse,
  type SkillTemplate,
  type TemplateCategory
} from '@/lib/api/ai-skill'

type PanelStep = 'chat' | 'template' | 'form' | 'preview' | 'generating'

export function AISkillTemplatePanel() {
  // Step management
  const [step, setStep] = useState<PanelStep>('chat')

  // Chat state
  const [userMessage, setUserMessage] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatResponse, setChatResponse] = useState<SkillChatResponse | null>(null)
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])

  // Templates state
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SkillTemplate | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [generatedPrompt, setGeneratedPrompt] = useState('')

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setIsLoadingTemplates(true)
    try {
      await getTemplateCategories()
      // Also load full templates for when user selects
      const fullData = await getTemplates()
      setCategories(fullData.categories)
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('加载模板失败')
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Analyze user message and recommend templates
  const handleAnalyze = async () => {
    if (!userMessage.trim()) {
      toast.error('请描述您想要创建的图像')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await chatAnalyzeTemplate({
        message: userMessage,
        chat_history: chatHistory,
        skill_id: 'gpt_image_2'
      })

      setChatResponse(response)
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])

      if (response.recommended_templates.length > 0 && !response.needs_more_info) {
        // Go directly to template selection
        setStep('template')
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('分析失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle template selection from recommended list
  const handleSelectRecommendedTemplate = async (templateId: string) => {
    // Find the full template data
    const allTemplates = categories.flatMap(c => c.templates)
    const template = allTemplates.find(t => t.id === templateId)

    if (template) {
      setSelectedTemplate(template)
      setStep('form')
    }
  }

  // Handle template selection from category browser
  const handleSelectTemplate = (template: SkillTemplate) => {
    setSelectedTemplate(template)
    setStep('form')
  }

  // Generate prompt preview
  const handleGeneratePreview = () => {
    if (!selectedTemplate) return

    // Build prompt from template and form data
    let prompt = selectedTemplate.prompt_template

    for (const [key, value] of Object.entries(formData)) {
      const placeholder = `{${key}}`
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(placeholder, value)
      }
    }

    // Clean up remaining placeholders
    prompt = prompt.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()

    setGeneratedPrompt(prompt)
    setStep('preview')
  }

  // Start image generation
  const handleStartGeneration = async () => {
    if (!selectedTemplate || !generatedPrompt) return

    setIsGenerating(true)
    setStep('generating')
    setGenerationProgress(0)

    try {
      const response = await generateImage({
        template_id: selectedTemplate.id,
        form_data: formData,
        skill_id: 'gpt_image_2',
        size: '1024x1024',
        quality: 'standard'
      })

      // Poll for status
      pollTaskStatus(response.task_id)
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('生成失败')
      setIsGenerating(false)
    }
  }

  // Poll task status
  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const status = await getTaskStatus(taskId)
        setGenerationProgress(status.progress)

        if (status.status === 'completed') {
          toast.success('图像生成成功!')
          setIsGenerating(false)
          // Dispatch event for other components
          window.dispatchEvent(new CustomEvent('image:generated', {
            detail: {
              images: status.result?.url ? [status.result.url] : [],
              prompt: generatedPrompt
            }
          }))
          // Reset and go back to chat
          setTimeout(() => {
            resetPanel()
          }, 2000)
        } else if (status.status === 'failed') {
          toast.error(`生成失败: ${status.error}`)
          setIsGenerating(false)
        } else {
          // Continue polling
          setTimeout(poll, 1000)
        }
      } catch (error) {
        console.error('Poll failed:', error)
        setTimeout(poll, 2000)
      }
    }

    poll()
  }

  // Reset panel
  const resetPanel = () => {
    setStep('chat')
    setUserMessage('')
    setChatResponse(null)
    setChatHistory([])
    setSelectedTemplate(null)
    setFormData({})
    setGeneratedPrompt('')
    setGenerationProgress(0)
  }

  // Go back to previous step
  const goBack = () => {
    switch (step) {
      case 'template':
        setStep('chat')
        break
      case 'form':
        setStep('template')
        setSelectedTemplate(null)
        break
      case 'preview':
        setStep('form')
        setGeneratedPrompt('')
        break
    }
  }

  return (
    <div className="h-full flex flex-col bg-card/60 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-4 py-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        <span className="font-medium">AI 作图</span>
        {step !== 'chat' && (
          <Button variant="ghost" size="sm" onClick={goBack} className="ml-auto">
            返回
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {/* Step 1: Chat Input */}
        {step === 'chat' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>描述您想要创建的图像，AI 将为您推荐合适的模板。</p>
            </div>

            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="例如：我想创建一个电商直播的截图，包含主播和商品展示..."
              className="min-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAnalyze()
                }
              }}
            />

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !userMessage.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>开始分析</span>
                </>
              )}
            </Button>

            {/* Quick examples */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">快捷示例:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '电商直播UI',
                  '品牌海报',
                  '角色设定稿',
                  '系统架构图',
                  '四格漫画'
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setUserMessage(`我想创建一个${example}`)}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {step === 'chat' && chatResponse && step === 'chat' && (
          <div className="space-y-4">
            {/* This section shows after analysis if needed */}
          </div>
        )}

        {/* Step 2: Template Selection (actual state) */}
        {step === 'template' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>推荐以下模板，请选择一个:</p>
            </div>

            {/* Recommended templates from chat analysis */}
            {chatResponse && chatResponse.recommended_templates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">AI 推荐</p>
                {chatResponse.recommended_templates.map((rec) => {
                  const allTemplates = categories.flatMap(c => c.templates)
                  const template = allTemplates.find(t => t.id === rec.template_id)
                  if (!template) return null

                  return (
                    <button
                      key={rec.template_id}
                      onClick={() => handleSelectRecommendedTemplate(rec.template_id)}
                      className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.reasoning}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-500">
                            {(rec.confidence * 100).toFixed(0)}% 匹配
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* All categories */}
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {category.name}
                    </p>
                    <div className="grid gap-2">
                      {category.templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Form */}
        {step === 'form' && selectedTemplate && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">{selectedTemplate.name}</p>
              <p className="text-muted-foreground mt-1">{selectedTemplate.description}</p>
            </div>

            <div className="space-y-4">
              {selectedTemplate.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.type === 'select' && field.options ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full px-3 py-2 bg-card/60 border border-white/10 rounded-lg text-sm"
                    >
                      <option value="">选择...</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.description}
                      className="min-h-[80px] resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.description}
                      className="w-full px-3 py-2 bg-card/60 border border-white/10 rounded-lg text-sm"
                    />
                  )}

                  {field.description && !field.required && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleGeneratePreview}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              生成提示词预览
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">提示词预览</p>
              <p className="text-muted-foreground mt-1">确认后开始生成图像</p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{generatedPrompt}</p>
            </div>

            <Button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>开始生成</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 5: Generating */}
        {step === 'generating' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
              <p className="text-lg font-medium">图像生成中...</p>
              <p className="text-sm text-muted-foreground mt-2">
                预计需要 30-60 秒
              </p>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {generationProgress}% 完成
            </p>
          </div>
        )}
      </div>
    </div>
  )
}