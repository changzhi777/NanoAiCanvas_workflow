/**
 * StoryboardScriptTableNode — 分镜头脚本表格节点
 * 从上游 StoryboardV2Node 读取 script_table[] → 表格展示（文本节点，不生图）
 */

import { memo, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Table } from 'lucide-react'
import { useNanoaiWorkflowStore, NodeStatus } from '@/stores/nanoaiWorkflowStore'
import type { WorkflowNodeData, NodePort } from '@/stores/nanoaiWorkflowStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { type ScriptTableEntry, type ScreenplayData } from './StoryboardV2.shared'
import { statusConfig } from './nodeStatusConfig'

export interface ScriptTableData extends WorkflowNodeData {
  params: Record<string, any>
  inputs: NodePort[]
  outputs: NodePort[]
  status: NodeStatus
  result?: {
    scriptTable?: ScriptTableEntry[]
    screenplay?: ScreenplayData
  }
  error?: string
}

export const StoryboardScriptTableNode = memo(({ id, data }: { id: string; data: ScriptTableData }) => {
  const nodes = useNanoaiWorkflowStore(s => s.nodes)
  const edges = useNanoaiWorkflowStore(s => s.edges)

  const upstreamData = useMemo(() => {
    const incomingEdge = edges.find(e => e.target === id)
    if (!incomingEdge) return null
    const sourceNode = nodes.find(n => n.id === incomingEdge.source)
    const screenplay: ScreenplayData | undefined = sourceNode?.data?.result?.screenplay
    return screenplay || null
  }, [edges, nodes, id])

  const scriptTable = data.result?.scriptTable || upstreamData?.script_table || []
  const screenplayTitle = upstreamData?.title || ''

  // 自动检测上游数据并标记完成
  const hasUpstreamData = !!upstreamData
  const effectiveStatus = hasUpstreamData ? (data.status === NodeStatus.IDLE ? NodeStatus.SUCCESS : data.status) : data.status
  const effectiveStatusInfo = statusConfig[effectiveStatus] || statusConfig[NodeStatus.IDLE]
  const EffectiveStatusIcon = effectiveStatusInfo.icon

  return (
    <div
      className="card-node node-appear node-task"
      style={{
        width: 320,
        willChange: 'auto',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="node-type-strip" />

      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary" id="script-in" />

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Table className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-xs">分镜头脚本表格</h3>
          </div>
          <Badge variant="default" className={cn('status-badge', effectiveStatusInfo.cls)}>
            <EffectiveStatusIcon className="w-3 h-3" />
            <span>{effectiveStatusInfo.label}</span>
          </Badge>
        </div>

        <Separator className="my-1" />

        {screenplayTitle && (
          <div className="text-[10px] text-muted-foreground truncate">
            《{screenplayTitle}》
          </div>
        )}

        {scriptTable.length > 0 ? (
          <div className="max-h-48 overflow-y-auto rounded border border-white/10">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                <tr className="text-muted-foreground">
                  <th className="px-1.5 py-1 text-left w-8">#</th>
                  <th className="px-1.5 py-1 text-left">场景</th>
                  <th className="px-1.5 py-1 text-left">描述</th>
                  <th className="px-1.5 py-1 text-left">镜头</th>
                  <th className="px-1.5 py-1 text-left">时长</th>
                </tr>
              </thead>
              <tbody>
                {scriptTable.map((entry, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-1.5 py-1 text-muted-foreground">{entry.shot_number}</td>
                    <td className="px-1.5 py-1 text-slate-300 max-w-[60px] truncate">{entry.scene_location}</td>
                    <td className="px-1.5 py-1 text-slate-300 max-w-[100px] truncate">{entry.description}</td>
                    <td className="px-1.5 py-1 text-muted-foreground">{entry.camera}</td>
                    <td className="px-1.5 py-1 text-muted-foreground">{entry.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground text-center py-3">
            等待上游剧本数据...
          </div>
        )}

        {data.error && (
          <div className="p-1.5 bg-destructive/10 border border-destructive/20 rounded text-[10px] text-destructive">
            {data.error}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary" id="table-out" />
    </div>
  )
})

StoryboardScriptTableNode.displayName = 'StoryboardScriptTableNode'
export default StoryboardScriptTableNode
