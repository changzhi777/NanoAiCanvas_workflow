import { createSkillsWorkflow } from './createSkillsWorkflow'

export const skillsAcademicWorkflow = createSkillsWorkflow(
  'skills-academic',
  '学术图表工作流',
  '方法 pipeline 图、神经网络架构图、学术海报',
  'custom',
  ['学术', '论文', '图表', '架构'],
  {
    dataId: 'node-skills-academic-data',
    taskId: 'node-skills-academic-task',
    previewId: 'node-skills-academic-preview',
    outputId: 'node-skills-academic-output',
  }
)
