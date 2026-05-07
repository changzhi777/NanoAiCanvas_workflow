import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsAssetsWorkflow = createSkillsWorkflow(
  'skills-assets',
  '素材道具工作流',
  '拟物/像素图标集、游戏内截图 mockup',
  'custom',
  ['素材', '道具', '图标', '游戏'],
  {
    dataId: 'node-skills-assets-data',
    taskId: 'node-skills-assets-task',
    previewId: 'node-skills-assets-preview',
    outputId: 'node-skills-assets-output',
  }
)
