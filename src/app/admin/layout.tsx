'use client'

import { useAuthStore } from '@/stores/remoteStore'
import { useRouter } from '@/lib/next-navigation-shim'
import { useEffect } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Toaster } from 'sonner'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuthStore()
  const router = useRouter()

  // 权限检查 - 简单实现，实际应该检查admin角色
  useEffect(() => {
    if (!user) {
      // 未登录用户可以访问登录页
      return
    }
    // TODO: 验证用户是否有admin权限
    // 暂时允许所有登录用户访问
  }, [user, router])

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <AdminSidebar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Toast 通知容器 */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'hsl(0 0% 14%)',
            color: 'hsl(0 0% 95%)',
            border: '1px solid hsl(0 0% 20%)',
            backdropFilter: 'none',
          },
        }}
      />
    </div>
  )
}