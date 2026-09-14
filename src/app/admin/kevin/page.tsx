'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { KevinStatus } from '@/components/admin/kevin/KevinStatus'
import { PlanConfig } from '@/components/admin/kevin/PlanConfig'
import { WeightSlider } from '@/components/admin/kevin/WeightSlider'
import { LoadMonitor } from '@/components/admin/kevin/LoadMonitor'
import { NodeManager } from '@/components/admin/kevin/NodeManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { kevinApi } from '@/lib/api/kevin-api'
import { Shield } from 'lucide-react'

const STRATEGIES = [
  { value: 'round_robin', label: '轮询', description: '依次分配给每个节点' },
  { value: 'weighted_round_robin', label: '加权轮询', description: '按权重比例分配' },
  { value: 'least_used', label: '最少使用', description: '选择请求最少的节点' },
  { value: 'fastest_response', label: '最快响应', description: '选择响应时间最短的节点' },
  { value: 'failover', label: '故障转移', description: '主节点故障时自动切换' },
]

export default function KevinAlgorithmPage() {
  const [currentStrategy, setCurrentStrategy] = useState('round_robin')
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    fetchStrategy()
  }, [])

  const fetchStrategy = async () => {
    try {
      const strategy = await kevinApi.getCurrentStrategy()
      setCurrentStrategy(strategy)
    } catch (error) {
      console.error('Failed to fetch strategy:', error)
    }
  }

  const handleStrategyChange = async (strategy: string) => {
    setChanging(true)
    try {
      await kevinApi.setStrategy(strategy)
      setCurrentStrategy(strategy)
    } catch (error) {
      console.error('Failed to change strategy:', error)
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Kevin 算法负载均衡"
        subtitle="智能多节点负载均衡系统"
      />

      {/* Kevin 状态概览 */}
      <KevinStatus />

      {/* 策略选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>负载均衡策略</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-normal text-muted-foreground">
                {STRATEGIES.find(s => s.value === currentStrategy)?.label || currentStrategy}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.value}
                onClick={() => handleStrategyChange(strategy.value)}
                disabled={changing}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  currentStrategy === strategy.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h4 className="font-medium mb-1">{strategy.label}</h4>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </button>
            ))}
          </div>

          {/* 策略说明 */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">策略说明</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs text-muted-foreground">
              <div>
                <strong>轮询:</strong> 适合节点性能相近的场景，请求均匀分配。
              </div>
              <div>
                <strong>加权轮询:</strong> 根据节点权重比例分配，适合性能不均的集群。
              </div>
              <div>
                <strong>最少使用:</strong> 选择当前负载最低的节点，避免过载。
              </div>
              <div>
                <strong>最快响应:</strong> 选择响应延迟最低的节点，保证质量。
              </div>
              <div>
                <strong>故障转移:</strong> 主节点优先，故障时自动切换到备用节点。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 套餐模式配置 */}
      <PlanConfig />

      {/* 权重配置 */}
      <WeightSlider />

      {/* 节点管理 */}
      <NodeManager />

      {/* 负载监控 */}
      <LoadMonitor />

      {/* 熔断器状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            熔断器状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>熔断器功能由后端自动管理</p>
            <p className="text-xs mt-1">
              心跳检测: 30秒间隔 | 超时: 15秒 | 熔断阈值: 5次失败 | 恢复时间: 5分钟
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
