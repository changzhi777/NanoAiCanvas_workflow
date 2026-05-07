import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsProductVisualsWorkflow = createSkillsWorkflow(
  'skills-product-visuals',
  '产品视觉工作流',
  '产品爆炸视图、纯白底主图、高级影棚商业产品图',
  'custom',
  ['产品', '电商', '爆炸图', '白底'],
  {
    dataId: 'node-skills-product-data',
    taskId: 'node-skills-product-task',
    previewId: 'node-skills-product-preview',
    outputId: 'node-skills-product-output',
  }
)
