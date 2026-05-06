/**
 * Skills 工作流模板 - 18 个模板
 * 每个模板 = 数据输入节点 → Skills 任务节点 → 输出预览节点
 */

import { WorkflowNode, WorkflowEdge } from '@/stores/nanoaiWorkflowStore'

// ==================== 节点位置常量 ====================

const NODE_WIDTH = 280
const HORIZONTAL_GAP = 180
const START_X = 100
const START_Y = 300

// ==================== 工厂函数 ====================

function createSkillsWorkflow(
  id: string,
  name: string,
  description: string,
  category: string,
  tags: string[],
  nodeIds: {
    dataId: string
    taskId: string
    previewId: string
    outputId: string
  }
): {
  id: string
  name: string
  description: string
  category: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  tags: string[]
  createdAt: string
  updatedAt: string
} {
  return {
    id,
    name,
    description,
    category,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: nodeIds.dataId,
        type: 'skills_data',
        position: { x: START_X, y: START_Y },
        data: {
          label: '数据输入',
          params: {
            templateCategory: category,
            templateId: '',
            templateName: '',
            dynamicParams: {},
          },
          inputs: [],
          outputs: [
            { id: 'data-out', name: '数据', type: 'object', required: false }
          ],
          status: 'idle' as any,
        },
      },
      {
        id: nodeIds.taskId,
        type: 'skills_task',
        position: { x: START_X + NODE_WIDTH + HORIZONTAL_GAP, y: START_Y },
        data: {
          label: 'Skills 生成',
          params: {
            templateId: '',
            templateName: '',
            formData: {},
            size: '1024x1024',
            quality: 'standard',
          },
          inputs: [
            { id: 'data-in', name: '数据', type: 'object', required: true }
          ],
          outputs: [
            { id: 'result-out', name: '结果', type: 'image', required: false }
          ],
          status: 'idle' as any,
        },
      },
      {
        id: nodeIds.previewId,
        type: 'image_preview',
        position: { x: START_X + (NODE_WIDTH + HORIZONTAL_GAP) * 2, y: START_Y },
        data: {
          label: '图片预览',
          params: {
            autoConnectSource: true,
            sourceNodeId: nodeIds.taskId,
            thumbnailSize: 'medium' as const,
            gridColumns: 2 as const,
          },
          inputs: [
            { id: 'image-in', name: '图片', type: 'image', required: true }
          ],
          outputs: [
            { id: 'data-out', name: '数据', type: 'image', required: false }
          ],
          status: 'idle' as any,
        },
      },
      // 输出节点（结束）
      {
        id: nodeIds.outputId,
        type: 'output_node',
        position: { x: START_X + (NODE_WIDTH + HORIZONTAL_GAP) * 3, y: START_Y },
        data: {
          label: '输出/保存',
          params: {
            enableAssetSave: true,
            assetSaveScope: 'image_with_metadata',
            assetCategory: 'ai-generated',
            enableDownload: false,
            downloadFolder: 'NanoAI_Downloads',
            downloadNaming: 'timestamp',
            downloadCustomTemplate: '',
            downloadConflict: 'rename',
            includeUserInfo: true,
            includeTimestamp: true,
          },
          inputs: [
            { id: 'data-in', name: '数据', type: 'image', required: true }
          ],
          outputs: [],
          status: 'idle' as any,
        },
      },
    ],
    edges: [
      {
        id: `edge-${nodeIds.dataId}-${nodeIds.taskId}`,
        source: nodeIds.dataId,
        target: nodeIds.taskId,
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3ecf8e', strokeWidth: 2 },
        data: { type: 'auto' },
      },
      {
        id: `edge-${nodeIds.taskId}-${nodeIds.previewId}`,
        source: nodeIds.taskId,
        target: nodeIds.previewId,
        sourceHandle: 'result-out',
        targetHandle: 'image-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { type: 'auto' },
      },
      {
        id: `edge-${nodeIds.previewId}-${nodeIds.outputId}`,
        source: nodeIds.previewId,
        target: nodeIds.outputId,
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 },
        data: { type: 'auto' },
      },
    ],
  }
}

// ==================== 18 个模板定义 ====================

// 1. UI 界面工作流
export const skillsUiMockupsWorkflow = createSkillsWorkflow(
  'skills-ui-mockups',
  'UI 界面工作流',
  '电商直播 UI、社交平台动态、产品卡片等 UI 界面模板',
  'custom',
  ['UI', '界面', '直播', '社交', '电商'],
  { dataId: 'node-skills-ui-data', taskId: 'node-skills-ui-task', previewId: 'node-skills-ui-preview', outputId: 'node-skills-ui-output' }
)

