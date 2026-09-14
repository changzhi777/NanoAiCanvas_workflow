import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsInfographicsWorkflow = createSkillsWorkflow(
  'skills-infographics',
  '信息图表工作流',
  '高密度科普信息图、手绘风信息图、便当格信息图',
  'custom',
  ['信息图', '科普', '手绘', 'KPI'],
  {
    dataId: 'node-skills-infographics-data',
    taskId: 'node-skills-infographics-task',
    previewId: 'node-skills-infographics-preview',
    outputId: 'node-skills-infographics-output',
  }
)
