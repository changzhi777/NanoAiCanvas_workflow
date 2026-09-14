'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { kevinApi } from '@/lib/api/kevin-api'
import { Check } from 'lucide-react'

export function PlanConfig() {
  const [currentMode, setCurrentMode] = useState<'practice' | 'premium'>('practice')
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    fetchMode()
  }, [])

  const fetchMode = async () => {
    try {
      const mode = await kevinApi.getMode()
      setCurrentMode(mode)
    } catch (error) {
      console.error('Failed to fetch mode:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSwitch = async (mode: 'practice' | 'premium') => {
    if (mode === currentMode) return

    setSwitching(true)
    try {
      await kevinApi.switchMode(mode)
      setCurrentMode(mode)
    } catch (error) {
      console.error('Failed to switch mode:', error)
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>套餐模式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>套餐模式</span>
          <Badge variant="outline">{currentMode === 'practice' ? '练习模式' : '精品模式'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 练习模式 */}
          <button
            onClick={() => handleSwitch('practice')}
            disabled={switching}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              currentMode === 'practice'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">练习模式</h3>
              {currentMode === 'practice' && <Check className="w-5 h-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">
              适用于日常练习和测试，低成本模式
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>权重：全局共享</p>
              <p>策略：轮询</p>
            </div>
          </button>

          {/* 精品模式 */}
          <button
            onClick={() => handleSwitch('premium')}
            disabled={switching}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              currentMode === 'premium'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">精品模式</h3>
              {currentMode === 'premium' && <Check className="w-5 h-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">
              适用于正式生产环境，高可用模式
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>权重：独立配置</p>
              <p>策略：最快响应</p>
            </div>
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          提示：切换套餐模式将影响负载分配策略和权重配置
        </p>
      </CardContent>
    </Card>
  )
}
