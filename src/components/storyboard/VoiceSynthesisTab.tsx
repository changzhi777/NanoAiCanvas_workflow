'use client'

import { useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Volume2,
  Loader2,
  Play,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import type { StoryboardScript } from '@/stores/nanoImageStoryboardStore'
import { GlobalVoiceSettings } from './GlobalVoiceSettings'
import { CharacterVoiceMapping } from './CharacterVoiceMapping'
import { VoiceClonePanel } from './VoiceClonePanel'
import { ClonedVoiceList } from './ClonedVoiceList'
import { DialogueAudioList } from './DialogueAudioList'

interface VoiceSynthesisTabProps {
  script: StoryboardScript | null
  apiKey: string
}

export function VoiceSynthesisTab({ script, apiKey }: VoiceSynthesisTabProps) {
  const [activeSection, setActiveSection] = useState<'settings' | 'clone' | 'audio'>('settings')

  const {
    isGenerating,
    generateProgress,
    generateTotal,
    generateError,
    dialogueAudios,
    generateAllAudios,
    clearDialogueAudios,
  } = useStoryboardVoiceStore()

  // 收集所有对白
  const getAllDialogues = useCallback(() => {
    if (!script) return []

    const dialogues: Array<{
      id: string
      sceneId: number
      text: string
      characterId: string
      characterName: string
    }> = []

    script.scenes.forEach((scene) => {
      scene.dialogues.forEach((d, idx) => {
        dialogues.push({
          id: `${scene.id}_${idx}`,
          sceneId: scene.id,
          text: d.text,
          characterId: d.characterId,
          characterName: d.characterName,
        })
      })
    })

    return dialogues
  }, [script])

  // 生成所有音频
  const handleGenerateAll = useCallback(async () => {
    if (!apiKey) {
      toast.error('请先配置智谱 API Key')
      return
    }

    const dialogues = getAllDialogues()
    if (dialogues.length === 0) {
      toast.error('没有对白需要生成')
      return
    }

    try {
      await generateAllAudios(apiKey, dialogues)
      toast.success(`已生成 ${dialogueAudios.length} 条音频`)
    } catch (error: any) {
      toast.error(error.message || '生成失败')
    }
  }, [apiKey, getAllDialogues, generateAllAudios, dialogueAudios.length])

  // 清空音频
  const handleClearAll = useCallback(() => {
    clearDialogueAudios()
    toast.info('已清空所有音频')
  }, [clearDialogueAudios])

  if (!script) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">请先生成分镜头脚本</p>
        </div>
      </div>
    )
  }

  const dialogues = getAllDialogues()

  return (
    <div className="h-full flex flex-col">
      {/* Section 切换 */}
      <div className="flex items-center gap-1 p-2 border-b border-white/10 flex-shrink-0">
        <Button
          variant={activeSection === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('settings')}
        >
          全局设置
        </Button>
        <Button
          variant={activeSection === 'clone' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('clone')}
        >
          音色克隆
        </Button>
        <Button
          variant={activeSection === 'audio' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('audio')}
          className="relative"
        >
          音频列表
          {dialogueAudios.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
              {dialogueAudios.length}
            </span>
          )}
        </Button>
      </div>

      {/* 内容区 */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {activeSection === 'settings' && (
            <div className="space-y-4">
              <GlobalVoiceSettings />
              <CharacterVoiceMapping
                characters={script.characters}
              />
            </div>
          )}

          {activeSection === 'clone' && (
            <div className="space-y-4">
              <VoiceClonePanel apiKey={apiKey} />
              <ClonedVoiceList />
            </div>
          )}

          {activeSection === 'audio' && (
            <div className="space-y-4">
              {/* 生成控制 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="text-xs text-muted-foreground">
                  共 {dialogues.length} 条对白，已生成 {dialogueAudios.length} 条音频
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={dialogueAudios.length === 0 || isGenerating}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGenerateAll}
                    disabled={isGenerating || dialogues.length === 0}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        {generateProgress}/{generateTotal}
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        生成全部音频
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 进度条 */}
              {isGenerating && (
                <div className="space-y-1">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${(generateProgress / generateTotal) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-muted-foreground">
                    正在生成... {generateProgress}/{generateTotal}
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {generateError && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {generateError}
                </div>
              )}

              {/* 音频列表 */}
              <DialogueAudioList
                dialogues={dialogues}
                scenes={script.scenes}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
