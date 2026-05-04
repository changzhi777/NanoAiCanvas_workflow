'use client'

import { useState, useRef } from 'react'
import { Upload, Download, Loader2, Sparkles, Volume2, Play, Pause, FileText, FileJson, RefreshCw, Edit2, Check, X, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStoryboardWizardStore, type DialogueLine } from '@/stores/nanoImageStoryboardWizardStore'
import { cn } from '@/lib/utils'
import { showNotification, generateUniqueId } from '@/lib/utils/wizard-helpers'

// 情绪选项
const EMOTION_OPTIONS = [
  { value: 'neutral', label: '平静', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'happy', label: '开心', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'sad', label: '悲伤', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'angry', label: '愤怒', color: 'bg-red-500/20 text-red-400' },
  { value: 'surprised', label: '惊讶', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'fearful', label: '恐惧', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'calm', label: '冷静', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'excited', label: '兴奋', color: 'bg-pink-500/20 text-pink-400' },
]

// 语气选项
const TONE_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'whisper', label: '耳语' },
  { value: 'shout', label: '喊叫' },
  { value: 'gentle', label: '温柔' },
  { value: 'stern', label: '严厉' },
  { value: 'playful', label: '调皮' },
  { value: 'sarcastic', label: '讽刺' },
  { value: 'hesitant', label: '犹豫' },
  { value: 'confident', label: '自信' },
]

