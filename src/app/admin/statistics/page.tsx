'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Globe, Key, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

export default function StatisticsPage() {
  const stats = [
    { title: '渠道商总数', value: '3', change: '+1', trend: 'up', icon: Globe },
    { title: '活跃 API Key', value: '12', change: '+3', trend: 'up', icon: Key },
    { title: '总调用次数', value: '1,234', change: '+156', trend: 'up', icon: Activity },
    { title: '平均成功率', value: '98.5%', change: '-0.5%', trend: 'down', icon: CheckCircle },
  ]

  return (
    <div className="space-y-6">
      <AdminHeader
        title="统计分析"
        subtitle="平台运营数据概览"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stat.value}</span>
                <div className={`flex items-center gap-1 text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 详细数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 渠道商分布 */}
        <Card>
          <CardHeader>
            <CardTitle>渠道商调用分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'MiniMax', percent: 45, calls: 556 },
                { name: '速创API', percent: 35, calls: 432 },
                { name: '智谱AI', percent: 20, calls: 246 },
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.calls} 次 ({item.percent}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 告警信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              告警信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: '10:30', message: 'MiniMax API Key 接近用量限制', level: 'warning' },
                { time: '09:15', message: '速创API 响应时间异常', level: 'error' },
                { time: '昨天', message: '智谱AI Key 已过期', level: 'info' },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant={alert.level === 'error' ? 'destructive' : alert.level === 'warning' ? 'warning' : 'secondary'}>
                    {alert.level}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}