// 2. 产品视觉工作流
export const skillsProductVisualsWorkflow = createSkillsWorkflow(
  'skills-product-visuals',
  '产品视觉工作流',
  '产品爆炸视图、纯白底主图、高级影棚商业产品图',
  'custom',
  ['产品', '电商', '爆炸图', '白底'],
  { dataId: 'node-skills-product-data', taskId: 'node-skills-product-task', previewId: 'node-skills-product-preview', outputId: 'node-skills-product-output' }
)

// 3. 地图信息图工作流
export const skillsMapsWorkflow = createSkillsWorkflow(
  'skills-maps',
  '地图信息图工作流',
  '城市美食地图、旅行路线图、门店分布图',
  'custom',
  ['地图', '美食', '旅行', '路线'],
  { dataId: 'node-skills-maps-data', taskId: 'node-skills-maps-task', previewId: 'node-skills-maps-preview', outputId: 'node-skills-maps-output' }
)

// 4. 幻灯片工作流
export const skillsSlidesWorkflow = createSkillsWorkflow(
  'skills-slides',
  '幻灯片工作流',
  '密集讲解幻灯片、政策风格说明、项目汇报',
  'custom',
  ['幻灯片', 'PPT', '汇报', '政策'],
  { dataId: 'node-skills-slides-data', taskId: 'node-skills-slides-task', previewId: 'node-skills-slides-preview', outputId: 'node-skills-slides-output' }
)

// 5. 海报宣传工作流
export const skillsPosterWorkflow = createSkillsWorkflow(
  'skills-poster',
  '海报宣传工作流',
  '品牌主海报、Campaign KV、杂志封面、banner',
  'custom',
  ['海报', '品牌', '宣传', 'KV'],
  { dataId: 'node-skills-poster-data', taskId: 'node-skills-poster-task', previewId: 'node-skills-poster-preview', outputId: 'node-skills-poster-output' }
)

// 6. 人物肖像工作流
export const skillsPortraitsWorkflow = createSkillsWorkflow(
  'skills-portraits',
  '人物肖像工作流',
  '职业商务肖像、创始人媒体大片、角色设定稿',
  'custom',
  ['肖像', '人物', '角色', '设定'],
  { dataId: 'node-skills-portraits-data', taskId: 'node-skills-portraits-task', previewId: 'node-skills-portraits-preview', outputId: 'node-skills-portraits-output' }
)

// 7. 场景插画工作流
export const skillsScenesWorkflow = createSkillsWorkflow(
  'skills-scenes',
  '场景插画工作流',
  '治愈系日常、电影感概念大场景、童书绘本场景',
  'custom',
  ['场景', '插画', '治愈', '绘本'],
  { dataId: 'node-skills-scenes-data', taskId: 'node-skills-scenes-task', previewId: 'node-skills-scenes-preview', outputId: 'node-skills-scenes-output' }
)

// 8. 编辑工作流
export const skillsEditingWorkflow = createSkillsWorkflow(
  'skills-editing',
  '编辑工作流',
  '背景替换、局部对象替换、杂物去除、产品精修',
  'custom',
  ['编辑', '修图', '背景替换', '精修'],
  { dataId: 'node-skills-editing-data', taskId: 'node-skills-editing-task', previewId: 'node-skills-editing-preview', outputId: 'node-skills-editing-output' }
)

// 9. 头像人设工作流
export const skillsAvatarsWorkflow = createSkillsWorkflow(
  'skills-avatars',
  '头像人设工作流',
  '风格迁移头像、角色网格肖像、贴纸套装、系列肖像',
  'custom',
  ['头像', '人设', '风格迁移', '贴纸'],
  { dataId: 'node-skills-avatars-data', taskId: 'node-skills-avatars-task', previewId: 'node-skills-avatars-preview', outputId: 'node-skills-avatars-output' }
)

// 10. 故事板分镜工作流
export const skillsStoryboardsWorkflow = createSkillsWorkflow(
  'skills-storyboards',
  '故事板分镜工作流',
  '四格漫画、漫画单页、电影感分镜 contact sheet',
  'custom',
  ['故事板', '分镜', '漫画', '电影'],
  { dataId: 'node-skills-storyboards-data', taskId: 'node-skills-storyboards-task', previewId: 'node-skills-storyboards-preview', outputId: 'node-skills-storyboards-output' }
)

