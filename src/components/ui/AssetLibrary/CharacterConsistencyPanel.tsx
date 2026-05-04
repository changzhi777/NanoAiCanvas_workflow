'use client'

import { useState } from 'react'
import { Users, Plus, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CharacterRef {
  id: string
  name: string
  imageUrl: string
  traits: string[]
}

interface CharacterConsistencyPanelProps {
  characterRefs: CharacterRef[]
  onCharacterRefsChange: (refs: CharacterRef[]) => void
  maxCharacters?: number
}

const PRESET_TRAITS = [
  '发型', '发色', '瞳色', '脸型', '服装风格', '配饰', '身高', '体型', '肤色', '表情'
]

export function CharacterConsistencyPanel({
  characterRefs,
  onCharacterRefsChange,
  maxCharacters = 5,
}: CharacterConsistencyPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)

  const addCharacter = () => {
    if (!newCharacterName.trim()) return
    if (characterRefs.length >= maxCharacters) return

    const newChar: CharacterRef = {
      id: `char-${Date.now()}`,
      name: newCharacterName.trim(),
      imageUrl: '',
      traits: [],
    }

    onCharacterRefsChange([...characterRefs, newChar])
    setNewCharacterName('')
    setSelectedCharacterId(newChar.id)
  }

  const removeCharacter = (id: string) => {
    onCharacterRefsChange(characterRefs.filter(c => c.id !== id))
    if (selectedCharacterId === id) {
      setSelectedCharacterId(null)
    }
  }

  const toggleTrait = (characterId: string, trait: string) => {
    onCharacterRefsChange(
      characterRefs.map(c => {
        if (c.id !== characterId) return c
        const newTraits = c.traits.includes(trait)
          ? c.traits.filter(t => t !== trait)
          : [...c.traits, trait]
        return { ...c, traits: newTraits }
      })
    )
  }

  const selectedCharacter = characterRefs.find(c => c.id === selectedCharacterId)

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="w-3 h-3" />
        角色一致性
        <span className="text-[10px] text-muted-foreground/60">（{characterRefs.length}/{maxCharacters}）</span>
      </label>

      {/* 角色列表 */}
      {characterRefs.length > 0 && (
        <div className="space-y-2 p-2 bg-black/20 rounded">
          {characterRefs.map(char => (
            <div
              key={char.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer",
                selectedCharacterId === char.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              )}
              onClick={() => setSelectedCharacterId(char.id)}
            >
              {/* 角色头像 */}
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {char.imageUrl ? (
                  <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* 角色名 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{char.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {char.traits.length > 0 ? char.traits.join(', ') : '未设置特征'}
                </div>
              </div>

              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeCharacter(char.id)
                }}
                className="p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 添加角色 */}
      <div className="flex gap-1">
        <Input
          placeholder="角色名称..."
          value={newCharacterName}
          onChange={(e) => setNewCharacterName(e.target.value)}
          className="h-8 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCharacter()
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={addCharacter}
          disabled={!newCharacterName.trim() || characterRefs.length >= maxCharacters}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* 特征选择（展开后） */}
      {selectedCharacter && (
        <div className="p-3 bg-card rounded-lg border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{selectedCharacter.name} - 特征配置</span>
            <button
              onClick={() => setSelectedCharacterId(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              收起
            </button>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">选择保持一致的特征</label>
            <div className="flex flex-wrap gap-1">
              {PRESET_TRAITS.map(trait => (
                <button
                  key={trait}
                  onClick={() => toggleTrait(selectedCharacter.id, trait)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] transition-colors",
                    selectedCharacter.traits.includes(trait)
                      ? "bg-primary/30 text-primary border border-primary/50"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent"
                  )}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
            💡 选择特征后，后续生成的角色图片将保持这些特征的一致性
          </div>
        </div>
      )}

      {/* 展开按钮 */}
      {!isOpen && characterRefs.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setIsOpen(true)}
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          配置角色特征
        </Button>
      )}
    </div>
  )
}

export default CharacterConsistencyPanel