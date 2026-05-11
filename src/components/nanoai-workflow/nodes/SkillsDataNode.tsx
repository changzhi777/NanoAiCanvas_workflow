/**
 * Skills 数据输入节点
 * 功能：选择模板类型 + 填写参数表单 → 输出数据到 Skills 任务节点
 */

import { memo, useState, useCallback } from 'react'
import { Handle, Position } from 'reactflow'
import { Database, ChevronDown, ChevronRight, Sparkles, FileText, Image, Map, Layout, Users, Palette } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useTheme } from '../ui/Theme'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { IMEInput, IMETextarea } from '../ui/IMEInput'
import { VoiceInput } from '../ui/VoiceInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ==================== 类型定义 ====================

export interface SkillsDataNodeData extends WorkflowNodeData {
  params: {
    // 模板分类
    templateCategory: string
    // 模板 ID
    templateId: string
    // 模板名称
    templateName: string
    // 动态参数（根据模板不同而变化）
    dynamicParams: Record<string, string>
  }
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
}

// ==================== 18 个分类定义 ====================

export const SKILLS_CATEGORIES = [
  { id: 'ui-mockups', name: 'UI 界面', icon: Layout, color: '#168 70% 45%' },
  { id: 'product-visuals', name: '产品视觉', icon: Image, color: '#293 80% 60%' },
  { id: 'maps', name: '地图信息图', icon: Map, color: '#10B981' },
  { id: 'slides', name: '幻灯片', icon: FileText, color: '#F59E0B' },
  { id: 'poster', name: '海报宣传', icon: Palette, color: '#EF4444' },
  { id: 'portraits', name: '人物肖像', icon: Users, color: '#8B5CF6' },
  { id: 'scenes', name: '场景插画', icon: Sparkles, color: '#EC4899' },
  { id: 'editing', name: '编辑工作流', icon: FileText, color: '#06B6D4' },
  { id: 'avatars', name: '头像人设', icon: Users, color: '#F97316' },
  { id: 'storyboards', name: '故事板分镜', icon: Layout, color: '#84CC16' },
  { id: 'grids', name: '网格拼贴', icon: Layout, color: '#14B8A6' },
  { id: 'branding', name: '品牌包装', icon: Palette, color: '#A855F7' },
  { id: 'typography', name: '字体排版', icon: FileText, color: '#64748B' },
  { id: 'assets', name: '素材道具', icon: Database, color: '#6366F1' },
  { id: 'academic', name: '学术图表', icon: FileText, color: '#0EA5E9' },
  { id: 'infographics', name: '信息图表', icon: Map, color: '#22C55E' },
  { id: 'technical', name: '技术图表', icon: Database, color: '#3B82F6' },
  { id: 'complete', name: '完整工作流', icon: Sparkles, color: '#EAB308' },
]

// ==================== 模板定义 ====================

