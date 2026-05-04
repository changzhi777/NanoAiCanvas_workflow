'use client'

import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import { PRESET_VOICES } from '@/types'
import type { StoryboardCharacter } from '@/stores/nanoImageStoryboardStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CharacterVoiceMappingProps {
  characters: StoryboardCharacter[]
}

export function CharacterVoiceMapping({ characters }: CharacterVoiceMappingProps) {
  const {
    globalVoice,
    characterVoices,
    clonedVoices,
    setCharacterVoice,
    removeCharacterVoice,
  } = useStoryboardVoiceStore()

  // 获取角色的实际音色
  const getCharacterVoiceId = (characterId: string): string => {
    const config = characterVoices.find(cv => cv.characterId === characterId)
    if (config?.voiceType === 'global' || !config) {
      return 'global'
    }
    return config.voiceId
  }

  // 获取音色名称
  const getVoiceName = (voiceId: string): string => {
    if (voiceId === 'global') return '跟随全局'

    const preset = PRESET_VOICES.find(v => v.id === voiceId)
    if (preset) return preset.name

    const cloned = clonedVoices.find(v => v.id === voiceId)
    if (cloned) return `${cloned.name} (克隆)`

    return voiceId
  }

  const handleVoiceChange = (characterId: string, value: string) => {
    if (value === 'global' || value === null) {
      removeCharacterVoice(characterId)
    } else {
      // 判断是预设还是克隆
      const isPreset = PRESET_VOICES.some(v => v.id === value)
      setCharacterVoice(characterId, value, isPreset ? 'preset' : 'cloned')
    }
  }

  if (characters.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-center text-muted-foreground text-xs">
        暂无角色数据
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <span className="text-purple-400">●</span>
        角色音色映射
      </h3>

      <div className="text-xs text-muted-foreground mb-2">
        为每个角色单独指定音色，未设置的将使用全局默认音色
      </div>

      <div className="space-y-2">
        {characters.map((character) => {
          const currentVoice = getCharacterVoiceId(character.id)

          return (
            <div
              key={character.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
            >
              {/* 角色信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-xs truncate">
                    {character.name}
                  </span>
                  <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-muted-foreground">
                    {character.role === 'protagonist' ? '主角' :
                     character.role === 'supporting' ? '配角' : '龙套'}
                  </span>
                </div>
                {character.description && (
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {character.description}
                  </div>
                )}
              </div>

              {/* 音色选择 */}
              <Select
                value={currentVoice}
                onValueChange={(v) => v && handleVoiceChange(character.id, v)}
              >
                <SelectTrigger className="w-[140px] h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* 跟随全局 */}
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">跟随全局</span>
                      <span className="text-[10px] text-muted-foreground">({getVoiceName(globalVoice)})</span>
                    </div>
                  </SelectItem>

                  {/* 分隔线 */}
                  <div className="border-t my-1" />

                  {/* 预设音色 */}
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">预设音色</div>
                  {PRESET_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                      </div>
                    </SelectItem>
                  ))}

                  {/* 克隆音色 */}
                  {clonedVoices.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t mt-1 pt-1">
                        克隆音色
                      </div>
                      {clonedVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <span className="text-muted-foreground text-[10px]">自定义</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
