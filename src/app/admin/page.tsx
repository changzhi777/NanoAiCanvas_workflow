'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Globe,
  Key,
  Server,
  Settings,
  ChevronRight,
  Users,
  Wifi,
  Zap,
  Bell,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { useRouter } from '@/lib/next-navigation-shim'

const menuItems = [
  {
    title: '渠道商管理',
    description: '管理API渠道商、模型配置和密钥',
    icon: Globe,
    href: '/nanoaicanvas/admin/providers',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'API Key 池',
    description: '管理所有渠道商的API Keys',
    icon: Key,
    href: '/nanoaicanvas/admin/api-key-pool',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Key Mapper',
    description: '前端Key到后端Key映射配置，支持热加载',
    icon: Key,
    href: '/nanoaicanvas/admin/key-mapper',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: '模型配置',
    description: '配置和管理模型服务',
    icon: Server,
    href: '/nanoaicanvas/admin/models',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: '用量统计',
    description: '模型调用统计和健康监控',
    icon: BarChart3,
    href: '/nanoaicanvas/admin/models/usage',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    title: '积分管理',
    description: '发放积分、扣费设置、账户查询',
    icon: Zap,
    href: '/nanoaicanvas/admin/points',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    title: '消息通知',
    description: '发送消息、查看消息记录',
    icon: Bell,
    href: '/nanoaicanvas/admin/notifications/send',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    title: '团队管理',
    description: '团队列表、创建团队',
    icon: Users,
    href: '/nanoaicanvas/admin/teams',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    title: '用户管理',
    description: '用户申请、统计分析',
    icon: TrendingUp,
    href: '/nanoaicanvas/admin/user-apply',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    title: '通讯管理',
    description: 'MQTT 连接状态和配置',
    icon: Wifi,
    href: '/nanoaicanvas/admin/mqtt',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    title: '系统配置',
    description: '系统参数和功能设置',
    icon: Settings,
    href: '/nanoaicanvas/admin/system',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
]

export default function AdminPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <AdminHeader
        title="管理后台"
        subtitle="NanoAI Canvas 管理员控制台"
      />

      {/* 菜单卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.href} onClick={() => router.push(item.href)}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3 text-sm">{item.description}</CardDescription>
                  <div className="flex items-center text-xs text-primary group-hover:underline">
                    立即配置
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
