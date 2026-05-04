'use client'

import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DialogueItem } from './DialogueItem'
import type { StoryboardScene, StoryboardCharacter, CharacterDesignImage, DialogueLine } from '@/stores/nanoImageStoryboardStore'

interface DialoguesTabProps {
  scenes: StoryboardScene[]
  characters: StoryboardCharacter[]
  characterDesigns: CharacterDesignImage[]
}

export function DialoguesTab({ scenes, characters, characterDesigns }: DialoguesTabProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [groupByScene, setGroupByScene] = useState(true)

  // 获取角色的设计图
  const getCharacterAvatar = (characterId: string) => {
    return characterDesigns.find((d) => d.characterId === characterId)?.imageUrl
  }

  // 按场景分组
  const groupedDialogues = useMemo(() => {
    return scenes.map((scene, index) => ({
      sceneNumber: index + 1,
      scene,
      dialogues: scene.dialogues,
    }))
  }, [scenes])

  // 所有对白（用于按角色筛选）
  const allDialogues = useMemo(() => {
    const result: Array<{ dialogue: DialogueLine; sceneNumber: number }> = []
    scenes.forEach((scene, sceneIndex) => {
      scene.dialogues.forEach((dialogue) => {
        result.push({ dialogue, sceneNumber: sceneIndex + 1 })
      })
    })
    return result
  }, [scenes])

  // 筛选后的对白
  const filteredDialogues = useMemo(() => {
    if (!selectedCharacter) return allDialogues
    return allDialogues.filter((d) => d.dialogue.characterId === selectedCharacter)
  }, [allDialogues, selectedCharacter])

  // 统计各角色对白数量
  const characterDialogueCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allDialogues.forEach((d) => {
      counts[d.dialogue.characterId] = (counts[d.dialogue.characterId] || 0) + 1
    })
    return counts
  }, [allDialogues])

  if (scenes.every((s) => s.dialogues.length === 0)) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        暂无对白信息
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-white/10 flex-shrink-0">
        {/* 视图切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByScene(true)}
            className={`px-2 py-1 rounded text-xs ${
              groupByScene
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            按场景
          </button>
          <button
            onClick={() => setGroupByScene(false)}
            className={`px-2 py-1 rounded text-xs ${
              !groupByScene
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            按时间线
          </button>
        </div>

        {/* 角色筛选 */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedCharacter(null)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
              selectedCharacter === null
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            全部 ({allDialogues.length})
          </button>
          {characters.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCharacter(c.id)}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                selectedCharacter === c.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-white/5'
              }`}
            >
              {c.name} ({characterDialogueCounts[c.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* 对白列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {groupByScene ? (
            // 按场景分组显示
            groupedDialogues.map(({ sceneNumber, scene, dialogues }) => (
              <div key={scene.id} className="space-y-1">
                {/* 场景标题 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                  <span className="font-medium text-primary">镜头 {sceneNumber}</span>
                  <span>{scene.shotType}</span>
                  <span>{scene.duration}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="text-muted-foreground/70">{scene.description.substring(0, 40)}...</span>
                </div>

                {/* 该场景的对白 */}
                {dialogues.map((dialogue, i) => (
                  <DialogueItem
                    key={`${scene.id}-${i}`}
                    dialogue={dialogue}
                    characterAvatar={getCharacterAvatar(dialogue.characterId)}
                  />
                ))}
              </div>
            ))
          ) : (
            // 按时间线显示
            filteredDialogues.map(({ dialogue, sceneNumber }, i) => (
              <DialogueItem
                key={`${dialogue.characterId}-${i}`}
                dialogue={dialogue}
                characterAvatar={getCharacterAvatar(dialogue.characterId)}
                showScene
                sceneNumber={sceneNumber}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