// 11. 网格拼贴工作流
export const skillsGridsWorkflow = createSkillsWorkflow(
  'skills-grids',
  '网格拼贴工作流',
  'Banner 网格套装、Lookbook、动漫立项 pitch board',
  'custom',
  ['网格', '拼贴', 'Banner', 'Lookbook'],
  { dataId: 'node-skills-grids-data', taskId: 'node-skills-grids-task', previewId: 'node-skills-grids-preview', outputId: 'node-skills-grids-output' }
)

// 12. 品牌包装工作流
export const skillsBrandingWorkflow = createSkillsWorkflow(
  'skills-branding',
  '品牌包装工作流',
  '品牌识别系统板、吉祥物品牌套装、化妆品包装',
  'custom',
  ['品牌', '包装', '吉祥物', '识别'],
  { dataId: 'node-skills-branding-data', taskId: 'node-skills-branding-task', previewId: 'node-skills-branding-preview', outputId: 'node-skills-branding-output' }
)

// 13. 字体排版工作流
export const skillsTypographyWorkflow = createSkillsWorkflow(
  'skills-typography',
  '字体排版工作流',
  '大字主张海报、中英双语版式、品牌字体设计',
  'custom',
  ['字体', '排版', '海报', '双语'],
  { dataId: 'node-skills-typography-data', taskId: 'node-skills-typography-task', previewId: 'node-skills-typography-preview', outputId: 'node-skills-typography-output' }
)

// 14. 素材道具工作流
export const skillsAssetsWorkflow = createSkillsWorkflow(
  'skills-assets',
  '素材道具工作流',
  '拟物/像素图标集、游戏内截图 mockup',
  'custom',
  ['素材', '道具', '图标', '游戏'],
  { dataId: 'node-skills-assets-data', taskId: 'node-skills-assets-task', previewId: 'node-skills-assets-preview', outputId: 'node-skills-assets-output' }
)

// 15. 学术图表工作流
export const skillsAcademicWorkflow = createSkillsWorkflow(
  'skills-academic',
  '学术图表工作流',
  '方法 pipeline 图、神经网络架构图、学术海报',
  'custom',
  ['学术', '论文', '图表', '架构'],
  { dataId: 'node-skills-academic-data', taskId: 'node-skills-academic-task', previewId: 'node-skills-academic-preview', outputId: 'node-skills-academic-output' }
)

// 16. 信息图表工作流
export const skillsInfographicsWorkflow = createSkillsWorkflow(
  'skills-infographics',
  '信息图表工作流',
  '高密度科普信息图、手绘风信息图、便当格信息图',
  'custom',
  ['信息图', '科普', '手绘', 'KPI'],
  { dataId: 'node-skills-infographics-data', taskId: 'node-skills-infographics-task', previewId: 'node-skills-infographics-preview', outputId: 'node-skills-infographics-output' }
)

// 17. 技术图表工作流
export const skillsTechnicalWorkflow = createSkillsWorkflow(
  'skills-technical',
  '技术图表工作流',
  '系统架构图、流程图、时序图、状态机图',
  'custom',
  ['技术', '架构', '流程图', '系统图'],
  { dataId: 'node-skills-technical-data', taskId: 'node-skills-technical-task', previewId: 'node-skills-technical-preview', outputId: 'node-skills-technical-output' }
)

// 18. 完整工作流
export const skillsCompleteWorkflow = createSkillsWorkflow(
  'skills-complete',
  '完整 Skills 工作流',
  '通用完整流程：数据输入 → Skills 生成 → 预览输出',
  'custom',
  ['完整', '通用', 'Skills'],
  { dataId: 'node-skills-complete-data', taskId: 'node-skills-complete-task', previewId: 'node-skills-complete-preview', outputId: 'node-skills-complete-output' }
)

// ==================== 导出所有模板 ====================

export const skillsWorkflowTemplates = [
  skillsUiMockupsWorkflow,
  skillsProductVisualsWorkflow,
  skillsMapsWorkflow,
  skillsSlidesWorkflow,
  skillsPosterWorkflow,
  skillsPortraitsWorkflow,
  skillsScenesWorkflow,
  skillsEditingWorkflow,
  skillsAvatarsWorkflow,
  skillsStoryboardsWorkflow,
  skillsGridsWorkflow,
  skillsBrandingWorkflow,
  skillsTypographyWorkflow,
  skillsAssetsWorkflow,
  skillsAcademicWorkflow,
  skillsInfographicsWorkflow,
  skillsTechnicalWorkflow,
  skillsCompleteWorkflow,
]

export default skillsWorkflowTemplates