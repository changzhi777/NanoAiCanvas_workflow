'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { CharacterCard } from './CharacterCard'
import type { StoryboardCharacter, CharacterDesignImage } from '@/stores/nanoImageStoryboardStore'

interface CharactersTabProps {
  characters: StoryboardCharacter[]
  characterDesigns: CharacterDesignImage[]
  onDownloadImage?: (url: string, filename: string) => void
}

export function CharactersTab({
  characters,
  characterDesigns,
  onDownloadImage,
}: CharactersTabProps) {
  if (characters.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        暂无角色信息
      </div>
    )
  }

  // 获取角色的设计图
  const getDesignImageUrl = (characterId: string) => {
    return characterDesigns.find((d) => d.characterId === characterId)?.imageUrl
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-1">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            designImageUrl={getDesignImageUrl(character.id)}
            onDownload={onDownloadImage}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
