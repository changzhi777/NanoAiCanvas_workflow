'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { kevinApi, MetricsSummary } from '@/lib/api/kevin-api'
import { RefreshCw, Activity, Clock, AlertTriangle } from 'lucide-react'

export function LoadMonitor() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const data = await kevinApi.getMetrics()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            负载监控
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

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            负载监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">无法加载负载数据</p>
        </CardContent>
      </Card>
    )
  }

  const totalRequests = metrics.total_requests || 0
  const successfulRequests = metrics.successful_requests || 0
  const failedRequests = metrics.failed_requests || 0
  const averageLatency = metrics.average_latency || 0

  const successRate = totalRequests > 0
    ? ((successfulRequests / totalRequests) * 100).toFixed(1)
    : '0.0'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            负载监控
          </div>
          <button
            onClick={fetchMetrics}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 概览统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              总请求
            </p>
            <p className="text-2xl font-bold">{totalRequests}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">成功</p>
            <p className="text-2xl font-bold text-green-500">{successfulRequests}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">失败</p>
            <p className="text-2xl font-bold text-red-500">{failedRequests}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">成功率</p>
            <p className="text-2xl font-bold">{successRate}%</p>
          </div>
        </div>

        {/* 平均延迟 */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm">平均响应延迟</span>
            <span className="text-lg font-bold">
              {averageLatency.toFixed(2)}ms
            </span>
          </div>
          <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                averageLatency < 100
                  ? 'bg-green-500'
                  : averageLatency < 500
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((averageLatency / 1000) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 节点详情 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">节点详情</h4>
          {Object.keys(metrics.nodes || {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无节点数据</p>
          ) : (
            Object.entries(metrics.nodes).map(([nodeId, nodeMetrics]) => {
              const nodeRequests = nodeMetrics.requests || 0
              const nodeSuccesses = nodeMetrics.successes || 0
              const nodeFailures = nodeMetrics.failures || 0
              const nodeAvgLatency = nodeMetrics.avg_latency || 0
              const successRatio = nodeRequests > 0 ? (nodeSuccesses / nodeRequests) * 100 : 0

              return (
                <div key={nodeId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{nodeId}</span>
                    <Badge
                      variant={
                        nodeFailures > nodeSuccesses
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {nodeFailures > nodeSuccesses ? (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      ) : null}
                      {successRatio.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span>请求:</span>
                      <span className="ml-1 font-medium text-foreground">{nodeRequests}</span>
                    </div>
                    <div>
                      <span>延迟:</span>
                      <span className="ml-1 font-medium text-foreground">
                        {nodeAvgLatency.toFixed(1)}ms
                      </span>
                    </div>
                    <div>
                      <span>失败:</span>
                      <span className="ml-1 font-medium text-red-500">{nodeFailures}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
