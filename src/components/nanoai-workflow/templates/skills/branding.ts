import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsBrandingWorkflow = createSkillsWorkflow(
  'skills-branding',
  '品牌包装工作流',
  '品牌识别系统板、吉祥物品牌套装、化妆品包装',
  'custom',
  ['品牌', '包装', '吉祥物', '识别'],
  {
    dataId: 'node-skills-branding-data',
    taskId: 'node-skills-branding-task',
    previewId: 'node-skills-branding-preview',
    outputId: 'node-skills-branding-output',
  }
)
