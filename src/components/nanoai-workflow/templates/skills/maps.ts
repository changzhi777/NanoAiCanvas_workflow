import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsMapsWorkflow = createSkillsWorkflow(
  'skills-maps',
  '地图信息图工作流',
  '城市美食地图、旅行路线图、门店分布图',
  'custom',
  ['地图', '美食', '旅行', '路线'],
  {
    dataId: 'node-skills-maps-data',
    taskId: 'node-skills-maps-task',
    previewId: 'node-skills-maps-preview',
    outputId: 'node-skills-maps-output',
  }
)
