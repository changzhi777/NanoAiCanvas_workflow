import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsUiMockupsWorkflow = createSkillsWorkflow(
  'skills-ui-mockups',
  'UI 界面工作流',
  '电商直播 UI、社交平台动态、产品卡片等 UI 界面模板',
  'custom',
  ['UI', '界面', '直播', '社交', '电商'],
  {
    dataId: 'node-skills-ui-data',
    taskId: 'node-skills-ui-task',
    previewId: 'node-skills-ui-preview',
    outputId: 'node-skills-ui-output',
  }
)