export const SKILLS_TEMPLATES: Record<string, Array<{ id: string; name: string; description: string; fields: TemplateField[] }>> = {
  'ui-mockups': [
    {
      id: 'ui-mockups-live-commerce',
      name: '电商直播 UI',
      description: '电商直播带货截图样机，包含主播、聊天、礼物、商品卡等区域',
      fields: [
        { name: 'host_name', label: '主播名称', type: 'text', required: true },
        { name: 'host_type', label: '主播来源', type: 'select', options: ['名人明星', '网红达人', '商家自播', '随机生成'], required: true },
        { name: 'product_name', label: '商品名称', type: 'text', required: true },
        { name: 'product_price', label: '商品价格', type: 'text', required: false },
        { name: 'platform', label: '平台风格', type: 'select', options: ['抖音', '快手', '淘宝直播', '小红书'], required: true },
      ]
    },
    {
      id: 'ui-mockups-social-interface',
      name: '社交平台动态',
      description: '社交平台动态详情页，支持 Twitter、小红书、微博等风格',
      fields: [
        { name: 'platform', label: '平台', type: 'select', options: ['Twitter/X', '小红书', '微博', 'Threads', 'Instagram'], required: true },
        { name: 'username', label: '用户名', type: 'text', required: true },
        { name: 'content_type', label: '内容类型', type: 'select', options: ['纯文字', '单图', '多图', '视频'], required: true },
        { name: 'post_text', label: '帖子内容', type: 'textarea', required: false },
      ]
    },
    {
      id: 'ui-mockups-product-card',
      name: '产品卡片叠加',
      description: '落地页 hero 或详情页主图，产品与卖点叠加设计',
      fields: [
        { name: 'product_name', label: '产品名称', type: 'text', required: true },
        { name: 'product_type', label: '产品类型', type: 'select', options: ['电子产品', '美妆护肤', '服装', '食品', '家具'], required: true },
        { name: 'headline', label: '主标题', type: 'text', required: true },
        { name: 'price', label: '价格', type: 'text', required: false },
      ]
    },
  ],
  'product-visuals': [
    {
      id: 'product-visuals-exploded-view',
      name: '产品爆炸视图',
      description: '产品爆炸视图海报，垂直堆叠 + callout 标注',
      fields: [
        { name: 'product_name', label: '产品名称', type: 'text', required: true },
        { name: 'product_type', label: '产品类型', type: 'select', options: ['电子产品', '手表/配饰', '耳机/音响', '相机', '其他'], required: true },
        { name: 'brand_name', label: '品牌名称', type: 'text', required: false },
        { name: 'features', label: '产品特点', type: 'textarea', required: false },
      ]
    },
    {
      id: 'product-visuals-white-background',
      name: '纯白底主图',
      description: '电商纯白底主图，单品或多角度极简营销',
      fields: [
        { name: 'product_name', label: '产品名称', type: 'text', required: true },
        { name: 'product_color', label: '产品颜色', type: 'text', required: false },
        { name: 'angle', label: '视角', type: 'select', options: ['正面', '侧面', '3/4 视角', '多角度'], required: true },
      ]
    },
  ],
  'maps': [
    {
      id: 'maps-food-map',
      name: '城市美食地图',
      description: '城市美食手绘地图，编号点位 + 图例 + 吉祥物',
      fields: [
        { name: 'city_name', label: '城市名称', type: 'text', required: true },
        { name: 'map_style', label: '地图风格', type: 'select', options: ['手绘风格', '扁平风格', '复古风格'], required: true },
        { name: 'spot_count', label: '推荐点位', type: 'select', options: ['5个', '8个', '10个'], required: true },
      ]
    },
    {
      id: 'maps-travel-route',
      name: '旅行路线图',
      description: '旅行路线图，多日行程或单日 city walk',
      fields: [
        { name: 'destination', label: '目的地', type: 'text', required: true },
        { name: 'duration', label: '行程天数', type: 'select', options: ['一日游', '两日游', '三日游', '五日游'], required: true },
        { name: 'route_type', label: '路线类型', type: 'select', options: ['城市漫步', '自然风光', '文化之旅', '美食之旅'], required: true },
      ]
    },
  ],
  'poster': [
    {
      id: 'poster-brand',
      name: '品牌主海报',
      description: '品牌主海报，产品/人物/纯文字主张',
      fields: [
        { name: 'brand_name', label: '品牌名称', type: 'text', required: true },
        { name: 'campaign_theme', label: '活动主题', type: 'text', required: true },
        { name: 'main_message', label: '主标语', type: 'text', required: true },
        { name: 'visual_type', label: '视觉类型', type: 'select', options: ['产品为主', '人物为主', '文字为主', '抽象图形'], required: true },
      ]
    },
    {
      id: 'poster-campaign-kv',
      name: 'Campaign KV',
      description: 'Campaign Key Visual + 衍生 layout 系统',
      fields: [
        { name: 'campaign_name', label: '活动名称', type: 'text', required: true },
        { name: 'target_audience', label: '目标受众', type: 'text', required: false },
        { name: 'key_message', label: '核心信息', type: 'textarea', required: true },
      ]
    },
  ],
  'portraits': [
    {
      id: 'portraits-character-sheet',
      name: '角色设定稿',
      description: '角色综合设定稿，三视图+表情+服装+配色板',
      fields: [
        { name: 'character_name', label: '角色名称', type: 'text', required: true },
        { name: 'gender', label: '性别', type: 'select', options: ['男性', '女性', '其他'], required: true },
        { name: 'age_group', label: '年龄段', type: 'select', options: ['儿童', '青少年', '成年', '老年'], required: true },
        { name: 'character_type', label: '角色类型', type: 'select', options: ['战士', '法师', '盗贼', '骑士', '弓箭手'], required: true },
      ]
    },
    {
      id: 'portraits-professional-portrait',
      name: '职业级商务肖像',
      description: 'LinkedIn / 团队页 / 媒体配图',
      fields: [
        { name: 'person_name', label: '人物姓名', type: 'text', required: true },
        { name: 'profession', label: '职业', type: 'text', required: true },
        { name: 'style', label: '风格', type: 'select', options: ['商务正式', '创意时尚', '简约自然'], required: true },
      ]
    },
  ],
  'storyboards': [
    {
      id: 'storyboards-four-panel',
      name: '四格漫画',
      description: '4 格漫画 / 讽刺漫画 / 段子漫画，起承转合',
      fields: [
        { name: 'story_theme', label: '故事主题', type: 'text', required: true },
        { name: 'genre', label: '题材', type: 'select', options: ['喜剧', '爱情', '动作', '恐怖', '日常'], required: true },
        { name: 'art_style', label: '画风', type: 'select', options: ['日漫', '韩漫', '美式漫画', '国漫'], required: true },
      ]
    },
    {
      id: 'storyboards-cinematic',
      name: '电影感分镜',
      description: '电影感叙事分镜 contact sheet，3x4 或 4x4',
      fields: [
        { name: 'story_logline', label: '故事梗概', type: 'textarea', required: true },
        { name: 'grid_size', label: '网格', type: 'select', options: ['3x4 (12格)', '4x4 (16格)', '4x3 (12格)'], required: true },
        { name: 'cinematic_style', label: '风格', type: 'select', options: ['黑色电影', '科幻', '剧情', '动作', '爱情'], required: true },
      ]
    },
  ],
  'technical': [
    {
      id: 'technical-system-architecture',
      name: '系统架构图',
      description: '系统架构图，前端+后端+DB+缓存+队列',
      fields: [
        { name: 'system_name', label: '系统名称', type: 'text', required: true },
        { name: 'components', label: '主要组件', type: 'textarea', required: true },
        { name: 'has_external', label: '外部服务', type: 'select', options: ['有', '无'], required: false },
      ]
    },
    {
      id: 'technical-flowchart',
      name: '流程图',
      description: '流程图/决策图，BPMN 形状语义',
      fields: [
        { name: 'process_name', label: '流程名称', type: 'text', required: true },
        { name: 'steps', label: '步骤', type: 'textarea', required: true },
        { name: 'has_decision', label: '决策节点', type: 'select', options: ['有', '无'], required: false },
      ]
    },
  ],
  'branding': [
    {
      id: 'branding-identity-board',
      name: '品牌识别系统板',
      description: '品牌识别系统板，logo+配色+字体+应用',
      fields: [
        { name: 'brand_name', label: '品牌名称', type: 'text', required: true },
        { name: 'industry', label: '行业', type: 'select', options: ['科技', '时尚', '食品', '健康', '金融'], required: true },
        { name: 'mood', label: '品牌调性', type: 'select', options: ['专业', '活泼', '高端', '简约', '大胆'], required: true },
      ]
    },
    {
      id: 'branding-mascot-kit',
      name: '吉祥物品牌套装',
      description: '吉祥物多面板品牌识别套装',
      fields: [
        { name: 'mascot_name', label: '吉祥物名称', type: 'text', required: true },
        { name: 'characteristics', label: '特征描述', type: 'textarea', required: true },
        { name: 'color_scheme', label: '配色方案', type: 'text', required: false },
      ]
    },
  ],
}

