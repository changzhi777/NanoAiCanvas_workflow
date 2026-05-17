/**
 * 文件解析工具
 * 支持 Markdown 和 JSON 格式的剧本/分镜头脚本导入
 */

import type {
  StoryboardScript,
  StoryboardCharacter,
  StoryboardScene,
  DialogueLine,
} from '@/stores/nanoImageStoryboardStore'

// 类型别名
type StoryboardData = StoryboardScript

// 解析结果中的剧本数据结构（旧格式兼容）

// ============ 解析缓存 ============

const parseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

function getCached<T>(key: string): T | null {
  const cached = parseCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  parseCache.delete(key)
  return null
}

function setCache(key: string, data: any): void {
  parseCache.set(key, { data, timestamp: Date.now() })
}

function generateCacheKey(content: string, type: string): string {
  // 简单哈希：内容长度 + 前100字符 + 类型
  return `${type}:${content.length}:${content.slice(0, 100)}`
}

// ============ Markdown 解析 ============

/**
 * 解析 Markdown 剧本
 * 支持格式：
 * # 标题
 * ## 角色设定
 * - 角色名：描述
 * ## 第一场：场景名
 * **场景**：描述
 * **人物**：角色列表
 * （角色）：对白
 * [动作]
 */
export function parseMarkdownScript(content: string): {
  title: string
  characters: StoryboardCharacter[]
  scenes: Array<{
    sceneName: string
    description: string
    dialogues: Array<{ character: string; line: string }>
  }>
} {
  const lines = content.split('\n')
  const result = {
    title: '',
    characters: [] as StoryboardCharacter[],
    scenes: [] as Array<{
      sceneName: string
      description: string
      dialogues: Array<{ character: string; line: string }>
    }>,
  }

  let currentSection = ''
  let currentScene: any = null

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 标题
    if (trimmedLine.startsWith('# ')) {
      result.title = trimmedLine.slice(2).trim()
      continue
    }

    // 章节
    if (trimmedLine.startsWith('## ')) {
      const sectionName = trimmedLine.slice(3).trim()

      // 角色设定
      if (sectionName.includes('角色') || sectionName.toLowerCase().includes('character')) {
        currentSection = 'characters'
        continue
      }

      // 新场景
      if (sectionName.includes('场') || sectionName.toLowerCase().includes('scene')) {
        if (currentScene) {
          result.scenes.push(currentScene)
        }
        currentScene = {
          sceneName: sectionName,
          description: '',
          dialogues: [],
        }
        currentSection = 'scene'
        continue
      }

      currentSection = ''
      continue
    }

    // 角色设定
    if (currentSection === 'characters' && trimmedLine.startsWith('- ')) {
      const match = trimmedLine.slice(2).match(/^([^：:]+)[：:](.+)$/)
      if (match) {
        result.characters.push({
          id: `char_${result.characters.length + 1}`,
          name: match[1].trim(),
          role: 'supporting',
          description: match[2].trim(),
          appearance: {
            age: '未知',
            gender: '未知',
            height: '中等',
            build: '普通',
            hairColor: '黑色',
            hairStyle: '普通',
            eyeColor: '黑色',
            skinTone: '正常',
            distinctiveFeatures: [],
          },
          costume: {
            mainOutfit: '普通服装',
            accessories: [],
            colors: [],
          },
          personality: {
            traits: [],
            mannerisms: [],
            speakingStyle: '正常',
          },
        })
      }
      continue
    }

    // 场景描述
    if (currentSection === 'scene' && currentScene) {
      // **场景**：描述
      if (trimmedLine.startsWith('**场景**') || trimmedLine.startsWith('**场景:**')) {
        const desc = trimmedLine.replace(/\*\*场景\*\*[：:]\s*/, '').trim()
        currentScene.description += desc + ' '
        continue
      }

      // **人物**：角色列表
      if (trimmedLine.startsWith('**人物**') || trimmedLine.startsWith('**人物:**')) {
        continue
      }

      // （角色）：对白
      const dialogueMatch = trimmedLine.match(/^[（(]([^）)]+)[）)][：:](.+)$/)
      if (dialogueMatch) {
        currentScene.dialogues.push({
          character: dialogueMatch[1].trim(),
          line: dialogueMatch[2].trim(),
        })
        continue
      }

      // [动作描述]
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        const action = trimmedLine.slice(1, -1).trim()
        currentScene.description += `[${action}] `
        continue
      }

      // 普通行
      if (trimmedLine && !trimmedLine.startsWith('**')) {
        currentScene.description += trimmedLine + ' '
      }
    }
  }

  // 保存最后一个场景
  if (currentScene) {
    result.scenes.push(currentScene)
  }

  return result
}

