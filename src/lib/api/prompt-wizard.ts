const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 对话消息类型
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// 模板答案类型
export interface TemplateAnswers {
  subject?: string // 主体描述
  style?: string // 风格偏好
  composition?: string // 构图/视角
  lighting?: string // 光影氛围
  effects?: string // 特殊效果
}

// 向导请求参数
export interface WizardRequest {
  messages: ChatMessage[]
  templateAnswers?: TemplateAnswers
  referenceImage?: string // base64 图片
  apiKey: string
}

// 向导响应
export interface WizardResponse {
  message: string
  isComplete: boolean // 是否可以生成最终提示词
}

// 生成提示词请求
export interface GeneratePromptRequest {
  messages: ChatMessage[]
  templateAnswers?: TemplateAnswers
  referenceImage?: string
  apiKey: string
}

// 构建系统提示词
function buildWizardSystemPrompt(templateAnswers?: TemplateAnswers, _hasImage?: boolean): string {
  let context = ''

  if (templateAnswers) {
    const parts: string[] = []
    if (templateAnswers.subject) parts.push(`主体描述: ${templateAnswers.subject}`)
    if (templateAnswers.style) parts.push(`风格偏好: ${templateAnswers.style}`)
    if (templateAnswers.composition) parts.push(`构图/视角: ${templateAnswers.composition}`)
    if (templateAnswers.lighting) parts.push(`光影氛围: ${templateAnswers.lighting}`)
    if (templateAnswers.effects) parts.push(`特殊效果: ${templateAnswers.effects}`)
    if (parts.length > 0) {
      context = `\n\n用户已填写的模板信息:\n${parts.join('\n')}`
    }
  }

  return `你是专业的AI图像提示词顾问。你正在通过对话帮助用户生成高质量的图像提示词。

你的任务:
1. 友好地与用户对话，了解他们的创作意图
2. 根据提示词公式 [主体描述] + [构图/角度] + [镜头类型] + [光影] + [相机参数] 引导用户补充信息
3. 如果用户上传了参考图片，分析图片并提供视觉建议
4. 当你觉得信息足够时，告诉用户可以点击"生成提示词"按钮${context}

对话规则:
- 回复简洁友好，每次回复控制在 100 字以内
- 一次只问一个问题，不要过于复杂
- 如果用户已提供某些信息，不要重复询问
- 鼓励用户，肯定他们的想法
- 使用中文回复`
}

// 构建图片分析系统提示词
function buildVisionSystemPrompt(): string {
  return `你是专业的图像分析师。请分析用户上传的参考图片，提取以下信息：
1. 主体内容（人物、物体、场景等）
2. 艺术风格（写实、动漫、油画等）
3. 构图方式（特写、全景、俯视等）
4. 光线特点（自然光、人工光、逆光等）
5. 色彩氛围（冷暖色调、明暗对比等）
6. 特殊效果（如有）

请用中文简洁描述，帮助用户生成类似的图像提示词。`
}

// 构建最终提示词生成的系统提示词
function buildFinalPromptSystem(templateAnswers?: TemplateAnswers): string {
  let context = ''

  if (templateAnswers) {
    const parts: string[] = []
    if (templateAnswers.subject) parts.push(`主体: ${templateAnswers.subject}`)
    if (templateAnswers.style) parts.push(`风格: ${templateAnswers.style}`)
    if (templateAnswers.composition) parts.push(`构图: ${templateAnswers.composition}`)
    if (templateAnswers.lighting) parts.push(`光影: ${templateAnswers.lighting}`)
    if (templateAnswers.effects) parts.push(`特效: ${templateAnswers.effects}`)
    if (parts.length > 0) {
      context = `\n\n用户已填写的模板信息:\n${parts.join('\n')}`
    }
  }

  return `你是专业的AI图像提示词专家。根据对话内容和模板信息，生成一个高质量的图像生成提示词。

提示词公式: [主体描述] + [构图/角度] + [镜头类型] + [光影] + [相机参数] = 提示词优化

优化规则:
1. 综合用户的所有输入，生成一个完整的提示词
2. 中英文混合：主体描述用中文，风格/质量词用英文
3. 添加视觉细节（光影、构图、质感、色彩、氛围）
4. 保持简洁，不超过 150 词
5. 添加质量词汇：high quality, detailed, masterpiece, best quality
6. 基于提示词公式组织内容${context}

输出格式: 直接输出优化后的提示词，不要解释或添加任何其他内容。`
}

// 调用 GLM API
async function callGLMAPI(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  imageBase64?: string
): Promise<string> {
  // 构建完整的对话内容
  const conversationText = messages.map((m) =>
    m.role === 'user' ? `用户: ${m.content}` : `助手: ${m.content}`
  ).join('\n\n')

  // 使用单一用户消息格式，将系统提示和对话合并
  let userContent: string | object[]
  if (imageBase64) {
    // 如果有图片，使用多模态格式
    userContent = [
      { type: 'text', text: `${systemPrompt}\n\n${conversationText}` },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ]
  } else {
    userContent = `${systemPrompt}\n\n${conversationText}`
  }

  const formattedMessages = [
    {
      role: 'user',
      content: userContent,
    },
  ]

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: imageBase64 ? 'glm-5v-turbo' : 'glm-5',
      messages: formattedMessages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Wizard API] Error:', response.status, errorText)
    throw new Error(`GLM API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const content = choice?.message?.content || choice?.text || choice?.delta?.content

  if (!content) {
    throw new Error('No response from API')
  }

  return content.trim()
}

// 向导对话
export async function wizardChat(request: WizardRequest): Promise<WizardResponse> {
  const { messages, templateAnswers, referenceImage, apiKey } = request

  const systemPrompt = buildWizardSystemPrompt(templateAnswers, !!referenceImage)

  const response = await callGLMAPI(apiKey, systemPrompt, messages, referenceImage)

  // 简单判断是否信息足够（可以根据实际情况调整）
  const completeKeywords = ['可以生成', '足够', '准备好了', '可以了']
  const isComplete = completeKeywords.some((keyword) => response.includes(keyword))

  return {
    message: response,
    isComplete,
  }
}

// 分析参考图片
export async function analyzeReferenceImage(
  imageBase64: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = buildVisionSystemPrompt()

  const response = await callGLMAPI(
    apiKey,
    systemPrompt,
    [{ role: 'user', content: '请分析这张参考图片' }],
    imageBase64
  )

  return response
}

// 生成最终提示词
export async function generateFinalPrompt(request: GeneratePromptRequest): Promise<string> {
  const { messages, templateAnswers, referenceImage, apiKey } = request

  const systemPrompt = buildFinalPromptSystem(templateAnswers)

  // 添加生成请求
  const allMessages = [
    ...messages,
    { role: 'user', content: '请根据我们的对话生成最终的图像提示词。' } as ChatMessage,
  ]

  return await callGLMAPI(apiKey, systemPrompt, allMessages, referenceImage)
}
