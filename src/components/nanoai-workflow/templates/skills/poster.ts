import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsPosterWorkflow = createSkillsWorkflow(
  'skills-poster',
  '海报宣传工作流',
  '品牌主海报、Campaign KV、杂志封面、banner',
  'custom',
  ['海报', '品牌', '宣传', 'KV'],
  {
    dataId: 'node-skills-poster-data',
    taskId: 'node-skills-poster-task',
    previewId: 'node-skills-poster-preview',
    outputId: 'node-skills-poster-output',
  }
)
