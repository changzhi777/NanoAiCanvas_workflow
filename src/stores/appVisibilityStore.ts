/**
 * 应用可见性状态管理 Store
 * 管理 Workflow 模板/节点 + Nano 2 模块的三种可见性状态
 * 三种状态：active(可见可用) | disabled(可见不可用) | hidden(不可见)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WorkflowNodeType } from './nanoaiWorkflowStore'

// ==================== 类型定义 ====================

export type VisibilityState = 'active' | 'disabled' | 'hidden'

// 元数据定义（用于管理页面展示）
export interface VisibilityItemMeta {
  id: string
  name: string
  description: string
  category: string
}

// ==================== 默认可见性配置 ====================

// V1/V2 模板 → active，其余 → disabled
const DEFAULT_TEMPLATE_VISIBILITY: Record<WorkflowTemplateId, VisibilityState> = {
  // V1/V2 模板 - 可见可用
  'storyboard-shot-a-workflow': 'active',
  'storyboard-v2-workflow': 'active',
  // 其余模板 - 可见不可用
  'storyboard-complete': 'disabled',
  'character-design': 'disabled',
  'scene-design': 'disabled',
  'storyboard-01': 'disabled',
  'character-workflow': 'disabled',
  'scene-workflow': 'disabled',
  'quick-storyboard-v2': 'disabled',
  'dual-line-character-design': 'disabled',
  // TVC 视频
  'tvc-video-01': 'active',
  // Skills 模板
  'skills-ui-mockups': 'disabled',
  'skills-product-visuals': 'disabled',
  'skills-maps': 'disabled',
  'skills-slides': 'disabled',
  'skills-poster': 'disabled',
  'skills-portraits': 'disabled',
  'skills-scenes': 'disabled',
  'skills-editing': 'disabled',
  'skills-avatars': 'disabled',
  'skills-storyboards': 'disabled',
  'skills-grids': 'disabled',
  'skills-branding': 'disabled',
  'skills-typography': 'disabled',
  'skills-assets': 'disabled',
  'skills-academic': 'disabled',
  'skills-infographics': 'disabled',
  'skills-technical': 'disabled',
  'skills-complete': 'disabled',
}

// 所有节点默认 → disabled
const DEFAULT_NODE_VISIBILITY: Record<WorkflowNodeType, VisibilityState> = {
  // 输入
  [WorkflowNodeType.INPUT_TEXT]: 'active',
  [WorkflowNodeType.INPUT_IMAGE]: 'disabled',
  // Skills
  [WorkflowNodeType.SKILLS_DATA]: 'disabled',
  [WorkflowNodeType.SKILLS_TASK]: 'disabled',
  // 故事板分镜
  [WorkflowNodeType.STORYBOARD_SHOT_A]: 'active',
  [WorkflowNodeType.STORYBOARD_V2]: 'active',
  [WorkflowNodeType.SHOT_REF_IMAGE]: 'active',
  [WorkflowNodeType.CHARACTER_DESIGN_IMAGE]: 'active',
  [WorkflowNodeType.SCENE_DESIGN_IMAGE]: 'active',
  [WorkflowNodeType.SCRIPT_TABLE]: 'active',
  // AI 生成
  [WorkflowNodeType.SCRIPT_GENERATOR]: 'disabled',
  [WorkflowNodeType.STORYBOARD_GENERATOR]: 'disabled',
  [WorkflowNodeType.DIALOGUE_GENERATOR]: 'disabled',
  [WorkflowNodeType.CHARACTER_DESIGNER]: 'disabled',
  [WorkflowNodeType.SCENE_DESIGNER]: 'disabled',
  // 决策/逻辑
  [WorkflowNodeType.DIRECTOR_AGENT]: 'disabled',
  [WorkflowNodeType.SCREENWRITER_AGENT]: 'disabled',
  // 处理
  [WorkflowNodeType.TEXT_PROCESSOR]: 'disabled',
  [WorkflowNodeType.IMAGE_PROCESSOR]: 'disabled',
  [WorkflowNodeType.DATA_TRANSFORMER]: 'disabled',
  // 里程碑
  [WorkflowNodeType.MILESTONE]: 'disabled',
  // 输出
  [WorkflowNodeType.OUTPUT_PREVIEW]: 'disabled',
  [WorkflowNodeType.OUTPUT_EXPORT]: 'disabled',
  [WorkflowNodeType.OUTPUT_SAVE]: 'disabled',
  // MiniMax
  [WorkflowNodeType.MINIMAX_TEXT]: 'disabled',
  [WorkflowNodeType.MINIMAX_SPEECH]: 'disabled',
  [WorkflowNodeType.MINIMAX_VIDEO]: 'disabled',
  [WorkflowNodeType.MINIMAX_MUSIC]: 'disabled',
  [WorkflowNodeType.MINIMAX_IMAGE]: 'disabled',
  [WorkflowNodeType.MINIMAX_CODING]: 'disabled',
  // 图片生成
  [WorkflowNodeType.NANO_BANANA_2]: 'disabled',
  [WorkflowNodeType.NANO_BANANA_PRO]: 'disabled',
  [WorkflowNodeType.GPT_IMAGE_2]: 'disabled',
  // 即梦
  [WorkflowNodeType.JIMENG_IMAGE]: 'disabled',
  [WorkflowNodeType.JIMENG_VIDEO]: 'disabled',
  // GLM
  [WorkflowNodeType.GLM_TEXT]: 'disabled',
  [WorkflowNodeType.GLM_VIDEO]: 'disabled',
  [WorkflowNodeType.GLM_TTS]: 'disabled',
  [WorkflowNodeType.GLM_MULTIMODAL]: 'disabled',
  // 通义千问
  [WorkflowNodeType.QWEN_TEXT]: 'disabled',
  [WorkflowNodeType.QWEN_CODING]: 'disabled',
  // Kimi
  [WorkflowNodeType.KIMI_TEXT]: 'disabled',
  // 预览
  [WorkflowNodeType.IMAGE_PREVIEW]: 'active',
  [WorkflowNodeType.VIDEO_PREVIEW]: 'disabled',
  [WorkflowNodeType.AUDIO_PREVIEW]: 'disabled',
  [WorkflowNodeType.TEXT_PREVIEW]: 'disabled',
  // 输出节点
  [WorkflowNodeType.OUTPUT_NODE]: 'active',
  // 故事板视频+音频合成
  [WorkflowNodeType.STORYBOARD_VIDEO]: 'active',

  // TVC 专用节点
  [WorkflowNodeType.TVC_SCRIPT]: 'active',
}

// Nano 2 模块全部默认 active
const DEFAULT_NANO2_MODULE_VISIBILITY: Record<Nano2ModuleId, VisibilityState> = {
  'text-to-image': 'active',
  'fusion': 'active',
  'reference': 'active',
  'ai-skill': 'active',
  'prompt-enhance': 'active',
  'prompt-template': 'active',
  'prompt-wizard': 'active',
  'batch-task': 'active',
  'knowledge-card': 'active',
  'character-design': 'active',
  'ecommerce-product': 'active',
  'architecture': 'active',
  'voice': 'active',
  'storyboard': 'active',
  'banana-brother': 'active',
}

// ==================== 元数据 ====================

export const WORKFLOW_TEMPLATE_META: VisibilityItemMeta[] = [
  { id: 'storyboard-shot-a-workflow', name: '故事板分镜V1版', description: '输入描述→提示词优化→生成分镜图→预览/保存', category: 'storyboard' },
  { id: 'storyboard-v2-workflow', name: '故事板分镜V2版', description: '剧本生成→分镜头参考图+人物角色设计+场景设计+脚本表格', category: 'storyboard' },
  { id: 'storyboard-complete', name: '完整故事板生成', description: '从文案到完整故事板的4步流程', category: 'script' },
  { id: 'character-design', name: '角色设计工作流', description: '快速生成角色设计图', category: 'character' },
  { id: 'scene-design', name: '场景设计工作流', description: '快速生成场景设计图', category: 'scene' },
  { id: 'storyboard-01', name: '故事板01', description: '完整的故事板生成工作流：9步流程', category: 'story' },
  { id: 'character-workflow', name: '角色设计工作流', description: '从文案到角色设计的完整流程', category: 'character' },
  { id: 'scene-workflow', name: '场景设计工作流', description: '快速创建场景设计图', category: 'scene' },
  { id: 'quick-storyboard-v2', name: '快速分镜', description: '3步快速生成分镜图片', category: 'storyboard' },
  { id: 'dual-line-character-design', name: '双线角色设计', description: '双模型并行图片生成+预览对比', category: 'image' },
  { id: 'skills-ui-mockups', name: 'Skills: UI原型', description: 'UI/UX 模型生成', category: 'skills' },
  { id: 'skills-product-visuals', name: 'Skills: 产品视觉', description: '产品展示图生成', category: 'skills' },
  { id: 'skills-maps', name: 'Skills: 地图', description: '地图可视化生成', category: 'skills' },
  { id: 'skills-slides', name: 'Skills: 幻灯片', description: '演示文稿生成', category: 'skills' },
  { id: 'skills-poster', name: 'Skills: 海报', description: '海报设计生成', category: 'skills' },
  { id: 'skills-portraits', name: 'Skills: 人像', description: '人像照片生成', category: 'skills' },
  { id: 'skills-scenes', name: 'Skills: 场景', description: '场景图片生成', category: 'skills' },
  { id: 'skills-editing', name: 'Skills: 编辑', description: '图片编辑处理', category: 'skills' },
  { id: 'skills-avatars', name: 'Skills: 头像', description: '头像生成', category: 'skills' },
  { id: 'skills-storyboards', name: 'Skills: 故事板', description: '故事板生成', category: 'skills' },
  { id: 'skills-grids', name: 'Skills: 网格', description: '网格布局图生成', category: 'skills' },
  { id: 'skills-branding', name: 'Skills: 品牌', description: '品牌视觉生成', category: 'skills' },
  { id: 'skills-typography', name: 'Skills: 排版', description: '排版设计生成', category: 'skills' },
  { id: 'skills-assets', name: 'Skills: 资产', description: '素材资产生成', category: 'skills' },
  { id: 'skills-academic', name: 'Skills: 学术', description: '学术图表生成', category: 'skills' },
  { id: 'skills-infographics', name: 'Skills: 信息图', description: '信息图生成', category: 'skills' },
  { id: 'skills-technical', name: 'Skills: 技术', description: '技术图表生成', category: 'skills' },
  { id: 'skills-complete', name: 'Skills: 完整流程', description: '通用完整 Skills 工作流', category: 'skills' },
]

export const WORKFLOW_NODE_META: VisibilityItemMeta[] = [
  { id: 'input_text', name: '文本输入', description: '文本内容输入', category: '输入' },
  { id: 'input_image', name: '图片输入', description: '图片内容输入', category: '输入' },
  { id: 'storyboard_shot_a', name: '故事板分镜V1版', description: '输入描述→优化提示词→生成分镜图', category: '故事板分镜' },
  { id: 'storyboard_v2', name: '故事板分镜V2版', description: '智能分镜节点', category: '故事板分镜' },
  { id: 'shot_ref_image', name: '分镜头参考图', description: '生成分镜头参考图', category: '故事板分镜' },
  { id: 'character_design_image', name: '人物角色设计图', description: '生成人物角色设计图', category: '故事板分镜' },
  { id: 'scene_design_image', name: '场景设计图', description: '生成场景设计图', category: '故事板分镜' },
  { id: 'script_table', name: '分镜头脚本表格', description: '展示分镜头脚本', category: '故事板分镜' },
  { id: 'script_generator', name: '脚本生成', description: '生成故事脚本', category: 'AI生成' },
  { id: 'storyboard_generator', name: '分镜头生成', description: '生成分镜图片', category: 'AI生成' },
  { id: 'dialogue_generator', name: '对白生成', description: '生成语音', category: 'AI生成' },
  { id: 'character_designer', name: '角色设计', description: '生成角色设计图', category: 'AI生成' },
  { id: 'scene_designer', name: '场景设计', description: '生成场景设计图', category: 'AI生成' },
  { id: 'director_agent', name: '导演Agent', description: '智能决策和流程控制', category: '决策' },
  { id: 'screenwriter_agent', name: '编剧Agent', description: '创意处理和内容优化', category: '决策' },
  { id: 'text_processor', name: '文本处理器', description: '文本内容处理', category: '处理' },
  { id: 'image_processor', name: '图片处理器', description: '图片内容处理', category: '处理' },
  { id: 'data_transformer', name: '数据转换', description: '数据格式转换', category: '处理' },
  { id: 'milestone', name: '里程碑', description: '预览成果展示', category: '其他' },
  { id: 'output_preview', name: '结果预览', description: '通用结果预览', category: '输出' },
  { id: 'output_export', name: '结果导出', description: '导出结果', category: '输出' },
  { id: 'output_save', name: '结果保存', description: '保存结果', category: '输出' },
  { id: 'minimax_text', name: 'MiniMax文本', description: 'MiniMax文本生成', category: 'MiniMax' },
  { id: 'minimax_speech', name: 'MiniMax语音', description: 'MiniMax语音合成', category: 'MiniMax' },
  { id: 'minimax_video', name: 'MiniMax视频', description: 'MiniMax视频生成', category: 'MiniMax' },
  { id: 'minimax_music', name: 'MiniMax音乐', description: 'MiniMax音乐生成', category: 'MiniMax' },
  { id: 'minimax_image', name: 'MiniMax图片', description: 'MiniMax图片生成', category: 'MiniMax' },
  { id: 'minimax_coding', name: 'MiniMax编程', description: 'MiniMax编程搜索', category: 'MiniMax' },
  { id: 'nano_banana_2', name: 'NanoBanana2', description: 'NanoBanana2图片生成', category: '图片生成' },
  { id: 'nano_banana_pro', name: 'NanoBananaPro', description: 'NanoBananaPro图片生成', category: '图片生成' },
  { id: 'gpt_image_2', name: 'GPT-Image-2', description: 'GPT-Image-2图片生成', category: '图片生成' },
  { id: 'jimeng_image', name: '即梦图片', description: '即梦AI图片生成', category: '即梦' },
  { id: 'jimeng_video', name: '即梦视频', description: '即梦AI视频生成', category: '即梦' },
  { id: 'glm_text', name: '智谱文本', description: '智谱GLM文本生成', category: '智谱GLM' },
  { id: 'glm_video', name: '智谱视频', description: '智谱GLM视频生成', category: '智谱GLM' },
  { id: 'glm_tts', name: '智谱TTS', description: '智谱GLM语音合成', category: '智谱GLM' },
  { id: 'glm_multimodal', name: '智谱多模态', description: '智谱GLM多模态理解', category: '智谱GLM' },
  { id: 'qwen_text', name: '通义文本', description: '通义千问文本生成', category: '通义千问' },
  { id: 'qwen_coding', name: '通义代码', description: '通义千问代码生成', category: '通义千问' },
  { id: 'kimi_text', name: 'Kimi文本', description: 'Kimi文本生成', category: 'Kimi' },
  { id: 'image_preview', name: '图片预览', description: '展示图片结果', category: '预览' },
  { id: 'video_preview', name: '视频预览', description: '展示视频结果', category: '预览' },
  { id: 'audio_preview', name: '音频预览', description: '展示音频结果', category: '预览' },
  { id: 'text_preview', name: '文本预览', description: '展示文本结果', category: '预览' },
  { id: 'output_node', name: '输出/保存', description: '保存到资产库/下载', category: '输出' },
  { id: 'tvc_script', name: 'TVC文案/剧本', description: 'TVC专用起始节点：剧本+提示词优化+双模式执行', category: 'TVC' },
  { id: 'skills_data', name: 'Skills数据', description: 'Skills数据输入', category: 'Skills' },
  { id: 'skills_task', name: 'Skills任务', description: 'Skills任务执行', category: 'Skills' },
]

export const NANO2_MODULE_META: VisibilityItemMeta[] = [
  { id: 'text-to-image', name: '文生图', description: '文本描述生成图片', category: '生图模式' },
  { id: 'fusion', name: '融图模式', description: '多图融合生成', category: '生图模式' },
  { id: 'reference', name: '参考图模式', description: '参考图生成', category: '生图模式' },
  { id: 'ai-skill', name: 'AI Skill', description: 'AI技能模板面板', category: '生图模式' },
  { id: 'prompt-enhance', name: '提示词优化', description: '提示词优化增强', category: '工具' },
  { id: 'prompt-template', name: '提示词模板', description: '提示词模板管理', category: '工具' },
  { id: 'prompt-wizard', name: '智能生成', description: '香蕉哥哥智能生成', category: '工具' },
  { id: 'batch-task', name: '批量任务', description: '批量图片生成', category: '工具' },
  { id: 'knowledge-card', name: '知识卡片', description: '知识卡片生成', category: '辅助' },
  { id: 'character-design', name: '人物角色', description: '人物角色设计', category: '辅助' },
  { id: 'ecommerce-product', name: '电商产品', description: '电商产品图生成', category: '辅助' },
  { id: 'architecture', name: '建筑效果图', description: '建筑效果图生成', category: '辅助' },
  { id: 'voice', name: '语音对话', description: '实时语音对话', category: '辅助' },
  { id: 'storyboard', name: '故事板', description: '故事板分镜生成', category: '辅助' },
  { id: 'banana-brother', name: '香蕉哥哥', description: '提示词生成助手', category: '辅助' },
]

// ==================== Store ====================

interface AppVisibilityState {
  workflowTemplates: Record<string, VisibilityState>
  workflowNodes: Record<string, VisibilityState>
  nano2Modules: Record<string, VisibilityState>
  lastSynced: string | null

  // Actions
  setTemplateVisibility: (id: string, state: VisibilityState) => void
  setNodeVisibility: (type: string, state: VisibilityState) => void
  setNano2ModuleVisibility: (id: string, state: VisibilityState) => void
  syncFromServer: (data: {
    workflowTemplates?: Record<string, VisibilityState>
    workflowNodes?: Record<string, VisibilityState>
    nano2Modules?: Record<string, VisibilityState>
  }) => void
  resetToDefault: () => void
}

export const useAppVisibilityStore = create<AppVisibilityState>()(
  persist(
    (set) => ({
      workflowTemplates: { ...DEFAULT_TEMPLATE_VISIBILITY },
      workflowNodes: { ...DEFAULT_NODE_VISIBILITY },
      nano2Modules: { ...DEFAULT_NANO2_MODULE_VISIBILITY },
      lastSynced: null,

      setTemplateVisibility: (id, state) => {
        set((s) => ({
          workflowTemplates: { ...s.workflowTemplates, [id]: state },
        }))
      },

      setNodeVisibility: (type, state) => {
        set((s) => ({
          workflowNodes: { ...s.workflowNodes, [type]: state },
        }))
      },

      setNano2ModuleVisibility: (id, state) => {
        set((s) => ({
          nano2Modules: { ...s.nano2Modules, [id]: state },
        }))
      },

      syncFromServer: (data) => {
        set((s) => ({
          workflowTemplates: data.workflowTemplates
            ? { ...s.workflowTemplates, ...data.workflowTemplates }
            : s.workflowTemplates,
          workflowNodes: data.workflowNodes
            ? { ...s.workflowNodes, ...data.workflowNodes }
            : s.workflowNodes,
          nano2Modules: data.nano2Modules
            ? { ...s.nano2Modules, ...data.nano2Modules }
            : s.nano2Modules,
          lastSynced: new Date().toISOString(),
        }))
      },

      resetToDefault: () => {
        set({
          workflowTemplates: { ...DEFAULT_TEMPLATE_VISIBILITY },
          workflowNodes: { ...DEFAULT_NODE_VISIBILITY },
          nano2Modules: { ...DEFAULT_NANO2_MODULE_VISIBILITY },
          lastSynced: null,
        })
      },
    }),
    {
      name: 'nanoai-app-visibility',
    }
  )
)

// ==================== 便捷查询函数 ====================

export function getTemplateVisibility(id: string): VisibilityState {
  return useAppVisibilityStore.getState().workflowTemplates[id] ?? 'disabled'
}

export function getNodeVisibility(type: string): VisibilityState {
  return useAppVisibilityStore.getState().workflowNodes[type] ?? 'disabled'
}

export function getNano2ModuleVisibility(id: string): VisibilityState {
  return useAppVisibilityStore.getState().nano2Modules[id] ?? 'active'
}

// 是否可见（非 hidden）
export function isVisible(state: VisibilityState | undefined): boolean {
  return state !== 'hidden'
}

// 是否可用（active）
export function isActive(state: VisibilityState | undefined): boolean {
  return state === 'active'
}
