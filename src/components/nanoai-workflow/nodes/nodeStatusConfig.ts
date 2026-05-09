/**
 * 节点通用状态配置
 * 所有工作流节点共享的 status → icon/label/className 映射
 */

import { Circle, Timer, CheckCircle2, Ban } from 'lucide-react'
import { NodeStatus } from '@/stores/nanoaiWorkflowStore'

export const statusConfig = {
  [NodeStatus.IDLE]: { icon: Circle, label: '未开始', cls: 'not-started' },
  [NodeStatus.RUNNING]: { icon: Timer, label: '生成中', cls: 'in-progress' },
  [NodeStatus.SUCCESS]: { icon: CheckCircle2, label: '已完成', cls: 'completed' },
  [NodeStatus.ERROR]: { icon: Ban, label: '已阻塞', cls: 'blocked' },
  [NodeStatus.DISABLED]: { icon: Circle, label: '禁用', cls: 'not-started' },
} as const

export type StatusInfo = typeof statusConfig[NodeStatus]
