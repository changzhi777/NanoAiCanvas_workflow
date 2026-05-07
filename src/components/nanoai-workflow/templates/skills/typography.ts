import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsTypographyWorkflow = createSkillsWorkflow(
  'skills-typography',
  '字体排版工作流',
  '大字主张海报、中英双语版式、品牌字体设计',
  'custom',
  ['字体', '排版', '海报', '双语'],
  {
    dataId: 'node-skills-typography-data',
    taskId: 'node-skills-typography-task',
    previewId: 'node-skills-typography-preview',
    outputId: 'node-skills-typography-output',
  }
)
