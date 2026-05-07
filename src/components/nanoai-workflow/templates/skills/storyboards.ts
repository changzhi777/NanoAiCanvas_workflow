import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsStoryboardsWorkflow = createSkillsWorkflow(
  'skills-storyboards',
  '故事板分镜工作流',
  '四格漫画、漫画单页、电影感分镜 contact sheet',
  'custom',
  ['故事板', '分镜', '漫画', '电影'],
  {
    dataId: 'node-skills-storyboards-data',
    taskId: 'node-skills-storyboards-task',
    previewId: 'node-skills-storyboards-preview',
    outputId: 'node-skills-storyboards-output',
  }
)
