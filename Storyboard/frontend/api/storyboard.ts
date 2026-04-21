/**
 * 故事板功能 API 封装
 * - 分镜头脚本生成：GLM-5
 * - 故事板图片生成：nano-banana2
 * - 角色设计图生成：nano-banana2
 */

import { createNanoBanana2API } from './nanobanana2'
import type {
  StoryboardScript,
  StoryboardStyle,
  StoryboardCharacter,
  DialogueLine,
  parseAndNormalizeScript,
} from '@/stores/storyboardStore'

// GLM API 配置
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_MODEL = 'glm-5'  // GLM-5 旗舰模型

// 风格对应的提示词后缀
const STYLE_PROMPTS: Record<StoryboardStyle, string> = {
  comic: 'comic book style, black and white manga panel, ink drawing, screentone, clear outlines, storyboard frame',
  realistic: 'cinematic storyboard sketch, realistic film style, professional storyboard artist, pencil sketch',
  anime: 'anime storyboard style, Japanese animation, clean lines, vibrant colors, anime production art',
  watercolor: 'watercolor storyboard style, soft brush strokes, artistic illustration, hand-painted look',
}

// 景别对应的英文提示词
const SHOT_TYPE_PROMPTS: Record<string, string> = {
  远景: 'wide establishing shot',
  全景: 'full shot',
  中景: 'medium shot',
  近景: 'close-up shot',
  特写: 'extreme close-up',
  大特写: 'extreme close-up detail',
}

/**
 * 生成分镜头脚本（增强版）
 */
