import type { KnowledgeCardCategory, CardStyle, MindmapStyle, MindmapNode } from '@/types'

// Knowledge card categories
export type CardCategoryFilter = KnowledgeCardCategory | 'all'

export const KNOWLEDGE_CARD_CATEGORIES: { value: CardCategoryFilter; label: string; keywords: string[] }[] = [
  { value: 'math', label: '数学', keywords: ['公式', '定理', '方程', '函数', '几何'] },
  { value: 'physics', label: '物理', keywords: ['力学', '电学', '光学', '热学', '能量'] },
  { value: 'chemistry', label: '化学', keywords: ['元素', '反应', '分子', '化学键', '周期表'] },
  { value: 'biology', label: '生物', keywords: ['细胞', '遗传', '生态', '进化', '基因'] },
  { value: 'history', label: '历史', keywords: ['朝代', '战争', '人物', '事件', '年代'] },
  { value: 'geography', label: '地理', keywords: ['地形', '气候', '国家', '地图', '资源'] },
  { value: 'chinese', label: '语文', keywords: ['诗词', '文言文', '成语', '修辞', '作文'] },
  { value: 'english', label: '英语', keywords: ['语法', '词汇', '时态', '句型', '单词'] },
  { value: 'other', label: '其他', keywords: [] },
]

// Card style options
export const CARD_STYLE_OPTIONS: { value: CardStyle; label: string; description: string }[] = [
  { value: 'minimal', label: '简约彩铅', description: '清新简约、留白舒适' },
  { value: 'colorful', label: '彩虹涂鸦', description: '多彩丰富、活泼可爱' },
  { value: 'handwritten', label: '温馨手账', description: '手账风格、温暖治愈' },
]

// Mindmap style options (extends card styles with dedicated layouts)
export const MINDMAP_STYLE_OPTIONS: { value: MindmapStyle; label: string; description: string; icon: string }[] = [
  { value: 'minimal', label: '简约彩铅', description: '复用知识卡片样式', icon: '🎨' },
  { value: 'colorful', label: '彩虹涂鸦', description: '复用知识卡片样式', icon: '🌈' },
  { value: 'handwritten', label: '温馨手账', description: '复用知识卡片样式', icon: '📔' },
  { value: 'tree', label: '树形导图', description: '经典树形层级结构', icon: '🌳' },
  { value: 'radial', label: '放射导图', description: '中心向四周发散', icon: '☀️' },
  { value: 'fishbone', label: '鱼骨导图', description: '因果分析结构', icon: '🐟' },
]

// Category icons mapping
export const CATEGORY_ICONS: Record<CardCategoryFilter, string> = {
  all: '📚',
  math: '📐',
  physics: '⚡',
  chemistry: '🧪',
  biology: '🧬',
  history: '📜',
  geography: '🌍',
  chinese: '📖',
  english: '🔤',
  other: '📌',
}

// Fixed style rules - Cute Colored Pencil Hand-Drawn Doodle Style
const BASE_DOODLE_STYLE = `【核心风格规则 - 每次必须严格遵守】
风格: 可爱彩铅手绘涂鸦 (Full-Color Hand-Drawn Doodle)
- 模拟彩色铅笔/蜡笔/水彩填色效果
- 柔和黑色细线勾勒轮廓
- 竖版 3:4 构图

【配色要求】
- 明亮清新马卡龙色系或柔和彩虹色
- 颜色填充有自然笔触感，非数字平涂
- 边缘自然融合，不做锐利边界

【字体风格】
- 全部使用彩色手写体，绝对不用电脑字体
- 标题用粗体手写艺术字，醒目可爱
- 正文用自然笔记手写体，清晰易读
- 亲切感十足，像学霸的手写笔记

【图形元素】
- 充满色彩的简单涂鸦/简笔画 (colorful doodle/stick figure)
- 用手绘彩色箭头、框线、项目符号组织信息
- 小插图、小图标装饰点缀
- 可爱的卡通元素增强趣味性

【内容处理】
- 信息精炼，关键词用彩色手绘框突出
- 图画讲知识，文字只做极简标签
- 用图画代替大段文字说明
- 手绘高亮标记重点内容

【输出规格】
- 中文绘制，排版一页
- 印刷级清晰，所有中文作为独立文字图层
- 高分辨率 4K 输出
- 米色淡纹理背景，自然彩铅笔触质感`

// Card style variations
export const CARD_STYLE_PROMPTS: Record<CardStyle, string> = {
  minimal: `${BASE_DOODLE_STYLE}

【简约彩铅变体】
- 更多留白，视觉更清爽
- 配色偏向柔和单色系（如粉色系、蓝色系、绿色系）
- 图形元素精简，突出核心内容
- 适合内容较多需要清晰呈现的知识点`,

  colorful: `${BASE_DOODLE_STYLE}

【彩虹涂鸦变体】
- 丰富的彩虹色运用
- 更多可爱的装饰元素
- 活泼跳跃的版式设计
- 适合需要吸引注意力的知识点`,

  handwritten: `${BASE_DOODLE_STYLE}

【温馨手账变体】
- 模拟真实手账本纸张质感
- 加入和纸胶带、贴纸元素
- 更温馨治愈的配色
- 像是精心制作的成长记录手账`,
}

