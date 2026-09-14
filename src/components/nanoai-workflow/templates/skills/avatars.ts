import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsAvatarsWorkflow = createSkillsWorkflow(
  'skills-avatars',
  '头像人设工作流',
  '风格迁移头像、角色网格肖像、贴纸套装、系列肖像',
  'custom',
  ['头像', '人设', '风格迁移', '贴纸'],
  {
    dataId: 'node-skills-avatars-data',
    taskId: 'node-skills-avatars-task',
    previewId: 'node-skills-avatars-preview',
    outputId: 'node-skills-avatars-output',
  }
)