/**
 * 解析 Markdown 分镜头脚本
 * 表格格式：
 * | 镜头 | 景别 | 时长 | 画面描述 | 镜头运动 | 对白 |
 */
export function parseMarkdownStoryboard(content: string): StoryboardData | null {
  try {
    const lines = content.split('\n')
    const scenes: StoryboardScene[] = []
    let title = '分镜头脚本'
    let totalDuration = '0:00'

    let inTable = false
    let sceneId = 1

    for (const line of lines) {
      const trimmedLine = line.trim()

      // 标题
      if (trimmedLine.startsWith('# ')) {
        title = trimmedLine.slice(2).trim()
        continue
      }

      // 表格行
      if (trimmedLine.startsWith('|')) {
        const cells = trimmedLine.split('|').map((c) => c.trim()).filter(Boolean)

        // 跳过表头和分隔行
        if (cells[0] === '镜头' || cells.every((c) => /^[-:]+$/.test(c))) {
          inTable = true
          continue
        }

        if (inTable && cells.length >= 5) {
          // 解析对白（如果是 "角色:台词" 格式）
          const dialogueText = cells[5] || ''
          const dialogues: DialogueLine[] = []

          // 尝试解析对白
          if (dialogueText && dialogueText !== '-') {
            const dialogueMatch = dialogueText.match(/^([^:：]+)[：:](.+)$/)
            if (dialogueMatch) {
              dialogues.push({
                characterId: '',
                characterName: dialogueMatch[1].trim(),
                text: dialogueMatch[2].trim(),
                emotion: 'neutral',
                emotionIntensity: 5,
                tone: 'normal',
                speed: 1.0,
                pause: 0,
              })
            }
          }

          scenes.push({
            id: sceneId++,
            shotType: cells[1] || '中景',
            duration: cells[2] || '0:30',
            description: cells[3] || '',
            camera: cells[4] || '固定镜头',
            dialogues,
            narrator: '',
          })
        }
        continue
      }

      inTable = false
    }

    // 计算总时长
    if (scenes.length > 0) {
      totalDuration = calculateTotalDuration(scenes)
    }

    return {
      title,
      totalDuration,
      synopsis: '',
      scenes,
      characters: [],
      allDialogues: [],
    }
  } catch (error) {
    console.error('Parse markdown storyboard error:', error)
    return null
  }
}

// ============ JSON 解析 ============

/**
 * 解析 JSON 分镜头脚本
 */
