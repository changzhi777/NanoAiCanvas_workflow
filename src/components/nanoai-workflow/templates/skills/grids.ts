import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsGridsWorkflow = createSkillsWorkflow(
  'skills-grids',
  '网格拼贴工作流',
  'Banner 网格套装、Lookbook、动漫立项 pitch board',
  'custom',
  ['网格', '拼贴', 'Banner', 'Lookbook'],
  {
    dataId: 'node-skills-grids-data',
    taskId: 'node-skills-grids-task',
    previewId: 'node-skills-grids-preview',
    outputId: 'node-skills-grids-output',
  }
)