// Mindmap layout style variations
const MINDMAP_LAYOUT_PROMPTS: Record<'tree' | 'radial' | 'fishbone', string> = {
  tree: `【思维导图 - 树形布局】
- 从上到下的层级树形结构
- 每个层级用不同的彩色手绘框区分
- 节点之间用手绘曲线连接
- 层级越深，框越小、颜色越浅
- 根节点最大最醒目，居中顶部
- 适合展示层级关系清晰的知识结构`,

  radial: `【思维导图 - 放射布局】
- 中心主题位于画面中央，用大型彩色圆形/云朵框包裹
- 分支向四周放射状展开
- 每个分支用不同的主题色区分
- 连接线为柔和的彩色曲线
- 整体呈现花朵/太阳般的放射形态
- 适合展示围绕核心展开的关联知识`,

  fishbone: `【思维导图 - 鱼骨布局】
- 主干为水平或倾斜的粗线（鱼脊）
- 分支从主干的上下两侧斜向伸出
- 每个分支代表一个类别或原因
- 末端可继续分出更细的支线
- 形状像鱼骨，因果清晰
- 适合展示问题分析、因果关系类知识`,
}

// Category-specific visual elements for doodle style
export const CATEGORY_VISUAL_ELEMENTS: Record<KnowledgeCardCategory, string> = {
  math: `【数学涂鸦元素】
- 可爱的数字符号（∑、∫、π、∞）手绘版
- 彩色坐标系、函数曲线
- 几何图形（三角形、圆形、立方体）涂鸦
- 公式用彩色框框起来
- 计算步骤用手绘箭头连接`,

  physics: `【物理涂鸦元素】
- 可爱的物理公式手写版
- 力的箭头、速度矢量用彩铅绘制
- 小灯泡、电池、电路涂鸦
- 波浪线表示波动
- 实验器材简笔画（试管、电路板）`,

  chemistry: `【化学涂鸦元素】
- 可爱的分子结构涂鸦（小球和棍子）
- 彩色元素周期表格子
- 试管、烧杯、酒精灯简笔画
- 化学反应箭头和条件标注
- 气泡、沉淀物手绘效果`,

  biology: `【生物涂鸦元素】
- 可爱的DNA双螺旋涂鸦
- 细胞结构简笔画（圆圈表示细胞）
- 植物叶片、花朵、小动物涂鸦
- 食物链用箭头和简笔画连接
- 显微镜下的世界简笔画`,

  history: `【历史涂鸦元素】
- 可爱的时间轴手绘
- 古代人物简笔画头像
- 卷轴、竹简书卷涂鸦
- 地图上的标注和路线
- 朝代用不同颜色区分`,

  geography: `【地理涂鸦元素】
- 可爱的地球仪涂鸦
- 地图轮廓手绘版
- 山脉、河流、平原简笔画
- 气候图标（太阳、云、雨、雪）
- 指南针、经纬线装饰`,

  chinese: `【语文涂鸦元素】
- 毛笔字效果的手写标题
- 古典花纹边框涂鸦
- 诗词意境简笔画
- 水墨风格的云、山、水
- 书卷、印章装饰元素`,

  english: `【英语涂鸦元素】
- 可爱的英文字母装饰
- 单词卡片式排版
- 对话气泡涂鸦
- 国际元素小图标
- 语法规则用彩色框区分`,

  other: `【通用涂鸦元素】
- 可爱的星星、爱心、箭头
- 彩色标签、编号圈圈
- 重点内容用手绘框突出
- 装饰性的波浪线、点线
- 清新自然的配色方案`,
}

// Category enhancement config
interface CategoryEnhancementConfig {
  designKeywords: string[]
}

