import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsSlidesWorkflow = createSkillsWorkflow(
  'skills-slides',
  '幻灯片工作流',
  '密集讲解幻灯片、政策风格说明、项目汇报',
  'custom',
  ['幻灯片', 'PPT', '汇报', '政策'],
  {
    dataId: 'node-skills-slides-data',
    taskId: 'node-skills-slides-task',
    previewId: 'node-skills-slides-preview',
    outputId: 'node-skills-slides-output',
  }
)
