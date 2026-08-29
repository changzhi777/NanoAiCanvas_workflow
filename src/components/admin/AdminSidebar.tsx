'use client'

import { usePathname } from '@/lib/next-navigation-shim'
import { cn } from '@/lib/utils'
import {
  Settings,
  Key,
  Server,
  ChevronRight,
  ChevronLeft,
  Globe,
  Users,
  MessageSquare,
  BarChart3,
  Zap,
  Wifi,
  UserPlus,
  Plug,
  Activity,
  LayoutGrid,
  Bell,
  TrendingUp,
} from 'lucide-react'

// 简单的 Link 组件替代 next/link
function NavLink({ href, children, className, icon: Icon }: { href: string; children: React.ReactNode; className?: string; icon?: any }) {
  return (
    <div
      onClick={() => window.location.href = href}
      className={cn('cursor-pointer', className)}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </div>
  )
}

const navigation = [
  {
    title: '渠道商管理',
    items: [
      {
        title: '渠道商列表',
        href: '/nanoai/admin/providers',
        icon: Globe,
      },
      {
        title: 'API Key 池',
        href: '/nanoai/admin/api-key-pool',
        icon: Key,
      },
      {
        title: 'MCP 配置',
        href: '/nanoai/admin/mcp',
        icon: Plug,
      },
    ],
  },
  {
    title: '应用管理',
    items: [
      {
        title: 'Workflow 管理',
        href: '/nanoai/admin/apps/workflow',
        icon: LayoutGrid,
      },
      {
        title: 'Nano 2 管理',
        href: '/nanoai/admin/apps/nano2',
        icon: LayoutGrid,
      },
      {
        title: 'TVC 配置',
        href: '/nanoai/admin/tvc-config',
        icon: LayoutGrid,
      },
    ],
  },
  {
    title: '模型与定价',
    items: [
      {
        title: '模型配置',
        href: '/nanoai/admin/models',
        icon: Server,
      },
      {
        title: '用量统计',
        href: '/nanoai/admin/models/usage',
        icon: BarChart3,
      },
      {
        title: '模型路由',
        href: '/nanoai/admin/models/routes',
        icon: Activity,
      },
      {
        title: '积分管理',
        href: '/nanoai/admin/points',
        icon: Zap,
      },
    ],
  },
  {
    title: '消息通知',
    items: [
      {
        title: '发送消息',
        href: '/nanoai/admin/notifications/send',
        icon: Bell,
      },
      {
        title: '消息记录',
        href: '/nanoai/admin/notifications/records',
        icon: MessageSquare,
      },
    ],
  },
  {
    title: '团队管理',
    items: [
      {
        title: '团队列表',
        href: '/nanoai/admin/teams',
        icon: Users,
      },
      {
        title: '创建团队',
        href: '/nanoai/admin/teams/create',
        icon: UserPlus,
      },
    ],
  },
  {
    title: '用户管理',
    items: [
      {
        title: '用户申请',
        href: '/nanoai/admin/user-apply',
        icon: UserPlus,
      },
      {
        title: '统计分析',
        href: '/nanoai/admin/statistics',
        icon: TrendingUp,
      },
    ],
  },
  {
    title: '通讯管理',
    items: [
      {
        title: 'MQTT 配置',
        href: '/nanoai/admin/mqtt',
        icon: Wifi,
      },
    ],
  },
  {
    title: '负载均衡',
    items: [
      {
        title: 'Kevin 算法',
        href: '/nanoai/admin/kevin',
        icon: Activity,
      },
    ],
  },
  {
    title: '系统',
    items: [
      {
        title: '系统配置',
        href: '/nanoai/admin/system',
        icon: Settings,
      },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      {/* Logo/标题 */}
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">管理后台</h1>
        <p className="text-xs text-muted-foreground">NanoAI Canvas</p>
      </div>

      {/* 返回按钮 */}
      <div className="p-3 border-b">
        <button
          onClick={() => window.location.href = '/nanoai'}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回主应用
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <div key={item.href}>
                    <NavLink
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      icon={item.icon}
                    >
                      {item.title}
                    </NavLink>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>管理后台 v1.0.0</p>
      </div>
    </aside>
  )
}

export default AdminSidebar