const CATEGORY_ENHANCEMENT_CONFIG: Record<KnowledgeCardCategory, CategoryEnhancementConfig> = {
  math: {
    designKeywords: ['公式用彩色框', '步骤箭头连接', '图形涂鸦化', '重点圈画', '简洁标注'],
  },
  physics: {
    designKeywords: ['矢量箭头彩色', '公式居中框选', '实验简笔画', '单位标注', '过程图解'],
  },
  chemistry: {
    designKeywords: ['分子结构涂鸦', '反应条件标注', '颜色区分物质', '实验步骤图示', '安全提示'],
  },
  biology: {
    designKeywords: ['结构简笔画', '功能标签', '分类用颜色区分', '生态链图示', '放大镜效果'],
  },
  history: {
    designKeywords: ['时间轴手绘', '人物头像涂鸦', '地图标注', '朝代颜色码', '事件流程'],
  },
  geography: {
    designKeywords: ['地图轮廓手绘', '气候图标', '地形剖面简笔画', '资源小图标', '经纬网格'],
  },
  chinese: {
    designKeywords: ['原文框选', '注释彩色标注', '意境简笔画', '修辞手法标签', '主题高亮'],
  },
  english: {
    designKeywords: ['Definition box', 'Example highlight', 'Grammar tips doodle', 'Vocabulary cards', 'Usage bubbles'],
  },
  other: {
    designKeywords: ['重点彩色框', '关键词高亮', '流程箭头', '分类标签', '装饰涂鸦'],
  },
}

/**
 * Build knowledge card prompt with cute doodle style
 */
export function buildKnowledgeCardPrompt(
  title: string,
  content: string,
  category: KnowledgeCardCategory,
  style: CardStyle,
  enableKeywordEnhancement: boolean = true
): string {
  const stylePrompt = CARD_STYLE_PROMPTS[style]
  const visualElements = CATEGORY_VISUAL_ELEMENTS[category]
  const categoryConfig = CATEGORY_ENHANCEMENT_CONFIG[category]

  const keywordHints = enableKeywordEnhancement
    ? `\n\n【排版技巧】\n${categoryConfig.designKeywords.join('、')}`
    : ''

  return `${stylePrompt}

${visualElements}${keywordHints}

【卡片内容】
标题：${title}

知识点内容：
${content}

【绘制要求】
1. 提取核心主题作为大标题，用彩色粗体手写艺术字
2. 将知识点拆解为3-5个要点，每个要点配一个可爱的涂鸦图示
3. 用手绘彩色箭头、框线组织信息流
4. 关键词用彩色手绘框或高亮标记
5. 整体版式清晰，信息层次分明
6. 保持可爱温馨的彩铅手绘风格
7. 确保所有文字清晰可读，中文独立成图层
8. 输出4K高清竖版3:4知识卡片图片`
}

/**
 * Convert mindmap node tree to text format for prompt
 */
function mindmapNodeToText(node: MindmapNode, depth: number = 0): string {
  const indent = '  '.repeat(depth)
  const prefix = depth === 0 ? '📌' : depth === 1 ? '├─' : '│  ├─'
  let text = `${indent}${prefix} ${node.text}`

  if (node.children.length > 0) {
    text += '\n' + node.children.map((child) => mindmapNodeToText(child, depth + 1)).join('\n')
  }

  return text
}

/**
 * Get mindmap layout prompt based on style
 */
function getMindmapLayoutPrompt(style: MindmapStyle): string {
  if (style === 'tree' || style === 'radial' || style === 'fishbone') {
    return MINDMAP_LAYOUT_PROMPTS[style]
  }
  // For card styles (minimal, colorful, handwritten), use tree layout as default
  return MINDMAP_LAYOUT_PROMPTS.tree
}

/**
 * Get base style prompt for mindmap
 */
function getMindmapBaseStyle(style: MindmapStyle): string {
  if (style === 'minimal' || style === 'colorful' || style === 'handwritten') {
    return CARD_STYLE_PROMPTS[style]
  }
  // For dedicated mindmap styles, use colorful as base
  return CARD_STYLE_PROMPTS.colorful
}

/**
 * Build mindmap card prompt
 */
export function buildMindmapPrompt(
  rootNode: MindmapNode,
  category: KnowledgeCardCategory,
  style: MindmapStyle
): string {
  const baseStyle = getMindmapBaseStyle(style)
  const layoutPrompt = getMindmapLayoutPrompt(style)
  const visualElements = CATEGORY_VISUAL_ELEMENTS[category]
  const categoryConfig = CATEGORY_ENHANCEMENT_CONFIG[category]

  const mindmapText = mindmapNodeToText(rootNode)

  return `${baseStyle}

${layoutPrompt}

${visualElements}

【排版技巧】
${categoryConfig.designKeywords.join('、')}

【思维导图内容】
${mindmapText}

【绘制要求】
1. 将上述思维导图结构绘制为可爱的彩铅手绘风格思维导图
2. 根节点（📌标记）用最大最醒目的彩色手绘框，位于核心位置
3. 一级分支用不同主题色区分，每个分支配一个简单涂鸦图标
4. 子节点层级递进，框逐渐变小，颜色渐浅
5. 节点之间用柔和的彩色手绘曲线连接
6. 所有文字使用彩色手写体，清晰可读
7. 关键词用手绘高亮框标记
8. 整体保持可爱温馨的彩铅手绘风格
9. 确保所有中文作为独立文字图层
10. 输出4K高清竖版3:4思维导图卡片图片`
}
