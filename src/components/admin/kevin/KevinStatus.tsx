'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { kevinApi, type KevinStatus } from '@/lib/api/kevin-api'
import { RefreshCw, Zap, Shield, Wifi, Server } from 'lucide-react'

export function KevinStatus() {
  const [status, setStatus] = useState<KevinStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const data = await kevinApi.getStatus()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch Kevin status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Kevin 算法状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Kevin 算法状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">无法加载状态</p>
        </CardContent>
      </Card>
    )
  }

  const strategyLabels: Record<string, string> = {
    round_robin: '轮询',
    weighted_round_robin: '加权轮询',
    least_used: '最少使用',
    fastest_response: '最快响应',
    failover: '故障转移',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Kevin 算法状态
          </div>
          <Badge variant="outline">{strategyLabels[status.strategy] || status.strategy}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 当前模式 */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">当前模式</p>
            <Badge variant={status.current_mode === 'premium' ? 'default' : 'secondary'}>
              {status.current_mode === 'premium' ? '精品模式' : '练习模式'}
            </Badge>
          </div>

          {/* 节点数量 */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">注册节点</p>
            <p className="text-2xl font-bold">{Object.keys(status.nodes || {}).length}</p>
          </div>

          {/* 工作模式 */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">工作模式</p>
            <p className="text-sm font-medium">{status.node_manager.work_mode}</p>
          </div>

          {/* 协调器类型 */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">协调器</p>
            <p className="text-sm font-medium">{status.coordinator.coordinator_type}</p>
          </div>
        </div>

        {/* 额外状态信息 */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">主节点</p>
              <p className="text-sm font-medium">{status.node_manager.master_id || '未选举'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Raft 状态</p>
              <p className="text-sm font-medium">{status.coordinator.raft_state}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">熔断节点</p>
              <p className="text-sm font-medium">{Object.keys(status.circuit_breaker || {}).length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">健康检测</p>
              <p className="text-sm font-medium">{Object.keys(status.health || {}).length}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Button({ children, variant, onClick, className }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        variant === 'outline'
          ? 'border border-input bg-background hover:bg-accent'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      } ${className || ''}`}
    >
      {children}
    </button>
  )
}
