/**
 * Raw JSON input types for untrusted parsed data (JSON.parse results)
 * Used by file-parser.ts and storyboard.ts for normalization
 */

export interface RawJsonDialogue {
  characterId?: string; characterName?: string; text?: string
  emotion?: string; emotionIntensity?: number; tone?: string
  speed?: number; pause?: number; stageDirection?: string
}

export interface RawJsonScene {
  id?: number; shotType?: string; duration?: string
  description?: string; camera?: string; dialogues?: RawJsonDialogue[]
  narrator?: string; imageUrl?: string
}

export interface RawJsonAppearance {
  age?: string; gender?: string; height?: string; build?: string
  hairColor?: string; hairStyle?: string; eyeColor?: string; skinTone?: string
  distinctiveFeatures?: string[]
}

export interface RawJsonCostume {
  mainOutfit?: string; accessories?: string[]; colors?: string[]
}

export interface RawJsonPersonality {
  traits?: string[]; mannerisms?: string[]; speakingStyle?: string
}

export interface RawJsonCharacter {
  id?: string; name?: string; role?: string; description?: string
  appearance?: RawJsonAppearance; costume?: RawJsonCostume; personality?: RawJsonPersonality
  referenceImageUrl?: string
}

export interface RawJsonScript {
  title?: string; totalDuration?: string; synopsis?: string
  scenes?: RawJsonScene[]; characters?: RawJsonCharacter[]; allDialogues?: RawJsonDialogue[]
}
