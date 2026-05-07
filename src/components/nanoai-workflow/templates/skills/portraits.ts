import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsPortraitsWorkflow = createSkillsWorkflow(
  'skills-portraits',
  '人物肖像工作流',
  '职业商务肖像、创始人媒体大片、角色设定稿',
  'custom',
  ['肖像', '人物', '角色', '设定'],
  {
    dataId: 'node-skills-portraits-data',
    taskId: 'node-skills-portraits-task',
    previewId: 'node-skills-portraits-preview',
    outputId: 'node-skills-portraits-output',
  }
)
