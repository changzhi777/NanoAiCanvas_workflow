import type { KnowledgeCardCategory, CardStyle, MindmapNode } from '@/types'
import {
  CATEGORY_VISUAL_ELEMENTS,
  CARD_STYLE_PROMPTS,
  buildKnowledgeCardPrompt,
} from '@/lib/constants/card-templates'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEFAULT_TIMEOUT = 30000

/**
 * Get random GLM API parameters for variety
 */
function getRandomParams() {
  return {
    temperature: 0.7 + Math.random() * 0.2,
    top_p: 0.85 + Math.random() * 0.1,
    seed: Math.floor(Math.random() * 10000)
  }
}

/**
 * Common GLM API call utility - reduces code duplication
 */
async function callGLMApi(
  apiKey: string,
  systemPrompt: string,
  userInput: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<string | null> {
  const { temperature, top_p, seed } = getRandomParams()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\n${userInput}`
          },
        ],
        temperature,
        top_p,
        seed,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GLM API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    return choice?.message?.content || choice?.text || choice?.delta?.content || null
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Knowledge card enhancement options
 */
export interface KnowledgeCardEnhanceOptions {
  title: string
  content: string
  category: KnowledgeCardCategory
  style: CardStyle
  apiKey: string
}

/**
 * Build system prompt for knowledge card content optimization
 * Optimizes content specifically for the cute doodle style template
 */
function buildEnhancementSystemPrompt(category: KnowledgeCardCategory, style: CardStyle): string {
  const visualElements = CATEGORY_VISUAL_ELEMENTS[category]
  const stylePrompt = CARD_STYLE_PROMPTS[style]

  return `你是一个专业的知识卡片内容优化助手，专门为"可爱彩铅手绘涂鸦风格"的知识卡片优化内容。

## 任务目标
将用户输入的知识点内容优化为适合彩铅手绘涂鸦卡片的形式：
1. 提取核心主题（作为卡片大标题）
2. 将知识点拆解为3-5个易于理解的要点
3. 为每个要点设计一个简单的涂鸦图示描述
4. 用彩铅手绘风格的语言描述视觉元素

## 学科特点
${visualElements}

## 卡片风格参考
${stylePrompt.substring(0, 500)}...

## 优化规则
1. 【标题优化】简洁有力，控制在15字以内，适合手写艺术字
2. 【内容拆解】拆分为3-5个要点，每个要点不超过50字
3. 【涂鸦建议】为每个要点描述一个简单的涂鸦/简笔画
4. 【关键词标注】标出需要用手绘框高亮的关键词
5. 【整体风格】保持可爱、温馨、手绘感

## 输出格式（必须严格遵循）
【优化标题】
（简洁的标题，15字以内）

【核心要点】
1. （要点1）| 涂鸦：（对应的简单涂鸦描述）
2. （要点2）| 涂鸦：（对应的简单涂鸦描述）
3. （要点3）| 涂鸦：（对应的简单涂鸦描述）
...

【高亮关键词】
（用逗号分隔需要手绘框高亮的关键词）

【布局建议】
（简短的布局描述，如：标题居上，要点纵向排列，底部装饰）`
}

/**
 * Enhance knowledge card content using GLM API
 */
export async function enhanceKnowledgeCard(options: KnowledgeCardEnhanceOptions): Promise<{
  enhancedTitle: string
  enhancedContent: string
  doodleSuggestions: string[]
  highlightKeywords: string[]
  layoutSuggestion: string
}> {
  const { title, content, category, style, apiKey } = options
  const systemPrompt = buildEnhancementSystemPrompt(category, style)
  const userInput = `【用户输入】\n标题：${title}\n内容：${content}`

  try {
    const enhancedText = await callGLMApi(apiKey, systemPrompt, userInput)
    if (!enhancedText) {
      return getDefaultResult(title, content)
    }
    return parseEnhancedResponse(enhancedText.trim(), title, content)
  } catch (error) {
    console.error('[enhanceKnowledgeCard] Error:', error)
    return getDefaultResult(title, content)
  }
}

/**
 * Get default result when enhancement fails
 */
function getDefaultResult(title: string, content: string) {
  return {
    enhancedTitle: title,
    enhancedContent: content,
    doodleSuggestions: [],
    highlightKeywords: [],
    layoutSuggestion: '标题居上，要点纵向排列，底部添加装饰涂鸦',
  }
}

/**
 * Parse GLM response into structured data
 */
function parseEnhancedResponse(
  text: string,
  originalTitle: string,
  originalContent: string
): {
  enhancedTitle: string
  enhancedContent: string
  doodleSuggestions: string[]
  highlightKeywords: string[]
  layoutSuggestion: string
} {
  const result = {
    enhancedTitle: originalTitle,
    enhancedContent: originalContent,
    doodleSuggestions: [] as string[],
    highlightKeywords: [] as string[],
    layoutSuggestion: '标题居上，要点纵向排列，底部添加装饰涂鸦',
  }

  try {
    // Parse optimized title
    const titleMatch = text.match(/【优化标题】\s*([\s\S]*?)(?=【核心要点】|【|$)/)
    if (titleMatch) {
      result.enhancedTitle = titleMatch[1].trim().split('\n')[0].trim()
    }

    // Parse core points with doodle suggestions
    const pointsMatch = text.match(/【核心要点】\s*([\s\S]*?)(?=【高亮关键词】|【布局建议】|【|$)/)
    if (pointsMatch) {
      const pointsText = pointsMatch[1].trim()
      const lines = pointsText.split('\n').filter(line => line.trim())

      const contentParts: string[] = []
      const doodles: string[] = []

      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*涂鸦[：:]\s*(.+)$/)
        if (match) {
          contentParts.push(match[1].trim())
          doodles.push(match[2].trim())
        } else if (line.match(/^\d+\./)) {
          // Point without doodle description
          contentParts.push(line.replace(/^\d+\.\s*/, '').trim())
        }
      }

      if (contentParts.length > 0) {
        result.enhancedContent = contentParts.join('\n')
      }
      result.doodleSuggestions = doodles
    }

    // Parse highlight keywords
    const keywordsMatch = text.match(/【高亮关键词】\s*([\s\S]*?)(?=【布局建议】|【|$)/)
    if (keywordsMatch) {
      const keywordsText = keywordsMatch[1].trim()
      result.highlightKeywords = keywordsText
        .split(/[,，、\n]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length <= 10)
    }

    // Parse layout suggestion
    const layoutMatch = text.match(/【布局建议】\s*([\s\S]*?)(?=【|$)/)
    if (layoutMatch) {
      result.layoutSuggestion = layoutMatch[1].trim().split('\n')[0].trim()
    }
  } catch (error) {
    console.warn('[parseEnhancedResponse] Parse error:', error)
  }

  return result
}

/**
 * Build optimized prompt for image generation
 * Combines the enhanced content with the doodle style template
 */
export function buildOptimizedCardPrompt(
  enhancedTitle: string,
  enhancedContent: string,
  doodleSuggestions: string[],
  highlightKeywords: string[],
  layoutSuggestion: string,
  category: KnowledgeCardCategory,
  style: CardStyle
): string {
  // Build enhanced content with doodle suggestions
  let finalContent = enhancedContent

  if (doodleSuggestions.length > 0) {
    const contentLines = enhancedContent.split('\n')
    const enhancedLines = contentLines.map((line, index) => {
      const doodle = doodleSuggestions[index]
      if (doodle) {
        return `${line} [配图: ${doodle}]`
      }
      return line
    })
    finalContent = enhancedLines.join('\n')
  }

  if (highlightKeywords.length > 0) {
    finalContent += `\n\n【重点标注】${highlightKeywords.join('、')}`
  }

  if (layoutSuggestion) {
    finalContent += `\n\n【布局】${layoutSuggestion}`
  }

  return buildKnowledgeCardPrompt(enhancedTitle, finalContent, category, style)
}

// ============================================
// Mindmap Generation API
// ============================================

import { v4 as uuidv4 } from 'uuid'

/**
 * Mindmap generation options
 */
export interface MindmapGenerateOptions {
  title: string
  content: string
  category: KnowledgeCardCategory
  apiKey: string
}

/**
 * Build system prompt for mindmap structure generation
 */
function buildMindmapSystemPrompt(category: KnowledgeCardCategory): string {
  const visualElements = CATEGORY_VISUAL_ELEMENTS[category]

  return `你是一个专业的思维导图生成助手，专门为学科知识生成结构化的思维导图。

## 任务目标
根据用户输入的知识点标题和内容，生成一个结构清晰、层次分明的思维导图。

## 学科特点
${visualElements}

## 生成规则
1. 【根节点】标题作为根节点，简洁明了
2. 【分支数量】生成3-5个主要分支（一级节点）
3. 【层级深度】每个分支可以有2-4个子节点，支持多层嵌套
4. 【节点文本】每个节点不超过20字，简洁精炼
5. 【逻辑清晰】分支之间有逻辑关系，如：定义-特征-应用、时间顺序、因果关系等

## 输出格式（必须是有效的JSON）
{
  "id": "root",
  "text": "根节点标题",
  "children": [
    {
      "id": "branch-1",
      "text": "分支1内容",
      "children": [
        {
          "id": "sub-1-1",
          "text": "子节点1-1",
          "children": []
        }
      ]
    },
    {
      "id": "branch-2",
      "text": "分支2内容",
      "children": []
    }
  ]
}

## 重要提示
- 只输出JSON，不要有其他说明文字
- 确保JSON格式正确，可以被解析
- id字段可以使用简单的标识符`
}

/**
 * Generate mindmap structure using GLM API
 */
export async function generateMindmapStructure(options: MindmapGenerateOptions): Promise<MindmapNode> {
  const { title, content, category, apiKey } = options
  const systemPrompt = buildMindmapSystemPrompt(category)
  const userInput = `【用户输入】\n标题：${title}\n内容：${content}`

  try {
    const responseText = await callGLMApi(apiKey, systemPrompt, userInput)
    if (!responseText) {
      return getDefaultMindmap(title, content)
    }
    return parseMindmapResponse(responseText.trim(), title, content)
  } catch (error) {
    console.error('[generateMindmapStructure] Error:', error)
    return getDefaultMindmap(title, content)
  }
}

/**
 * Get default mindmap when generation fails
 */
function getDefaultMindmap(title: string, content: string): MindmapNode {
  // Split content into lines and create simple structure
  const lines = content.split('\n').filter(line => line.trim()).slice(0, 5)

  const children: MindmapNode[] = lines.map((line) => ({
    id: uuidv4(),
    text: line.trim().substring(0, 20),
    children: [],
  }))

  // If no lines, create placeholder children
  if (children.length === 0) {
    children.push(
      { id: uuidv4(), text: '要点1', children: [] },
      { id: uuidv4(), text: '要点2', children: [] },
      { id: uuidv4(), text: '要点3', children: [] }
    )
  }

  return {
    id: uuidv4(),
    text: title.substring(0, 20),
    children,
  }
}

/**
 * Parse GLM response into mindmap structure
 */
function parseMindmapResponse(text: string, title: string, content: string): MindmapNode {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Validate and transform structure
      const rootNode = transformToMindmapNode(parsed, title)
      return rootNode
    }
  } catch (error) {
    console.warn('[parseMindmapResponse] Parse error:', error)
  }

  return getDefaultMindmap(title, content)
}

/**
 * Transform parsed JSON to MindmapNode with proper IDs
 */
function transformToMindmapNode(data: any, defaultTitle: string): MindmapNode {
  const id = data.id || uuidv4()
  const text = data.text || defaultTitle

  const children: MindmapNode[] = Array.isArray(data.children)
    ? data.children.map((child: any) => transformToMindmapNode(child, ''))
    : []

  return {
    id,
    text,
    children,
  }
}