// 默认分类的模板
const DEFAULT_TEMPLATES = [
  { id: 'default-template-1', name: '默认模板1', description: '默认模板描述', fields: [] },
  { name: 'default-template-2', id: 'default-template-2', description: '默认模板描述', fields: [] },
]

// ==================== 子组件 ====================

interface TemplateField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: string[]
  required?: boolean
}

/** 类别选择器 */
const CategorySelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">模板分类</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="选择分类..." />
      </SelectTrigger>
      <SelectContent>
        {SKILLS_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: cat.color }} />
                <span>{cat.name}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  </div>
)

/** 模板选择器 */
const TemplateSelector = ({ category, value, onChange }: { category: string; value: string; onChange: (v: string) => void }) => {
  const templates = SKILLS_TEMPLATES[category] || DEFAULT_TEMPLATES

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">模板</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="选择模板..." />
        </SelectTrigger>
        <SelectContent>
          {templates.map((tmpl) => (
            <SelectItem key={tmpl.id} value={tmpl.id}>
              <div className="flex flex-col">
                <span className="text-sm">{tmpl.name}</span>
                <span className="text-xs text-muted-foreground">{tmpl.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** 动态参数表单 */
const DynamicParamsForm = ({ templateId, category, value, onChange }: { templateId: string; category: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) => {
  const templates = SKILLS_TEMPLATES[category] || []
  const template = templates.find(t => t.id === templateId)

  if (!template || template.fields.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-lg">
        选择模板后可填写参数
      </div>
    )
  }

  const handleFieldChange = (fieldName: string, fieldValue: string) => {
    onChange({ ...value, [fieldName]: fieldValue })
  }

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
      <p className="text-xs font-medium text-muted-foreground">模板参数</p>
      {template.fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </label>
          {field.type === 'select' && field.options ? (
            <Select
              value={value[field.name] || ''}
              onValueChange={(v) => handleFieldChange(field.name, v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="选择..." />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === 'textarea' ? (
            <div className="flex items-start gap-1.5">
              <IMETextarea
                value={value[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.label}
                className="min-h-[60px] text-xs resize-none flex-1"
              />
              <VoiceInput
                onResult={(text) => handleFieldChange(field.name, text)}
                currentValue={value[field.name] || ''}
                size="sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <IMEInput
                value={value[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.label}
                className="h-8 text-xs flex-1"
              />
              <VoiceInput
                onResult={(text) => handleFieldChange(field.name, text)}
                currentValue={value[field.name] || ''}
                size="sm"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ==================== 主组件 ====================

const SkillsDataNode = memo(({ id, data }: { id: string; data: SkillsDataNodeData }) => {
  const { isDark } = useTheme()
  const { updateNodeParams } = useNanoaiWorkflowStore()

  const [showAdvanced, setShowAdvanced] = useState(false)

  // 获取当前分类
  const currentCategory = data.params?.templateCategory || ''
  const currentTemplateId = data.params?.templateId || ''
  const dynamicParams = data.params?.dynamicParams || {}

  const handleCategoryChange = useCallback((category: string) => {
    updateNodeParams(id, {
      templateCategory: category,
      templateId: '', // 清空模板选择
      dynamicParams: {} // 清空参数
    })
  }, [id, updateNodeParams])

  const handleTemplateChange = useCallback((templateId: string) => {
    updateNodeParams(id, {
      templateId,
      dynamicParams: {} // 清空参数
    })
  }, [id, updateNodeParams])

  const handleDynamicParamsChange = useCallback((params: Record<string, string>) => {
    updateNodeParams(id, { dynamicParams: params })
  }, [id, updateNodeParams])

  // 获取当前分类信息
  const categoryInfo = SKILLS_CATEGORIES.find(c => c.id === currentCategory)

  return (
    <BaseNode
      data={data}
      icon={<Database className="w-4 h-4" />}
    >
      <div className="space-y-3">
        {/* 分类选择 */}
        <CategorySelector
          value={currentCategory}
          onChange={handleCategoryChange}
        />

        {/* 模板选择 */}
        {currentCategory && (
          <TemplateSelector
            category={currentCategory}
            value={currentTemplateId}
            onChange={handleTemplateChange}
          />
        )}

        {/* 动态参数表单 */}
        {currentCategory && currentTemplateId && (
          <DynamicParamsForm
            templateId={currentTemplateId}
            category={currentCategory}
            value={dynamicParams}
            onChange={handleDynamicParamsChange}
          />
        )}

        {/* 高级选项切换 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>高级选项</span>
        </button>

        {showAdvanced && categoryInfo && (
          <div className={cn(
            'p-2 rounded border text-xs',
            isDark ? 'bg-gray-800/50 border-white/5' : 'bg-gray-50 border-gray-100'
          )}>
            <p className="font-medium">{categoryInfo.name}</p>
            <p className="text-muted-foreground mt-1">
              当前选择: {currentTemplateId || '未选择模板'}
            </p>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 bg-background"
        id="input"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 bg-background"
        id="output"
      />
    </BaseNode>
  )
})

SkillsDataNode.displayName = 'SkillsDataNode'

export default SkillsDataNode