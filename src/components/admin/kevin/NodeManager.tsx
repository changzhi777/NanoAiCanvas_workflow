'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { kevinApi, Node } from '@/lib/api/kevin-api'
import { Plus, Trash2, RefreshCw, Server, Crown } from 'lucide-react'

const WORK_MODES = [
  { value: 'standby', label: '热备模式' },
  { value: 'task_split', label: '任务均分' },
  { value: 'master_dispatch', label: '主节点分发' },
  { value: 'compete', label: '竞争抢任务' },
]

export function NodeManager() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [workMode, setWorkMode] = useState('standby')
  const [masterId, setMasterId] = useState<string | null>(null)
  const [addingNode, setAddingNode] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeId, setNewNodeId] = useState('')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [nodesData, nmStatus] = await Promise.all([
        kevinApi.getNodes(),
        kevinApi.getNodeManagerStatus(),
      ])
      setNodes(nodesData)
      setWorkMode(nmStatus.work_mode)
      setMasterId(nmStatus.master_id)
    } catch (error) {
      console.error('Failed to fetch node data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNode = async () => {
    if (!newNodeId || !newNodeName) return

    setAddingNode(true)
    try {
      await kevinApi.registerNode({
        id: newNodeId,
        name: newNodeName,
        weight: 100,
      })
      setNewNodeId('')
      setNewNodeName('')
      await fetchData()
    } catch (error) {
      console.error('Failed to add node:', error)
    } finally {
      setAddingNode(false)
    }
  }

  const handleRemoveNode = async (nodeId: string) => {
    try {
      await kevinApi.unregisterNode(nodeId)
      await fetchData()
    } catch (error) {
      console.error('Failed to remove node:', error)
    }
  }

  const handleElectMaster = async () => {
    try {
      const newMasterId = await kevinApi.electMaster()
      if (newMasterId) {
        setMasterId(newMasterId)
      }
      await fetchData()
    } catch (error) {
      console.error('Failed to elect master:', error)
    }
  }

  const handleWorkModeChange = async (mode: string) => {
    try {
      await kevinApi.setWorkMode(mode)
      setWorkMode(mode)
    } catch (error) {
      console.error('Failed to set work mode:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            节点管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            节点管理
          </div>
          <Badge variant="outline">
            {nodes.length} 节点
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 工作模式选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">工作模式</label>
          <div className="flex flex-wrap gap-2">
            {WORK_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleWorkModeChange(mode.value)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  workMode === mode.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* 主节点选举 */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Crown className={`w-5 h-5 ${masterId ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">主节点</p>
              <p className="text-xs text-muted-foreground">{masterId || '未选举'}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleElectMaster}>
            选举主节点
          </Button>
        </div>

        {/* 添加节点 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">添加节点</label>
          <div className="flex gap-2">
            <Input
              placeholder="节点 ID"
              value={newNodeId}
              onChange={(e) => setNewNodeId(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="节点名称"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddNode}
              disabled={addingNode || !newNodeId || !newNodeName}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </div>

        {/* 节点列表 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">已注册节点</label>
          {nodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无注册节点</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${node.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{node.name}</p>
                      <p className="text-xs text-muted-foreground">{node.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">权重: {node.weight}</Badge>
                    {masterId === node.id && (
                      <Badge variant="default">
                        <Crown className="w-3 h-3 mr-1" />
                        主节点
                      </Badge>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleRemoveNode(node.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
