import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsScenesWorkflow = createSkillsWorkflow(
  'skills-scenes',
  '场景插画工作流',
  '治愈系日常、电影感概念大场景、童书绘本场景',
  'custom',
  ['场景', '插画', '治愈', '绘本'],
  {
    dataId: 'node-skills-scenes-data',
    taskId: 'node-skills-scenes-task',
    previewId: 'node-skills-scenes-preview',
    outputId: 'node-skills-scenes-output',
  }
)
