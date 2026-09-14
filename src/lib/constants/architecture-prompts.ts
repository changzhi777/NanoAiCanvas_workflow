// Architecture Rendering Prompts
// 建筑效果图提示词模板 - 中英混合格式

export interface ArchitectureScene {
  id: string
  label: string
  description: string
  type: 'interior' | 'exterior'
}

export interface ArchitectureStyle {
  id: string
  label: string
  description: string
}

// 室内场景模板
export const INTERIOR_SCENES: ArchitectureScene[] = [
  {
    id: 'living-room',
    label: '客厅',
    description: '现代/北欧/工业风格客厅',
    type: 'interior',
  },
  {
    id: 'bedroom',
    label: '卧室',
    description: '主卧/次卧/酒店客房',
    type: 'interior',
  },
  {
    id: 'kitchen',
    label: '厨房',
    description: '现代/传统风格厨房',
    type: 'interior',
  },
  {
    id: 'bathroom',
    label: '浴室',
    description: '豪华/简约风格浴室',
    type: 'interior',
  },
  {
    id: 'office',
    label: '办公室',
    description: '开放式/独立办公室',
    type: 'interior',
  },
  {
    id: 'hotel-lobby',
    label: '酒店大堂',
    description: '酒店大堂/公共空间',
    type: 'interior',
  },
]

// 室外场景模板
export const EXTERIOR_SCENES: ArchitectureScene[] = [
  {
    id: 'residential',
    label: '住宅',
    description: '独栋住宅/联排别墅',
    type: 'exterior',
  },
  {
    id: 'commercial',
    label: '商业建筑',
    description: '商业综合体/零售店铺',
    type: 'exterior',
  },
  {
    id: 'office-building',
    label: '办公楼',
    description: '现代办公楼/企业总部',
    type: 'exterior',
  },
  {
    id: 'villa',
    label: '别墅',
    description: '豪华别墅/度假别墅',
    type: 'exterior',
  },
  {
    id: 'hotel',
    label: '酒店',
    description: '酒店建筑外观',
    type: 'exterior',
  },
  {
    id: 'public-building',
    label: '公共建筑',
    description: '博物馆/图书馆/文化中心',
    type: 'exterior',
  },
]

// 建筑风格选项
export const ARCHITECTURE_STYLES: ArchitectureStyle[] = [
  { id: 'modern', label: '现代', description: '简洁线条，大面积玻璃' },
  { id: 'nordic', label: '北欧', description: '浅色木材，温馨自然' },
  { id: 'industrial', label: '工业风', description: '裸露结构，金属材质' },
  { id: 'minimalist', label: '极简', description: '纯净空间，留白设计' },
  { id: 'luxury', label: '奢华', description: '大理石，黄铜，高端材质' },
  { id: 'japanese', label: '日式', description: '禅意，木质，自然元素' },
  { id: 'mediterranean', label: '地中海', description: '白色墙面，拱形门窗' },
  { id: 'brutalist', label: '粗野主义', description: '混凝土，几何形态' },
]

// 风格中英文映射
const STYLE_MAP: Record<string, { cn: string; en: string }> = {
  'modern': { cn: '现代', en: 'modern contemporary' },
  'nordic': { cn: '北欧', en: 'Nordic Scandinavian' },
  'industrial': { cn: '工业风', en: 'industrial' },
  'minimalist': { cn: '极简', en: 'minimalist' },
  'luxury': { cn: '奢华', en: 'luxury high-end' },
  'japanese': { cn: '日式', en: 'Japanese Zen' },
  'mediterranean': { cn: '地中海', en: 'Mediterranean' },
  'brutalist': { cn: '粗野主义', en: 'brutalist' },
}

