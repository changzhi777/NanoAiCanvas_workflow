'use client'

import { useState } from 'react'
import { Download, User, ChevronDown, ChevronUp, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StoryboardCharacter } from '@/stores/nanoImageStoryboardStore'
import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import { PRESET_VOICES } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CharacterCardProps {
  character: StoryboardCharacter
  designImageUrl?: string
  onDownload?: (url: string, filename: string) => void
}

const ROLE_LABELS = {
  protagonist: { label: '主角', color: 'bg-yellow-500/20 text-yellow-400' },
  supporting: { label: '配角', color: 'bg-blue-500/20 text-blue-400' },
  minor: { label: '龙套', color: 'bg-gray-500/20 text-gray-400' },
}

export function CharacterCard({ character, designImageUrl, onDownload }: CharacterCardProps) {
  const [expanded, setExpanded] = useState(false)

  const roleInfo = ROLE_LABELS[character.role] || ROLE_LABELS.minor

  // 音色管理
  const {
    globalVoice,
    characterVoices,
    clonedVoices,
    setCharacterVoice,
    removeCharacterVoice,
  } = useStoryboardVoiceStore()

  // 获取角色当前音色
  const getCharacterVoiceId = (): string => {
    const config = characterVoices.find(cv => cv.characterId === character.id)
    if (config?.voiceType === 'global' || !config) {
      return 'global'
    }
    return config.voiceId
  }

  // 获取音色名称（辅助函数）
  const getVoiceName = (voiceId: string): string => {
    if (voiceId === 'global') return '跟随全局'

    const preset = PRESET_VOICES.find(v => v.id === voiceId)
    if (preset) return preset.name

    const cloned = clonedVoices.find(v => v.id === voiceId)
    if (cloned) return `${cloned.name} (克隆)`

    return voiceId
  }

  const handleVoiceChange = (value: string) => {
    if (value === 'global' || value === null) {
      removeCharacterVoice(character.id)
    } else {
      const isPreset = PRESET_VOICES.some(v => v.id === value)
      setCharacterVoice(character.id, value, isPreset ? 'preset' : 'cloned')
    }
  }

  const currentVoice = getCharacterVoiceId()

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
      {/* 角色图 */}
      <div className="aspect-video bg-white/5 relative">
        {designImageUrl ? (
          <>
            <img
              src={designImageUrl}
              alt={`${character.name} 设计图`}
              className="w-full h-full object-cover"
            />
            {onDownload && (
              <button
                onClick={() => onDownload(designImageUrl, `character-${character.name}.png`)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded opacity-0 hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* 基本信息 */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-foreground">{character.name}</h3>
          <span className={`px-2 py-0.5 rounded text-xs ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>

        {character.description && (
          <p className="text-xs text-muted-foreground mb-2">{character.description}</p>
        )}

        {/* 展开按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              收起详情
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              查看详情
            </>
          )}
        </Button>

        {/* 详细信息 */}
        {expanded && (
          <div className="mt-2 space-y-2 text-xs border-t border-white/10 pt-2">
            {/* 外观 */}
            <div>
              <div className="text-foreground font-medium mb-1">外观特征</div>
              <div className="text-muted-foreground space-y-0.5">
                {character.appearance?.age && <div>年龄：{character.appearance.age}</div>}
                {character.appearance?.gender && <div>性别：{character.appearance.gender}</div>}
                {character.appearance?.height && <div>身高：{character.appearance.height}</div>}
                {character.appearance?.build && <div>体型：{character.appearance.build}</div>}
                {character.appearance?.hairColor && character.appearance?.hairStyle && (
                  <div>发型：{character.appearance.hairColor} {character.appearance.hairStyle}</div>
                )}
                {character.appearance?.eyeColor && <div>瞳色：{character.appearance.eyeColor}</div>}
                {character.appearance?.skinTone && <div>肤色：{character.appearance.skinTone}</div>}
                {character.appearance?.distinctiveFeatures && character.appearance.distinctiveFeatures.length > 0 && (
                  <div>特征：{character.appearance.distinctiveFeatures.join('、')}</div>
                )}
              </div>
            </div>

            {/* 服装 */}
            {character.costume && (
              <div>
                <div className="text-foreground font-medium mb-1">服装</div>
                <div className="text-muted-foreground space-y-0.5">
                  {character.costume.mainOutfit && <div>主要服装：{character.costume.mainOutfit}</div>}
                  {character.costume.accessories && character.costume.accessories.length > 0 && (
                    <div>配饰：{character.costume.accessories.join('、')}</div>
                  )}
                  {character.costume.colors && character.costume.colors.length > 0 && (
                    <div>主色调：{character.costume.colors.join('、')}</div>
                  )}
                </div>
              </div>
            )}

            {/* 性格 */}
            {character.personality && (
              <div>
                <div className="text-foreground font-medium mb-1">性格</div>
                <div className="text-muted-foreground space-y-0.5">
                  {character.personality.traits && character.personality.traits.length > 0 && (
                    <div>特点：{character.personality.traits.join('、')}</div>
                  )}
                  {character.personality.mannerisms && character.personality.mannerisms.length > 0 && (
                    <div>习惯：{character.personality.mannerisms.join('、')}</div>
                  )}
                  {character.personality.speakingStyle && (
                    <div>说话风格：{character.personality.speakingStyle}</div>
                  )}
                </div>
              </div>
            )}

            {/* 音色选择 */}
            <div>
              <div className="text-foreground font-medium mb-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                角色音色
              </div>
              <Select value={currentVoice} onValueChange={(v) => v && handleVoiceChange(v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* 跟随全局 */}
                  <SelectItem value="global">
                    <div className="flex items-center gap-2 text-xs">
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
                      <div className="flex items-center gap-2 text-xs">
                        <span>{voice.name}</span>
                        <span className="text-muted-foreground text-[10px]">{voice.description}</span>
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
                          <div className="flex items-center gap-2 text-xs">
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
          </div>
        )}
      </div>
    </div>
  )
}
