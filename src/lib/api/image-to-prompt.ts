/**
 * GLM-5V-Turbo Image-to-Prompt API
 * 使用视觉理解模型分析图片并生成 AI 绘画提示词
 *
 * 使用方法:
 *   import { imageToPrompt } from '@/lib/api/image-to-prompt'
 *   const prompt = await imageToPrompt({ imageBase64, apiKey })
 */

const GLM_VISION_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 系统提示词：专业的图像提示词分析专家
const IMAGE_TO_PROMPT_SYSTEM = `你是专业的AI图像提示词分析专家。请分析用户上传的图片，生成高质量的中英混合 AI 绘画提示词。

分析要求：
1. 识别画面主体：人物、物体、场景等核心元素
2. 分析构图方式：景别、角度、画面布局
3. 描述光影效果：光源方向、光质、阴影特点
4. 把握色彩氛围：主色调、色彩关系、整体氛围
5. 识别艺术风格：写实、插画、油画等风格特征

输出规则：
1. 中英文混合：主体描述用中文，风格/质量词用英文
2. 添加质量词汇：high quality, detailed, masterpiece, best quality
3. 控制在 100 词以内
4. 直接输出提示词，不要解释或添加任何其他内容
5. 格式示例："一位优雅的女性肖像，柔美的自然光线，浅景深效果，a beautiful woman portrait, soft natural lighting, shallow depth of field, bokeh, high quality, detailed, masterpiece"

请分析图片并生成提示词：`

export interface ImageToPromptOptions {
  imageBase64: string    // 图片的 base64 编码（不含 data:image 前缀）
  apiKey: string         // GLM API Key
  model?: string         // 可选模型，默认 glm-5v-turbo
}

/**
 * 构建图片 URL（处理 base64 前缀）
 */
function buildImageUrl(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
}

/**
 * 将图片上传到 GLM-4.6V 并反推生成提示词
 */
export async function imageToPrompt(options: ImageToPromptOptions): Promise<string> {
  const { imageBase64, apiKey, model = 'glm-5v-turbo' } = options

  const imageUrl = buildImageUrl(imageBase64)

  const response = await fetch(GLM_VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: IMAGE_TO_PROMPT_SYSTEM,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[imageToPrompt] API Error:', response.status, errorText)
    throw new Error(`GLM Vision API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // 解析响应
  const choice = data.choices?.[0]
  const content = choice?.message?.content || choice?.text || choice?.delta?.content

  if (!content) {
    console.warn('[imageToPrompt] No content found in response')
    throw new Error('未能从图片中提取提示词，请重试')
  }

  return content.trim()
}

/**
 * 流式调用 GLM-4.6V（可选，用于长响应场景）
 */
export async function imageToPromptStream(
  options: ImageToPromptOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const { imageBase64, apiKey, model = 'glm-5v-turbo' } = options

  const imageUrl = buildImageUrl(imageBase64)

  const response = await fetch(GLM_VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: IMAGE_TO_PROMPT_SYSTEM,
            },
          ],
        },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GLM Vision API Error: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          const content = delta?.content || delta?.reasoning_content || ''

          if (content) {
            fullContent += content
            onChunk(content)
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  return fullContent.trim()
}