export function Step3Dialogue() {
  const {
    scriptData,
    dialogues,
    isGeneratingDialogues,
    setDialogues,
    setIsGeneratingDialogues,
    updateDialogue,
    nextStep,
  } = useStoryboardWizardStore()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<DialogueLine>>({})
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 从剧本生成对白列表
  const handleGenerateDialogues = async () => {
    if (!scriptData?.scenes?.length) {
      showNotification('请先生成剧本', 'error')
      return
    }

    setIsGeneratingDialogues(true)
    try {
      // 从所有场景中提取对白
      const allDialogues: DialogueLine[] = []

      scriptData.scenes.forEach((scene) => {
        if (scene.dialogues && scene.dialogues.length > 0) {
          scene.dialogues.forEach((d) => {
            allDialogues.push({
              characterId: d.characterId || '',
              characterName: d.characterName || '未知',
              text: d.text || '',
              emotion: d.emotion || 'neutral',
              emotionIntensity: d.emotionIntensity ?? 5,
              tone: d.tone || 'normal',
              speed: d.speed ?? 1.0,
              pause: d.pause ?? 0,
              stageDirection: d.stageDirection || '',
              audioUrl: undefined,
            })
          })
        }
      })

      // 也检查 allDialogues 字段
      if (scriptData.allDialogues && scriptData.allDialogues.length > 0) {
        setDialogues(scriptData.allDialogues)
        showNotification(`从剧本加载 ${scriptData.allDialogues.length} 条对白`, 'success')
      } else if (allDialogues.length > 0) {
        setDialogues(allDialogues)
        showNotification(`提取 ${allDialogues.length} 条对白`, 'success')
      } else {
        showNotification('剧本中没有对白数据', 'info')
      }
    } catch (error) {
      console.error('生成对白失败:', error)
      showNotification('生成对白失败', 'error')
    } finally {
      setIsGeneratingDialogues(false)
    }
  }

  // 生成单条对白的音频
  const handleGenerateAudio = async (index: number) => {
    const dialogue = dialogues[index]
    if (!dialogue) return

    try {
      // 动态导入 TTS API
      const { synthesizeSpeech } = await import('@/lib/api/glm-tts')
      const { useAuthStore } = await import('@/stores/remoteStore')
      const user = useAuthStore.getState().user

      if (!user?.textApiKey) {
        showNotification('请先配置智谱 API Key', 'error')
        return
      }

      showNotification('正在生成语音...', 'info')

      const audioBuffer = await synthesizeSpeech(
        user.textApiKey,
        dialogue.text,
        {
          voice: 'alloy', // 默认音色
          speed: dialogue.speed || 1.0,
          volume: 1.0,
          responseFormat: 'mp3',
        }
      )

      if (audioBuffer) {
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' })
        const audioUrl = URL.createObjectURL(audioBlob)

        updateDialogue(index, { audioUrl })
        showNotification('语音生成成功', 'success')
      } else {
        showNotification('语音生成失败', 'error')
      }
    } catch (error) {
      console.error('生成语音失败:', error)
      showNotification('语音生成失败', 'error')
    }
  }

  // 批量生成所有音频
  const handleGenerateAllAudio = async () => {
    if (dialogues.length === 0) {
      showNotification('没有对白可生成', 'error')
      return
    }

    showNotification(`开始生成 ${dialogues.length} 条语音...`, 'info')

    for (let i = 0; i < dialogues.length; i++) {
      if (!dialogues[i].audioUrl) {
        await handleGenerateAudio(i)
      }
    }

    showNotification('全部语音生成完成', 'success')
  }

  // 播放/暂停音频
  const handlePlayAudio = (index: number, audioUrl?: string) => {
    if (!audioUrl) return

    if (playingIndex === index && audioRef.current) {
      audioRef.current.pause()
      setPlayingIndex(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlayingIndex(null)
      audioRef.current.play()
      setPlayingIndex(index)
    }
  }

  // 开始编辑
  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditForm({ ...dialogues[index] })
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingIndex === null) return
    updateDialogue(editingIndex, editForm)
    setEditingIndex(null)
    setEditForm({})
    showNotification('已保存修改', 'success')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingIndex(null)
    setEditForm({})
  }

  // 导出为 JSON
  const handleExportJson = () => {
    if (dialogues.length === 0) {
      showNotification('没有对白可导出', 'error')
      return
    }

    const data = {
      dialogues: dialogues.map(({ audioUrl, ...rest }) => rest),
      exportedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dialogues_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已导出 JSON', 'success')
  }

  // 导出为 MD
  const handleExportMd = () => {
    if (dialogues.length === 0) {
      showNotification('没有对白可导出', 'error')
      return
    }

    let md = `# 对白列表\n\n导出时间：${new Date().toLocaleString()}\n\n`
    dialogues.forEach((d, i) => {
      md += `## ${i + 1}. ${d.characterName}\n\n`
      md += `**台词**：${d.text}\n\n`
      md += `- 情绪：${d.emotion || 'neutral'} (${d.emotionIntensity ?? 5}/10)\n`
      md += `- 语气：${d.tone || 'normal'}\n`
      md += `- 语速：${d.speed ?? 1.0}x\n`
      if (d.stageDirection) md += `- 舞台指示：${d.stageDirection}\n`
      md += '\n'
    })

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dialogues_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已导出 Markdown', 'success')
  }

  // 跳过 TTS 生成
  const handleSkipTTS = () => {
    showNotification('已跳过语音生成，进入下一步', 'info')
    nextStep()
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={dialogues.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5 mr-1.5" />
            导出 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMd}
            disabled={dialogues.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            导出 MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipTTS}
            className="h-8 border-slate-500/30 text-slate-300 hover:bg-slate-500/10"
            title="跳过语音生成，直接进入下一步"
          >
            <SkipForward className="w-3.5 h-3.5 mr-1.5" />
            跳过
          </Button>
        </div>
        <span className="text-xs text-slate-500">
          {dialogues.length > 0 ? `${dialogues.length} 条对白` : '等待生成'}
        </span>
      </div>

      {/* 从剧本加载按钮 */}
      <Button
        onClick={handleGenerateDialogues}
        disabled={isGeneratingDialogues || !scriptData?.scenes?.length}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        {isGeneratingDialogues ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            正在加载对白...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            从剧本加载对白
          </>
        )}
      </Button>

      {/* 批量生成语音 */}
      {dialogues.length > 0 && (
        <Button
          variant="outline"
          onClick={handleGenerateAllAudio}
          className="w-full border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
        >
          <Volume2 className="w-4 h-4 mr-2" />
          批量生成语音 ({dialogues.filter(d => !d.audioUrl).length} 条待生成)
        </Button>
      )}

      {/* 对白列表 */}
      {dialogues.length > 0 && (
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-2">
            {dialogues.map((dialogue, index) => (
              <div
                key={index}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all",
                  editingIndex === index
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                )}
              >
                {/* 头部 */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
                  <span className="text-xs text-slate-500">#{index + 1}</span>
                  <span className="text-sm font-medium text-slate-200">{dialogue.characterName}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded ml-auto",
                    EMOTION_OPTIONS.find(e => e.value === dialogue.emotion)?.color || 'bg-slate-500/20 text-slate-400'
                  )}>
                    {EMOTION_OPTIONS.find(e => e.value === dialogue.emotion)?.label || dialogue.emotion}
                  </span>
                </div>

                {/* 内容 */}
                {editingIndex === index ? (
                  <div className="p-3 space-y-2">
                    <Input
                      value={editForm.characterName || ''}
                      onChange={(e) => setEditForm({ ...editForm, characterName: e.target.value })}
                      placeholder="角色名"
                      className="h-8 text-sm bg-slate-800 border-slate-600"
                    />
                    <Textarea
                      value={editForm.text || ''}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      placeholder="对白内容"
                      className="min-h-[60px] text-sm bg-slate-800 border-slate-600 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">情绪</label>
                        <select
                          value={editForm.emotion || 'neutral'}
                          onChange={(e) => setEditForm({ ...editForm, emotion: e.target.value })}
                          className="w-full h-8 rounded bg-slate-800 border-slate-600 text-sm px-2"
                        >
                          {EMOTION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">语气</label>
                        <select
                          value={editForm.tone || 'normal'}
                          onChange={(e) => setEditForm({ ...editForm, tone: e.target.value })}
                          className="w-full h-8 rounded bg-slate-800 border-slate-600 text-sm px-2"
                        >
                          {TONE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
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
                    <p className="text-sm text-slate-300 mb-2">{dialogue.text}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>语气: {TONE_OPTIONS.find(t => t.value === dialogue.tone)?.label || dialogue.tone}</span>
                      <span>·</span>
                      <span>语速: {dialogue.speed}x</span>
                      {dialogue.stageDirection && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400 italic">{dialogue.stageDirection}</span>
                        </>
                      )}
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(index)}
                        className="h-7 text-xs hover:bg-purple-500/10 hover:text-purple-300"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateAudio(index)}
                        disabled={!!dialogue.audioUrl}
                        className="h-7 text-xs hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-50"
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        {dialogue.audioUrl ? '已生成' : '生成语音'}
                      </Button>
                      {dialogue.audioUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlayAudio(index, dialogue.audioUrl)}
                          className="h-7 text-xs hover:bg-green-500/10 hover:text-green-300"
                        >
                          {playingIndex === index ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              暂停
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              播放
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* 空状态 */}
      {dialogues.length === 0 && (
        <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center">
          <Volume2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400 mb-2">点击上方按钮从剧本加载对白</p>
          <p className="text-xs text-slate-500">支持编辑情绪、语气、语速等参数</p>
        </div>
      )}
    </div>
  )
}
