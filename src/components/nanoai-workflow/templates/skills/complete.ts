import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsCompleteWorkflow = createSkillsWorkflow(
  'skills-complete',
  '完整 Skills 工作流',
  '通用完整流程：数据输入 → Skills 生成 → 预览输出',
  'custom',
  ['完整', '通用', 'Skills'],
  {
    dataId: 'node-skills-complete-data',
    taskId: 'node-skills-complete-task',
    previewId: 'node-skills-complete-preview',
    outputId: 'node-skills-complete-output',
  }
)
