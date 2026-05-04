'use client'

import { useState } from 'react'
import { Download, Loader2, Sparkles, User, RefreshCw, Edit2, Check, X, FileText, FileJson, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStoryboardWizardStore, type CharacterPrompt } from '@/stores/nanoImageStoryboardWizardStore'
import { cn } from '@/lib/utils'
import { showNotification, generateUniqueId } from '@/lib/utils/wizard-helpers'

// 角色类型标签
const ROLE_LABELS = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  minor: '龙套',
}

// 角色类型颜色
const ROLE_COLORS = {
  protagonist: 'bg-yellow-500/20 text-yellow-400',
  antagonist: 'bg-red-500/20 text-red-400',
  supporting: 'bg-blue-500/20 text-blue-400',
  minor: 'bg-slate-500/20 text-slate-400',
}

// 风格选项
const STYLE_OPTIONS = [
  { value: 'comic', label: '漫画' },
  { value: 'anime', label: '日漫' },
  { value: 'realistic', label: '写实' },
  { value: 'watercolor', label: '水彩' },
]

export function Step4Character() {
  const {
    scriptData,
    characterPrompts,
    isGeneratingCharacters,
    setCharacterPrompts,
    setIsGeneratingCharacters,
    updateCharacterPrompt,
    generateCharacterPrompts,
    downloadCharacterTemplate,
  } = useStoryboardWizardStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CharacterPrompt>>({})

  // 生成角色提示词
  const handleGeneratePrompts = async () => {
    if (!scriptData?.characters?.length) {
      showNotification('请先生成包含角色的剧本', 'error')
      return
    }

    setIsGeneratingCharacters(true)
    try {
      await generateCharacterPrompts()
      showNotification(`成功生成 ${scriptData.characters.length} 个角色提示词`, 'success')
    } catch (error) {
      console.error('生成角色提示词失败:', error)
      showNotification('生成失败', 'error')
    } finally {
      setIsGeneratingCharacters(false)
    }
  }

  // 开始编辑
  const startEdit = (id: string) => {
    const prompt = characterPrompts.find(p => p.id === id)
    if (prompt) {
      setEditingId(id)
      setEditForm({ ...prompt })
    }
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editingId) return
    updateCharacterPrompt(editingId, editForm)
    setEditingId(null)
    setEditForm({})
    showNotification('已保存修改', 'success')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  // 导出为 JSON
  const handleExportJson = () => {
    if (characterPrompts.length === 0) {
      showNotification('没有提示词可导出', 'error')
      return
    }

    const data = {
      characterPrompts,
      exportedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `character_prompts_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已导出 JSON', 'success')
  }

  // 导出为 MD
  const handleExportMd = () => {
    if (characterPrompts.length === 0) {
      showNotification('没有提示词可导出', 'error')
      return
    }

    let md = `# 角色设计提示词\n\n导出时间：${new Date().toLocaleString()}\n\n`
    characterPrompts.forEach((p) => {
      md += `## ${p.characterName}\n\n`
      md += `### 正向提示词\n\n\`\`\`\n${p.prompt}\n\`\`\`\n\n`
      if (p.negativePrompt) {
        md += `### 负向提示词\n\n\`\`\`\n${p.negativePrompt}\n\`\`\`\n\n`
      }
      md += `---\n\n`
    })

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `character_prompts_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已导出 Markdown', 'success')
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    const template = downloadCharacterTemplate()
    const blob = new Blob([template], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `character_template.md`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已下载模板', 'success')
  }

  // 复制提示词
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    showNotification('已复制到剪贴板', 'success')
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            下载模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={characterPrompts.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5 mr-1.5" />
            导出 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMd}
            disabled={characterPrompts.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            导出 MD
          </Button>
        </div>
        <span className="text-xs text-slate-500">
          {characterPrompts.length > 0 ? `${characterPrompts.length} 个角色` : '等待生成'}
        </span>
      </div>

      {/* 剧本角色摘要 */}
      {scriptData?.characters && scriptData.characters.length > 0 && (
        <details className="border border-slate-700 rounded-lg" open>
          <summary className="px-3 py-2 cursor-pointer text-sm text-slate-300 hover:text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4" />
            剧本角色 ({scriptData.characters.length})
          </summary>
          <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-700 space-y-1">
            {scriptData.characters.map((char) => (
              <div key={char.id} className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  ROLE_COLORS[char.role]
                )}>
                  {ROLE_LABELS[char.role]}
                </span>
                <span className="text-slate-300">{char.name}</span>
                <span className="text-slate-500 truncate flex-1">{char.description}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 生成按钮 */}
      <Button
        onClick={handleGeneratePrompts}
        disabled={isGeneratingCharacters || !scriptData?.characters?.length}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        {isGeneratingCharacters ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            正在生成提示词...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            生成角色提示词
          </>
        )}
      </Button>

      {/* 角色提示词列表 */}
      {characterPrompts.length > 0 && (
        <ScrollArea className="h-[240px]">
          <div className="space-y-3 pr-2">
            {characterPrompts.map((prompt) => {
              const character = scriptData?.characters?.find(c => c.id === prompt.characterId)

              return (
                <div
                  key={prompt.id}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all",
                    editingId === prompt.id
                      ? "border-purple-500 bg-purple-500/5"
                      : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                  )}
                >
                  {/* 头部 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{prompt.characterName}</span>
                        {character && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            ROLE_COLORS[character.role]
                          )}>
                            {ROLE_LABELS[character.role]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{prompt.style}</span>
                  </div>

                  {/* 编辑模式 */}
                  {editingId === prompt.id ? (
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">正向提示词</label>
                        <Textarea
                          value={editForm.prompt || ''}
                          onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                          className="min-h-[80px] text-xs bg-slate-800 border-slate-600 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">负向提示词</label>
                        <Textarea
                          value={editForm.negativePrompt || ''}
                          onChange={(e) => setEditForm({ ...editForm, negativePrompt: e.target.value })}
                          className="min-h-[40px] text-xs bg-slate-800 border-slate-600 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="flex-1 h-7 text-xs bg-green-500 hover:bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="flex-1 h-7 text-xs">
                          <X className="w-3 h-3 mr-1" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      {/* 提示词预览 */}
                      <div className="mb-2">
                        <label className="text-xs text-slate-500 mb-1 block">正向提示词</label>
                        <p className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded line-clamp-3 font-mono">
                          {prompt.prompt}
                        </p>
                      </div>
                      {prompt.negativePrompt && (
                        <div className="mb-2">
                          <label className="text-xs text-slate-500 mb-1 block">负向提示词</label>
                          <p className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded line-clamp-2 font-mono">
                            {prompt.negativePrompt}
                          </p>
                        </div>
                      )}
                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(prompt.id)}
                          className="h-7 text-xs hover:bg-purple-500/10 hover:text-purple-300"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyPrompt(prompt.prompt)}
                          className="h-7 text-xs hover:bg-cyan-500/10 hover:text-cyan-300"
                        >
                          复制
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* 空状态 */}
      {characterPrompts.length === 0 && (
        <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400 mb-2">点击上方按钮生成角色设计提示词</p>
          <p className="text-xs text-slate-500">可导出为 JSON / Markdown 格式用于 AI 绘图</p>
        </div>
      )}
    </div>
  )
}
