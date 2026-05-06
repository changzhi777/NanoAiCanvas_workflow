/**
 * AI Skill API Client
 *
 * Provides API calls for AI skill-based image generation:
 * - chatAnalyze: Analyze user intent and recommend templates
 * - getTemplates: List all available templates
 * - generateImage: Start async image generation task
 * - getTaskStatus: Poll task status
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface TemplateField {
  name: string
  type: 'text' | 'select' | 'textarea' | 'number'
  label: string
  required: boolean
  description?: string
  options?: { value: string; label: string }[]
  default?: string
}

export interface SkillTemplate {
  id: string
  name: string
  category: string
  category_name: string
  description: string
  fields: TemplateField[]
  prompt_template: string
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  templates: SkillTemplate[]
}

export interface TemplatesListResponse {
  categories: TemplateCategory[]
  total_templates: number
}

export interface ChatMessageRequest {
  role: string
  content: string
}

export interface SkillChatRequest {
  message: string
  chat_history?: ChatMessageRequest[]
  skill_id?: string
}

export interface RecommendedTemplate {
  template_id: string
  confidence: number
  reasoning: string
}

export interface SkillChatResponse {
  recommended_templates: RecommendedTemplate[]
  suggested_category?: string
  reasoning: string
  needs_more_info: boolean
  follow_up_question?: string
}

export interface GenerateRequest {
  template_id: string
  form_data: Record<string, string>
  skill_id?: string
  size?: string
  quality?: string
}

export interface GenerateResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message: string
}

export interface TaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: {
    url?: string
    b64_json?: string
  }
  error?: string
}

/**
 * Analyze user message and recommend suitable templates
 */
export async function chatAnalyzeTemplate(
  request: SkillChatRequest
): Promise<SkillChatResponse> {
  const response = await fetch(`${API_BASE}/v2/skills/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get all available templates grouped by category
 */
export async function getTemplates(skillId = 'gpt_image_2'): Promise<TemplatesListResponse> {
  const response = await fetch(`${API_BASE}/v2/skills/templates?skill_id=${skillId}`)

  if (!response.ok) {
    throw new Error(`Templates API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Start async image generation task
 */
export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/v2/skills/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Generate API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Poll task status
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const response = await fetch(`${API_BASE}/v2/skills/tasks/${taskId}`)

  if (!response.ok) {
    throw new Error(`Task status API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get all template categories (lightweight)
 */
export async function getTemplateCategories(skillId = 'gpt_image_2'): Promise<{ categories: { id: string; name: string; template_count: number }[] }> {
  const response = await fetch(`${API_BASE}/v2/skills/templates/categories?skill_id=${skillId}`)

  if (!response.ok) {
    throw new Error(`Categories API error: ${response.status}`)
  }

  return response.json()
}