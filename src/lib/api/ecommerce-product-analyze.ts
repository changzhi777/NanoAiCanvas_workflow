/**
 * 电商产品图片分析 API
 * 使用 GLM-5V-Turbo 视觉模型分析产品图，提取产品信息和卖点
 */

import type { ProductAnalysis } from '@/lib/constants/ecommerce-prompts'

const GLM_VISION_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 系统提示词：专业的电商产品分析专家
const PRODUCT_ANALYSIS_SYSTEM = `你是一位专业的电商产品分析专家。请仔细分析用户上传的产品图片，提取以下信息并以JSON格式返回：

{
  "productName": "产品名称（简洁准确）",
  "brand": "品牌名称",
  "category": "产品品类（如：牙膏、护肤品、食品、电子产品等）",
  "mainTitle": "主标题文案（吸引眼球的核心卖点，10字以内）",
  "subTitle": "副标题文案（补充说明，15字以内）",
  "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4"],
  "comparisonContent": "对比效果描述（如：使用前暗沉 vs 使用后亮白）",
  "usageScene": "使用场景描述（如：浴室洗漱台、卧室床头、办公室桌面）",
  "brandSlogan": "品牌口号（如果有LOGO上的slogan，没有则根据产品特点创作一个）",
  "colorScheme": "主色调描述（如：蓝白渐变、粉金配色、绿色清新）",
  "packaging": "包装描述（如：管装+纸盒套装、瓶装、袋装等，包含尺寸估计）"
}

分析要点：
1. 识别产品类型、品牌、包装设计
2. 读取包装上的文字信息（LOGO、产品名、卖点文案）
3. 分析产品颜色、材质、设计风格
4. 推断产品适用场景和目标用户
5. 提取或创作有吸引力的营销文案

请直接返回JSON，不要添加任何解释或额外内容。`

export interface AnalyzeProductOptions {
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
 * 解析 GLM 返回的 JSON（处理可能的格式问题）
 */
function parseProductAnalysis(content: string): ProductAnalysis {
  // 尝试直接解析
  try {
    return JSON.parse(content)
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // 继续尝试其他方式
      }
    }
  }

  // 返回默认值
  return {
    productName: '未知产品',
    brand: '未知品牌',
    category: '其他',
    mainTitle: '优质产品推荐',
    subTitle: '品质生活之选',
    sellingPoints: ['高品质', '性价比高', '口碑好', '实用性强'],
    comparisonContent: '使用前 vs 使用后效果对比',
    usageScene: '日常生活场景',
    brandSlogan: '品质生活，从这里开始',
    colorScheme: ['清新简约配色'],
    packagingDetails: '精美包装',
  }
}

/**
 * 分析电商产品图片
 */
export async function analyzeEcommerceProduct(options: AnalyzeProductOptions): Promise<ProductAnalysis> {
  const { imageBase64, apiKey, model = 'glm-5v-turbo' } = options

  // 调试：验证 API Key 格式

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
              text: PRODUCT_ANALYSIS_SYSTEM,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[analyzeEcommerceProduct] API Error:', response.status, errorText)
    throw new Error(`GLM Vision API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // 解析响应
  const choice = data.choices?.[0]
  const content = choice?.message?.content || choice?.text || choice?.delta?.content

  if (!content) {
    console.warn('[analyzeEcommerceProduct] No content found in response')
    throw new Error('未能从图片中提取产品信息，请重试')
  }

  return parseProductAnalysis(content.trim())
}
