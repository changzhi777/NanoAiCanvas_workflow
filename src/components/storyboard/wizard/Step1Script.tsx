'use client'

import { useState } from 'react'
import { Upload, Loader2, Sparkles, FileText, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStoryboardWizardStore } from '@/stores/nanoImageStoryboardWizardStore'
import { cn } from '@/lib/utils'
import { showNotification } from '@/lib/utils/wizard-helpers'
import { parseJsonStoryboard, parseMarkdownStoryboard, parseMarkdownScript } from '@/lib/utils/file-parser'

// 复用主故事板的风格选项
const STYLE_OPTIONS = [
  { value: 'comic', label: '漫画', emoji: '🎨' },
  { value: 'anime', label: '日漫', emoji: '🌸' },
  { value: 'realistic', label: '写实', emoji: '📷' },
  { value: 'watercolor', label: '水彩', emoji: '💧' },
]

export function Step1Script() {
  const {
    inputText,
    selectedStyle,
    scriptData,
    isGeneratingScript,
    setInputText,
    setSelectedStyle,
    setScriptData,
    setIsGeneratingScript,
  } = useStoryboardWizardStore()

  const [localEditText, setLocalEditText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 导入剧本
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()

      if (file.name.endsWith('.json')) {
        const parsed = parseJsonStoryboard(content)
        if (parsed) {
          setScriptData(parsed)
          setLocalEditText(JSON.stringify(parsed, null, 2))
          showNotification(`成功导入剧本：${parsed.title}`, 'success')
        } else {
          showNotification('JSON 解析失败，请检查格式', 'error')
        }
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        // 尝试解析分镜头表格
        let parsed = parseMarkdownStoryboard(content)
        if (parsed && parsed.scenes.length > 0) {
          setScriptData(parsed)
          setLocalEditText(JSON.stringify(parsed, null, 2))
          showNotification(`成功导入分镜头：${parsed.title}`, 'success')
        } else {
          // 尝试解析剧本格式
          const script = parseMarkdownScript(content)
          if (script && script.scenes.length > 0) {
            const data = {
              title: script.title,
              synopsis: '',
              scenes: script.scenes.map((s, i) => ({
                id: i + 1,
                description: s.description,
                shotType: '中景',
                camera: '固定镜头',
                duration: '0:30',
                dialogues: s.dialogues.map(d => ({
                  characterId: '',
                  characterName: d.character,
                  text: d.line,
                })),
              })),
              characters: script.characters,
            }
            setScriptData(data)
            setLocalEditText(JSON.stringify(data, null, 2))
            showNotification(`成功导入剧本：${script.title}`, 'success')
          } else {
            showNotification('Markdown 解析失败，请检查格式', 'error')
          }
        }
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        showNotification('DOC/DOCX 格式暂不支持，请转换为 MD 或 JSON', 'error')
      } else {
        showNotification('不支持的文件格式，请使用 .md 或 .json', 'error')
      }
    } catch (error) {
      console.error('Import error:', error)
      showNotification('文件读取失败', 'error')
    }

    e.target.value = ''
  }

  // 导出剧本
  const handleExport = (format: 'json' | 'md') => {
    if (!scriptData) {
      showNotification('没有剧本数据可导出', 'error')
      return
    }

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(scriptData, null, 2)
      filename = `script_${scriptData.title}_${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      content = JSON.stringify(scriptData, null, 2) // 简化处理
      filename = `script_${scriptData.title}_${Date.now()}.md`
      mimeType = 'text/markdown'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showNotification(`已导出 ${format.toUpperCase()} 文件`, 'success')
  }

  // 生成剧本（调用 GLM API）
  const handleGenerateScript = async () => {
    if (!inputText.trim()) {
      showNotification('请输入故事文案', 'error')
      return
    }

    setIsGeneratingScript(true)
    try {
      // 动态导入 API
      const { generateStoryboardScript } = await import('@/lib/api/storyboard')
      const { useAuthStore } = await import('@/stores/remoteStore')
      const user = useAuthStore.getState().user

      if (!user?.textApiKey) {
        showNotification('请先配置智谱 API Key', 'error')
        return
      }

      const script = await generateStoryboardScript(user.textApiKey, inputText, (progress) => {
        console.log('Progress:', progress)
      })

      setScriptData(script)
      setLocalEditText(JSON.stringify(script, null, 2))
      showNotification('剧本生成成功！', 'success')
    } catch (error) {
      console.error('生成剧本失败:', error)
      showNotification(error instanceof Error ? error.message : '生成剧本失败', 'error')
    } finally {
      setIsGeneratingScript(false)
    }
  }

  // 保存编辑
  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(localEditText)
      setScriptData(parsed)
      showNotification('修改已保存', 'success')
    } catch {
      showNotification('JSON 格式错误，请检查', 'error')
    }
  }

  // 同步剧本到编辑区
  const syncScriptToEdit = () => {
    if (scriptData) {
      setLocalEditText(JSON.stringify(scriptData, null, 2))
      showNotification('已同步', 'info')
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            导入
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('md')}
            disabled={!scriptData}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileType className="w-3.5 h-3.5 mr-1.5" />
            导出 MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={!scriptData}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5 mr-1.5" />
            导出 JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.json,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <span className="text-xs text-slate-500">支持 MD / JSON</span>
      </div>

      {/* 输入区域 */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">故事文案</label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入故事文案，描述你想要生成的故事内容..."
            className="min-h-[100px] bg-slate-800/50 border-slate-700 focus:border-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">选择风格</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  selectedStyle === style.value
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                )}
              >
                <span className="mr-1">{style.emoji}</span>
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerateScript}
          disabled={isGeneratingScript || !inputText.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          {isGeneratingScript ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              正在生成剧本...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成剧本
            </>
          )}
        </Button>
      </div>

      {/* 剧本预览/编辑区 */}
      {scriptData && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <FileText className="w-4 h-4" />
              <span>{scriptData.title}</span>
              <span className="text-slate-500 text-xs">({scriptData.scenes?.length || 0} 场景)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={syncScriptToEdit}
              className="h-6 text-xs text-purple-400 hover:text-purple-300"
            >
              同步
            </Button>
          </div>
          <Textarea
            value={localEditText}
            onChange={(e) => setLocalEditText(e.target.value)}
            className="min-h-[200px] bg-transparent border-0 rounded-md font-mono text-xs focus-visible:ring-0 resize-none"
            placeholder="剧本内容将显示在这里..."
          />
          <div className="flex justify-end px-3 py-2 bg-slate-800/30 border-t border-slate-700">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="h-7 bg-purple-500/80 hover:bg-purple-500 text-xs"
            >
              保存修改
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
