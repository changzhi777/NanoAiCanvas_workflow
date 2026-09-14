import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsTechnicalWorkflow = createSkillsWorkflow(
  'skills-technical',
  '技术图表工作流',
  '系统架构图、流程图、时序图、状态机图',
  'custom',
  ['技术', '架构', '流程图', '系统图'],
  {
    dataId: 'node-skills-technical-data',
    taskId: 'node-skills-technical-task',
    previewId: 'node-skills-technical-preview',
    outputId: 'node-skills-technical-output',
  }
)
