export interface ProductAnalysis {
  productName: string
  brand: string
  category: string
  sellingPoints: string[]
  colorScheme: string[]
  packagingDetails: string
  mainTitle?: string
  subTitle?: string
  comparisonContent?: string
  usageScene?: string
  brandSlogan?: string
  packaging?: string
}

export const ECOMMERCE_SCENE_PROMPTS = [
  '产品正面展示图，白色背景，专业摄影，{product_name}，高清细节，商业广告风格',
  '产品使用场景图，生活化场景，自然光线，{product_name}在真实环境中的使用效果',
  '产品细节特写图，微距摄影，展示{product_name}的材质和工艺细节',
  '产品对比图，展示{product_name}的尺寸和颜色选择，简洁排版',
  '产品创意广告图，{product_name}，创意构图，品牌调性，高端商业摄影',
]

export function generateEcommercePrompts(analysis: ProductAnalysis): string[] {
  return ECOMMERCE_SCENE_PROMPTS.map(template =>
    template.replace(/{product_name}/g, analysis.productName || '产品')
  )
}