// 室内提示词模板 - 中英混合
const INTERIOR_PROMPT_TEMPLATES: Record<string, (desc: string, styleCn: string, styleEn: string) => string> = {
  'living-room': (desc, styleCn, styleEn) =>
    `现代${styleCn}风格客厅室内效果图，${desc}，落地窗设计引入充足自然光线，浅色橡木地板搭配奶油色布艺沙发，圆型胡桃木茶几，温馨舒适的居住氛围。Photorealistic ${styleEn} style living room interior rendering, floor-to-ceiling windows with abundant natural light, light oak flooring, cream boucle sofa with linen cushions, round walnut coffee table, late afternoon golden hour light casting soft shadows, wide-angle lens at eye level, high quality, detailed, architectural photography, 8K, professional interior design`,

  'bedroom': (desc, styleCn, styleEn) =>
    `${styleCn}风格精品酒店卧室室内效果图，${desc}，特大号床配白色比利时亚麻床品，皮革床头板两侧配黄铜阅读灯，落地窗配纱帘可俯瞰城市天际线，柔和温暖的氛围灯光。Photorealistic ${styleEn} style boutique hotel bedroom interior, king-size bed with white Belgian linen sheets, leather headboard with brass reading lamps, floor-to-ceiling sheer curtains with city skyline view, soft warm ambient lighting, high quality, detailed, architectural photography, 8K, professional interior design`,

  'kitchen': (desc, styleCn, styleEn) =>
    `${styleCn}风格厨房室内效果图，${desc}，哑光橱柜配一体化把手，瀑布式大理石岛台，黄铜吊灯照明，台面摆放新鲜食材，戏剧性的光影效果，建筑杂志风格。Photorealistic ${styleEn} style kitchen interior, matte cabinetry with integrated handles, waterfall-edge marble island, brass pendant lights, fresh elements on countertop, moody dramatic lighting, architectural magazine editorial style, high quality, detailed, architectural photography, 8K, professional interior design`,

  'bathroom': (desc, styleCn, styleEn) =>
    `豪华${styleCn}风格浴室室内效果图，${desc}，优雅的白色大理石洗手台，哑光金色水龙头，壁挂式白色陶瓷马桶，大镜子映照奢华装饰，白色和灰色纹理大理石瓷砖，柔和LED灯带营造温暖氛围。Photorealistic luxury ${styleEn} style bathroom interior, elegant white marble sink, matte gold faucet, wall-mounted toilet in sleek white ceramic, large mirror reflecting opulent decor, white and grey veined marble tiles, soft LED lighting casting warm glow, high quality, detailed, architectural photography, 8K, professional interior design`,

  'office': (desc, styleCn, styleEn) =>
    `${styleCn}风格办公室室内效果图，${desc}，开放式平面布局配模块化工位，抛光混凝土地面，钢框窗户，自然日光透过大面积窗户洒入，整洁有序的工作空间。Photorealistic ${styleEn} style office space interior, open floor plan with modular workstations, polished concrete floors, steel-framed windows, natural daylight flooding through large windows, clean organized workspace, high quality, detailed, architectural photography, 8K, professional interior design`,

  'hotel-lobby': (desc, styleCn, styleEn) =>
    `${styleCn}风格酒店大堂室内效果图，${desc}，极简风格接待台，温暖灯光设计，大型盆栽植物，天然石材地砖，宏伟入口配高挑天花板，精致灯光设计。Photorealistic ${styleEn} style hotel lobby interior, minimalist reception desk, warm lighting, large potted plants, natural stone floor tiles, grand entrance with high ceilings, sophisticated lighting design, high quality, detailed, architectural photography, 8K, professional interior design`,
}

