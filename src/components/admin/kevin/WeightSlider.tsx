'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { kevinApi, WeightsResponse } from '@/lib/api/kevin-api'
import { Slider } from '@/components/ui/slider'

export function WeightSlider() {
  const [weights, setWeights] = useState<WeightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<'practice' | 'premium' | 'global'>('practice')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWeights()
  }, [])

  const fetchWeights = async () => {
    try {
      const data = await kevinApi.getWeights()
      setWeights(data)
    } catch (error) {
      console.error('Failed to fetch weights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWeightChange = async (providerId: string, weight: number) => {
    if (!weights) return

    setSaving(true)
    try {
      await kevinApi.updateWeight(providerId, weight, currentPlan === 'global' ? undefined : currentPlan)
      await fetchWeights()
    } catch (error) {
      console.error('Failed to update weight:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>权重配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  if (!weights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>权重配置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">无法加载权重配置</p>
        </CardContent>
      </Card>
    )
  }

  const currentWeights = currentPlan === 'global'
    ? weights.global_weights
    : currentPlan === 'practice'
    ? Object.fromEntries((weights.plans.practice.providers || []).map(p => [p.provider_id, p.weight]))
    : Object.fromEntries((weights.plans.premium.providers || []).map(p => [p.provider_id, p.weight]))

  const providers = Object.entries(currentWeights)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>权重配置</span>
          <div className="flex gap-2">
            {(['global', 'practice', 'premium'] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => setCurrentPlan(plan)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  currentPlan === plan
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {plan === 'global' ? '全局' : plan === 'practice' ? '练习模式' : '精品模式'}
              </button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>暂无权重配置</p>
            <p className="text-xs mt-1">请先注册节点后再进行权重配置</p>
          </div>
        ) : (
          <div className="space-y-6">
            {providers.map(([providerId, weight]) => (
              <div key={providerId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{providerId}</label>
                  <span className="text-sm text-muted-foreground">{weight}%</span>
                </div>
                <Slider
                  value={weight as number}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(val) => handleWeightChange(providerId, val)}
                  disabled={saving}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          提示：权重越高，该节点被选中的概率越大。权重为 0 时，节点不会被分配请求。
        </p>
      </CardContent>
    </Card>
  )
}
