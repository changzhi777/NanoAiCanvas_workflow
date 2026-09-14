import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsEditingWorkflow = createSkillsWorkflow(
  'skills-editing',
  '编辑工作流',
  '背景替换、局部对象替换、杂物去除、产品精修',
  'custom',
  ['编辑', '修图', '背景替换', '精修'],
  {
    dataId: 'node-skills-editing-data',
    taskId: 'node-skills-editing-task',
    previewId: 'node-skills-editing-preview',
    outputId: 'node-skills-editing-output',
  }
)