// 室外提示词模板 - 中英混合
const EXTERIOR_PROMPT_TEMPLATES: Record<string, (desc: string, styleCn: string, styleEn: string) => string> = {
  'residential': (desc, styleCn, styleEn) =>
    `${styleCn}风格当代双层住宅外观效果图，${desc}，简洁的渲染墙面配木饰面点缀，平顶配隐藏式排水，前院有成熟树木，混凝土小径通向前门，金色夕阳在草坪上投下长影。Photorealistic ${styleEn} style contemporary two-storey home exterior at golden hour, clean rendered walls with timber cladding accents, flat roof with hidden guttering, mature tree in front garden, concrete pathway leading to front door, long shadows on lawn, shot from street at eye level, high quality, detailed, architectural photography, 8K, professional exterior design`,

  'commercial': (desc, styleCn, styleEn) =>
    `${styleCn}风格商业建筑外观效果图，${desc}，玻璃幕墙配金属装饰，大型展示橱窗，现代入口设计，行人经过，城市环境配街道照明，黄昏时分戏剧性光影效果。Photorealistic ${styleEn} style commercial building facade, glass curtain wall with metal accents, large display windows, modern entrance design, pedestrians walking by, urban setting with street lighting, shot at dusk with dramatic lighting effects, high quality, detailed, architectural photography, 8K, professional exterior design`,

  'office-building': (desc, styleCn, styleEn) =>
    `${styleCn}风格办公大楼外观效果图，${desc}，幕墙玻璃配遮阳翼片，蓝天下简洁现代的轮廓，街景层专业景观设计，人们到达入口，正午自然光线，锐利的建筑细节。Photorealistic ${styleEn} style office tower exterior, curtain wall glazing with solar shading fins, sleek modern silhouette against blue sky, professional landscaping at street level, people arriving at entrance, midday natural lighting with sharp architectural details, high quality, detailed, architectural photography, 8K, professional exterior design`,

  'villa': (desc, styleCn, styleEn) =>
    `豪华${styleCn}风格别墅外观效果图，${desc}，全景窗户，柔和的室内灯光透出，现代建筑元素，可见游泳池或花园，地中海或热带环境，黄金时段光线营造温暖氛围。Photorealistic luxury ${styleEn} style villa exterior, panoramic windows, soft interior light glowing, modern architectural elements, swimming pool or garden visible, Mediterranean or tropical setting, golden hour lighting creating warm atmosphere, high quality, detailed, architectural photography, 8K, professional exterior design`,

  'hotel': (desc, styleCn, styleEn) =>
    `${styleCn}风格酒店建筑外观效果图，${desc}，宏伟入口配门廊，多层配阳台景观，专业景观设计，客人抵达，奢华氛围，傍晚拍摄窗户透出温暖室内灯光。Photorealistic ${styleEn} style hotel building exterior, grand entrance with porte-cochere, multiple floors with balcony views, professional landscaping, arriving guests, luxury atmosphere, evening shot with warm interior lights visible through windows, high quality, detailed, architectural photography, 8K, professional exterior design`,

  'public-building': (desc, styleCn, styleEn) =>
    `${styleCn}风格公共建筑外观效果图，${desc}，当代设计配文化元素，大型入口广场，访客走近，城市环境配周边建筑，自然日光突出建筑细节和材质。Photorealistic ${styleEn} style public building exterior, contemporary design with cultural elements, large entrance plaza, visitors approaching, urban context with surrounding architecture, natural daylight highlighting architectural details and materials, high quality, detailed, architectural photography, 8K, professional exterior design`,
}

// 生成建筑效果图提示词
export function buildArchitecturePrompt(
  sceneId: string,
  sceneType: 'interior' | 'exterior',
  styleId: string,
  description: string,
  hasReferenceImage: boolean = false
): string {
  const templates = sceneType === 'interior' ? INTERIOR_PROMPT_TEMPLATES : EXTERIOR_PROMPT_TEMPLATES
  const template = templates[sceneId]

  const styleInfo = STYLE_MAP[styleId] || { cn: '现代', en: 'modern contemporary' }
  const styleCn = styleInfo.cn
  const styleEn = styleInfo.en

  if (!template) {
    // 默认模板 - 中英混合
    const typeLabelCn = sceneType === 'interior' ? '室内' : '室外'
    const typeLabelEn = sceneType === 'interior' ? 'interior' : 'exterior'
    return `${styleCn}风格建筑${typeLabelCn}效果图，${description}。Photorealistic ${styleEn} style architectural ${typeLabelEn} rendering, ${description}, high quality, detailed, architectural photography, 8K, professional design`
  }

  let prompt = template(description, styleCn, styleEn)

  if (hasReferenceImage) {
    prompt = `参考建筑设计图，根据参考图的风格和布局生成效果图。\n\n${prompt}`
  }

  return prompt
}

// 获取场景图标
export function getSceneIcon(sceneId: string): string {
  const icons: Record<string, string> = {
    'living-room': '🛋',
    'bedroom': '🛏',
    'kitchen': '🍳',
    'bathroom': '🚿',
    'office': '💼',
    'hotel-lobby': '🏨',
    'residential': '🏠',
    'commercial': '🏪',
    'office-building': '🏢',
    'villa': '🏡',
    'hotel': '🏩',
    'public-building': '🏛️',
  }
  return icons[sceneId] || '🏗️'
}