export async function generateStoryboardScript(
  apiKey: string,
  inputText: string,
  onProgress?: (progress: number) => void
): Promise<StoryboardScript> {
  onProgress?.(10)

  const systemPrompt = `你是一个专业的分镜头脚本编剧。根据用户提供的文案内容，生成结构化的分镜头脚本。

## 输出要求

### 1. 剧本分析
- 分析文案，拆分为 4-9 个镜头
- 总时长控制在 3-4 分钟
- 提取剧本梗概（synopsis）

### 2. 角色提取（仅主要角色，≤5人）
为每个主要角色提供详细描述：
- 基本信息：姓名、年龄、性别、角色定位（protagonist主角/supporting配角/minor龙套）
- 外观特征：身高、体型、发型发色、瞳色、肤色、显著特征
- 服装：主要服装、配饰、主色调
- 性格：性格特点、习惯动作、说话风格

### 3. 场景设计
每个镜头包含：
- 时长、景别、画面描述、镜头运动
- 结构化对白列表（角色ID、角色名、台词、情绪、语气、语速、停顿、舞台指示）
- 旁白（如有）

### 4. 对白情绪标注（为TTS合成准备）
- 情绪类型：neutral, happy, sad, angry, surprised, fearful, disgusted, contemptuous, excited, calm
- 语气类型：normal, whisper, shout, sarcastic, gentle, stern, playful, hesitant, confident
- 情绪强度：1-10（整数）
- 语速：0.5-2.0（1.0为正常，保留一位小数）
- 停顿：秒数（0.5的倍数）

必须严格按以下 JSON 格式输出，不要有任何其他内容：
{
  "title": "分镜头标题",
  "totalDuration": "3:30",
  "synopsis": "剧本梗概，简述故事内容和主题",
  "characters": [
    {
      "id": "char_1",
      "name": "角色名",
      "role": "protagonist",
      "description": "简短的角色描述",
      "appearance": {
        "age": "25岁",
        "gender": "男",
        "height": "180cm",
        "build": "健壮",
        "hairColor": "黑色",
        "hairStyle": "短发",
        "eyeColor": "深棕色",
        "skinTone": "小麦色",
        "distinctiveFeatures": ["剑眉", "左眉有疤痕"]
      },
      "costume": {
        "mainOutfit": "青色长袍",
        "accessories": ["玉佩", "草鞋"],
        "colors": ["青色", "白色"]
      },
      "personality": {
        "traits": ["沉稳", "内敛", "坚韧"],
        "mannerisms": ["思考时习惯摸下巴"],
        "speakingStyle": "语速平稳，声音低沉"
      }
    }
  ],
  "scenes": [
    {
      "id": 1,
      "duration": "0:30",
      "shotType": "中景",
      "description": "详细的画面描述，用于AI绘图",
      "camera": "固定镜头",
      "dialogues": [
        {
          "characterId": "char_1",
          "characterName": "陈平安",
          "text": "对白内容",
          "emotion": "calm",
          "emotionIntensity": 7,
          "tone": "gentle",
          "speed": 1.0,
          "pause": 0.5,
          "stageDirection": "缓缓转身"
        }
      ],
      "narrator": "旁白内容（可选）"
    }
  ],
  "allDialogues": [
    {
      "characterId": "char_1",
      "characterName": "陈平安",
      "text": "所有对白汇总",
      "emotion": "calm",
      "emotionIntensity": 7,
      "tone": "gentle",
      "speed": 1.0,
      "pause": 0.5,
      "stageDirection": ""
    }
  ]
}

景别选项：远景、全景、中景、近景、特写、大特写
镜头运动：固定镜头、推、拉、摇、移、跟、升降

注意：
1. characters 数组只包含有对白的主要角色，最多5个
2. dialogues 数组中的 characterId 必须对应 characters 中的 id
3. allDialogues 是所有场景中对白的汇总，便于后期TTS处理
4. 确保输出的 JSON 格式正确，可以被 JSON.parse() 解析`

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请根据以下文案生成分镜头脚本：\n\n${inputText}` },
      ],
      temperature: 0.7,
      max_tokens: 8192,  // 增加输出长度以容纳详细数据
    }),
  })

  onProgress?.(50)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  onProgress?.(80)

  // 解析 JSON
  try {
    // 提取 JSON 内容（支持 markdown 代码块）
    let jsonStr = content

    // 尝试提取 ```json ... ``` 中的内容
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1].trim()
    } else {
      // 尝试提取纯 JSON 对象
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('未能解析出 JSON 格式的脚本')
      }
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr)

    // 使用规范化函数填充默认值
    const script = normalizeScriptData(parsed)

    onProgress?.(100)
    return script
  } catch (parseError) {
    console.error('[Storyboard] Parse JSON error:', parseError)
    console.error('[Storyboard] Raw content:', content.substring(0, 500))
    throw new Error('分镜头脚本解析失败，请重试')
  }
}

/**
 * 规范化脚本数据，为缺失字段提供默认值
 */
function normalizeScriptData(data: any): StoryboardScript {
  const characters: StoryboardCharacter[] = (data.characters || []).map((c: any, i: number) => ({
    id: c.id || `char_${i + 1}`,
    name: c.name || `角色${i + 1}`,
    role: c.role || 'supporting',
    description: c.description || '',
    appearance: {
      age: c.appearance?.age || '未知',
      gender: c.appearance?.gender || '未知',
      height: c.appearance?.height || '中等',
      build: c.appearance?.build || '普通',
      hairColor: c.appearance?.hairColor || '黑色',
      hairStyle: c.appearance?.hairStyle || '普通',
      eyeColor: c.appearance?.eyeColor || '黑色',
      skinTone: c.appearance?.skinTone || '正常',
      distinctiveFeatures: c.appearance?.distinctiveFeatures || [],
    },
    costume: {
      mainOutfit: c.costume?.mainOutfit || '普通服装',
      accessories: c.costume?.accessories || [],
      colors: c.costume?.colors || [],
    },
    personality: {
      traits: c.personality?.traits || [],
      mannerisms: c.personality?.mannerisms || [],
      speakingStyle: c.personality?.speakingStyle || '正常',
    },
    referenceImageUrl: c.referenceImageUrl,
  }))

  const scenes = (data.scenes || []).map((s: any) => ({
    id: s.id ?? 0,
    duration: s.duration || '0:30',
    shotType: s.shotType || '中景',
    description: s.description || '',
    camera: s.camera || '固定镜头',
    dialogues: (s.dialogues || []).map((d: any) => ({
      characterId: d.characterId || '',
      characterName: d.characterName || '未知',
      text: d.text || '',
      emotion: d.emotion || 'neutral',
      emotionIntensity: d.emotionIntensity ?? 5,
      tone: d.tone || 'normal',
      speed: d.speed ?? 1.0,
      pause: d.pause ?? 0,
      stageDirection: d.stageDirection || '',
    })),
    narrator: s.narrator || '',
  }))

  const allDialogues: DialogueLine[] = (data.allDialogues || scenes.flatMap((s: any) => s.dialogues)).map((d: any) => ({
    characterId: d.characterId || '',
    characterName: d.characterName || '未知',
    text: d.text || '',
    emotion: d.emotion || 'neutral',
    emotionIntensity: d.emotionIntensity ?? 5,
    tone: d.tone || 'normal',
    speed: d.speed ?? 1.0,
    pause: d.pause ?? 0,
    stageDirection: d.stageDirection || '',
  }))

  return {
    title: data.title || '未命名分镜头',
    totalDuration: data.totalDuration || '3:00',
    synopsis: data.synopsis || '',
    characters,
    scenes,
    allDialogues,
  }
}

/**
 * 构建故事板图片提示词（增强版）
 */
function buildStoryboardPrompt(
  scene: { description: string; shotType: string },
  style: StoryboardStyle,
  characterDescriptions?: string[]
): string {
  const stylePrompt = STYLE_PROMPTS[style]
  const shotPrompt = SHOT_TYPE_PROMPTS[scene.shotType] || 'medium shot'

  let prompt = `${scene.description}, ${shotPrompt}, ${stylePrompt}, high quality, detailed`

  if (characterDescriptions && characterDescriptions.length > 0) {
    prompt += `, characters: ${characterDescriptions.join(', ')}`
  }

  return prompt
}

/**
 * 批量生成故事板图片（并行）
 */
export async function generateStoryboardImages(
  apiKey: string,
  script: StoryboardScript,
  style: StoryboardStyle,
  onProgress?: (current: number, total: number, imageUrl?: string) => void
): Promise<string[]> {
  const scenes = script.scenes
  const total = scenes.length
  const images: string[] = new Array(total).fill('')
  let completed = 0

  // 构建角色描述用于图片生成
  const characterDescs = script.characters.map((c) =>
    `${c.name}: ${c.appearance.age}, ${c.appearance.gender}, ${c.appearance.build}, ${c.appearance.hairColor} ${c.appearance.hairStyle}, ${c.costume.mainOutfit}`
  )

  // 并行生成所有图片
  const tasks = scenes.map(async (scene, i) => {
    const api = createNanoBanana2API(apiKey)
    const prompt = buildStoryboardPrompt(scene, style, characterDescs)

    try {
      const urls = await api.generateImageWithProgress({
        prompt,
        size: '1K',
        aspectRatio: '16:9',
      }, () => {})

      if (urls.length > 0) {
        images[i] = urls[0]
        completed++
        onProgress?.(completed, total, urls[0])
      }
    } catch (error) {
      console.error(`[Storyboard] Generate image ${i + 1} failed:`, error)
      completed++
      onProgress?.(completed, total)
    }
  })

  await Promise.all(tasks)

  // 过滤空结果
  return images.filter(Boolean)
}

/**
 * 构建角色设计图提示词（每个角色一张组合图）
 */
function buildCharacterDesignPrompt(character: StoryboardCharacter): string {
  const { appearance, costume, name, personality } = character

  return `character design sheet, ${name},
${appearance.age}, ${appearance.gender}, ${appearance.height}, ${appearance.build},
${appearance.hairColor} ${appearance.hairStyle}, ${appearance.eyeColor} eyes, ${appearance.skinTone} skin,
${appearance.distinctiveFeatures.join(', ') || 'no distinctive features'},
wearing ${costume.mainOutfit}, ${costume.accessories.join(', ') || 'no accessories'},
color scheme: ${costume.colors.join(', ') || 'default'},

layout: 3 full body standing poses (front view, side view, back view) on the left,
4 face close-up expressions (neutral, happy, serious, surprised) on the right,

personality hints: ${personality.traits.join(', ')},
${personality.mannerisms.join(', ')},

white background, professional character design, clean lines, detailed, high quality,
reference sheet style, multiple views, character turnaround`
}

/**
 * 批量生成角色设计图
 * 每个角色生成一张组合图（3站姿 + 4表情）
 */
export async function generateCharacterDesigns(
  apiKey: string,
  characters: StoryboardCharacter[],
  onProgress?: (current: number, total: number, imageUrl?: string, characterId?: string) => void
): Promise<Array<{ characterId: string; characterName: string; imageUrl: string }>> {
  // 只为主要角色生成设计图
  const mainCharacters = characters.filter(c =>
    c.role === 'protagonist' || c.role === 'supporting'
  ).slice(0, 5)  // 最多5个角色

  if (mainCharacters.length === 0) {
    return []
  }

  const total = mainCharacters.length
  const results: Array<{ characterId: string; characterName: string; imageUrl: string }> = []
  let completed = 0

  // 并行生成所有角色设计图
  const tasks = mainCharacters.map(async (character) => {
    const api = createNanoBanana2API(apiKey)
    const prompt = buildCharacterDesignPrompt(character)

    try {
      const urls = await api.generateImageWithProgress({
        prompt,
        size: '1K',
        aspectRatio: '16:9',  // 组合图使用宽画幅
      }, () => {})

      if (urls.length > 0) {
        results.push({
          characterId: character.id,
          characterName: character.name,
          imageUrl: urls[0],
        })
        completed++
        onProgress?.(completed, total, urls[0], character.id)
      } else {
        completed++
        onProgress?.(completed, total)
      }
    } catch (error) {
      console.error(`[Storyboard] Generate character ${character.name} failed:`, error)
      completed++
      onProgress?.(completed, total)
    }
  })

  await Promise.all(tasks)

  return results
}

/**
 * 一键生成所有内容
 * @param textApiKey 智谱 API Key，用于生成分镜头脚本
 * @param imageApiKey 速创 API Key，用于生成图片
 */
export async function generateAll(
  textApiKey: string,
  imageApiKey: string,
  inputText: string,
  style: StoryboardStyle,
  onTaskChange?: (task: 'script' | 'storyboard' | 'character') => void,
  onProgress?: (progress: number, message?: string) => void
): Promise<{
  script: StoryboardScript
  storyboardImages: string[]
  characterDesigns: Array<{ characterId: string; characterName: string; imageUrl: string }>
}> {
  // 任务1：生成分镜头脚本（使用智谱 API）
  onTaskChange?.('script')
  onProgress?.(0, '正在分析文案生成分镜头脚本...')
  const script = await generateStoryboardScript(textApiKey, inputText, (p) => {
    onProgress?.(p * 0.3, `正在生成分镜头脚本...${p}%`)
  })

  // 任务2：生成故事板图片（使用速创 API）
  onTaskChange?.('storyboard')
  onProgress?.(30, `正在生成${script.scenes.length}张故事板图片...`)
  const storyboardImages = await generateStoryboardImages(imageApiKey, script, style, (current, total, url) => {
    const progress = 30 + (current / total) * 40
    onProgress?.(progress, `正在生成故事板图片 ${current}/${total}`)
  })

  // 任务3：生成角色设计图（使用速创 API）
  onTaskChange?.('character')
  const characterCount = script.characters.filter(c => c.role === 'protagonist' || c.role === 'supporting').length
  onProgress?.(70, `正在生成${characterCount}个角色设计图...`)
  const characterDesigns = await generateCharacterDesigns(
    imageApiKey,
    script.characters,
    (current, total, url, characterId) => {
      const progress = 70 + (current / total) * 30
      onProgress?.(progress, `正在生成角色设计图 ${current}/${total}`)
    }
  )

  onProgress?.(100, '全部生成完成！')

  return {
    script,
    storyboardImages,
    characterDesigns,
  }
}