export function parseJsonStoryboard(content: string): StoryboardData | null {
  try {
    const data = JSON.parse(content)

    // 验证必要字段
    if (!data.scenes || !Array.isArray(data.scenes)) {
      return null
    }

    return {
      title: data.title || '分镜头脚本',
      totalDuration: data.totalDuration || '0:00',
      synopsis: data.synopsis || '',
      scenes: data.scenes.map((scene: any, index: number) => ({
        id: scene.id || index + 1,
        shotType: scene.shotType || '中景',
        duration: scene.duration || '0:30',
        description: scene.description || '',
        camera: scene.camera || '固定镜头',
        dialogues: (scene.dialogues || []).map((d: any) => ({
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
        narrator: scene.narrator || '',
        imageUrl: scene.imageUrl,
      })),
      characters: (data.characters || []).map((char: any, index: number) => ({
        id: char.id || `char_${index + 1}`,
        name: char.name || '',
        role: char.role || 'supporting',
        description: char.description || '',
        appearance: {
          age: char.appearance?.age || '未知',
          gender: char.appearance?.gender || '未知',
          height: char.appearance?.height || '中等',
          build: char.appearance?.build || '普通',
          hairColor: char.appearance?.hairColor || '黑色',
          hairStyle: char.appearance?.hairStyle || '普通',
          eyeColor: char.appearance?.eyeColor || '黑色',
          skinTone: char.appearance?.skinTone || '正常',
          distinctiveFeatures: char.appearance?.distinctiveFeatures || [],
        },
        costume: {
          mainOutfit: char.costume?.mainOutfit || '普通服装',
          accessories: char.costume?.accessories || [],
          colors: char.costume?.colors || [],
        },
        personality: {
          traits: char.personality?.traits || [],
          mannerisms: char.personality?.mannerisms || [],
          speakingStyle: char.personality?.speakingStyle || '正常',
        },
      })),
      allDialogues: (data.allDialogues || []).map((d: any) => ({
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
    }
  } catch (error) {
    console.error('Parse JSON storyboard error:', error)
    return null
  }
}

// ============ 文件导出 ============

/**
 * 导出为 Markdown 剧本格式
 */
export function exportToMarkdownScript(data: {
  title: string
  characters: StoryboardCharacter[]
  scenes: StoryboardScene[]
}): string {
  let md = `# ${data.title}\n\n`

  // 角色设定
  if (data.characters.length > 0) {
    md += `## 角色设定\n\n`
    data.characters.forEach((char: StoryboardCharacter) => {
      md += `- ${char.name}：${char.description}\n`
    })
    md += '\n'
  }

  // 场景
  data.scenes.forEach((scene: StoryboardScene, index: number) => {
    md += `## 第${index + 1}场\n\n`
    md += `**场景**：${scene.description}\n\n`
    // 处理新的 dialogues 数组
    if (scene.dialogues && scene.dialogues.length > 0) {
      scene.dialogues.forEach((d) => {
        md += `${d.characterName}：${d.text}\n`
      })
      md += '\n'
    }
  })

  return md
}

/**
 * 导出为 Markdown 表格格式（分镜头）
 */
export function exportToMarkdownStoryboard(data: StoryboardData): string {
  let md = `# ${data.title}\n\n`
  md += `总时长：${data.totalDuration}\n\n`

  // 剧本梗概
  if (data.synopsis) {
    md += `## 剧本梗概\n\n${data.synopsis}\n\n`
  }

  // 角色设定
  if (data.characters.length > 0) {
    md += `## 角色设定\n\n`
    data.characters.forEach((char) => {
      md += `### ${char.name}\n\n`
      md += `- 角色：${char.role === 'protagonist' ? '主角' : char.role === 'supporting' ? '配角' : '龙套'}\n`
      md += `- 描述：${char.description}\n`

      if (char.appearance) {
        md += `- 外观：${char.appearance.age}，${char.appearance.gender}，${char.appearance.height}，${char.appearance.build}\n`
        md += `  - 发型：${char.appearance.hairColor} ${char.appearance.hairStyle}\n`
        md += `  - 瞳色：${char.appearance.eyeColor}\n`
        md += `  - 肤色：${char.appearance.skinTone}\n`
        if (char.appearance.distinctiveFeatures?.length > 0) {
          md += `  - 特征：${char.appearance.distinctiveFeatures.join('、')}\n`
        }
      }

      if (char.costume) {
        md += `- 服装：${char.costume.mainOutfit}\n`
        if (char.costume.accessories?.length > 0) {
          md += `  - 配饰：${char.costume.accessories.join('、')}\n`
        }
        if (char.costume.colors?.length > 0) {
          md += `  - 主色调：${char.costume.colors.join('、')}\n`
        }
      }

      if (char.personality) {
        md += `- 性格：${char.personality.traits?.join('、') || '未知'}\n`
        md += `- 说话风格：${char.personality.speakingStyle || '正常'}\n`
      }

      md += '\n'
    })
  }

  // 表格
  md += `## 分镜头脚本\n\n`
  md += `| 镜头 | 景别 | 时长 | 画面描述 | 镜头运动 | 对白/旁白 |\n`
  md += `| --- | --- | --- | --- | --- | --- |\n`

  data.scenes.forEach((scene, index) => {
    const dialoguesText = scene.dialogues?.map((d) => `${d.characterName}：${d.text}`).join('；') || ''
    const narratorText = scene.narrator ? `【旁白】${scene.narrator}` : ''
    const dialogueCell = [dialoguesText, narratorText].filter(Boolean).join(' ') || '-'

    md += `| ${index + 1} | ${scene.shotType} | ${scene.duration} | ${scene.description} | ${scene.camera} | ${dialogueCell} |\n`
  })

  // 对白列表
  if (data.allDialogues?.length > 0 || data.scenes.some((s) => s.dialogues?.length > 0)) {
    md += `\n## 对白列表（TTS 参考）\n\n`

    data.scenes.forEach((scene, sceneIndex) => {
      if (scene.dialogues?.length > 0) {
        md += `### 镜头 ${sceneIndex + 1}\n\n`
        scene.dialogues.forEach((d) => {
          md += `- **${d.characterName}**：${d.text}\n`
          md += `  - 情绪：${d.emotion}（强度 ${d.emotionIntensity}/10）\n`
          md += `  - 语气：${d.tone}\n`
          md += `  - 语速：${d.speed}x\n`
          if (d.stageDirection) {
            md += `  - 舞台指示：${d.stageDirection}\n`
          }
          md += '\n'
        })
      }
    })
  }

  return md
}

/**
 * 导出为 JSON 格式
 */
export function exportToJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

// ============ 工具函数 ============

/**
 * 计算总时长
 */
function calculateTotalDuration(scenes: StoryboardScene[]): string {
  let totalSeconds = 0

  scenes.forEach((scene) => {
    const match = scene.duration.match(/(\d+):(\d+)/)
    if (match) {
      totalSeconds += parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
    }
  })

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 读取上传文件
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

/**
 * 解析上传的文件（带缓存）
 */
export async function parseUploadedFile(file: File): Promise<{
  type: 'script' | 'storyboard'
  data: any
} | null> {
  const content = await readFile(file)

  // JSON 文件
  if (file.name.endsWith('.json')) {
    // 检查缓存
    const cacheKey = generateCacheKey(content, 'json')
    const cached = getCached<{ type: 'storyboard'; data: StoryboardData }>(cacheKey)
    if (cached) return cached

    const storyboard = parseJsonStoryboard(content)
    if (storyboard) {
      const result = { type: 'storyboard' as const, data: storyboard }
      setCache(cacheKey, result)
      return result
    }
    return null
  }

  // Markdown 文件
  if (file.name.endsWith('.md')) {
    // 检查缓存
    const cacheKey = generateCacheKey(content, 'md')
    const cached = getCached<{ type: 'script' | 'storyboard'; data: any }>(cacheKey)
    if (cached) return cached

    // 尝试解析为分镜头表格
    const storyboard = parseMarkdownStoryboard(content)
    if (storyboard && storyboard.scenes.length > 0) {
      const result = { type: 'storyboard' as const, data: storyboard }
      setCache(cacheKey, result)
      return result
    }

    // 尝试解析为剧本
    const script = parseMarkdownScript(content)
    if (script.scenes.length > 0) {
      const result = { type: 'script' as const, data: script }
      setCache(cacheKey, result)
      return result
    }
  }

  return null
}

/**
 * 清除解析缓存
 */
export function clearParseCache(): void {
  parseCache.clear()
}
