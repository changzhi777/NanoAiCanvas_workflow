import { Suspense, lazy, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from './hooks/useI18n'
import { SkipLink } from './components/accessibility/SkipLink'
import { CustomCursor } from './components/ui/CustomCursor'
import { CursorProvider, useCursor } from './contexts/CursorContext'
import { ThemeProvider } from './components/nanoai-workflow/ui/Theme'
import { Toaster, toast } from 'sonner'
import { setGlobalErrorHandler, type ErrorSeverity } from './lib/api/client'
import { loadRoutes } from './lib/api/model-routing'

const CanvasPage = lazy(() => import('./pages/CanvasPage'))
const NanoaiWorkflowPage = lazy(() => import('./pages/NanoaiWorkflowPage'))
const Nano2Page = lazy(() => import('./app/nano2/page'))
const AdminPage = lazy(() => import('./app/admin/page'))
const AdminProvidersPage = lazy(() => import('./app/admin/providers/page'))
const AdminApiKeysPage = lazy(() => import('./app/admin/api-keys/page'))
const AdminSystemPage = lazy(() => import('./app/admin/system/page'))
const AdminModelsPage = lazy(() => import('./app/admin/models/page'))
const AdminMqttPage = lazy(() => import('./app/admin/mqtt/page'))
const AdminTeamsPage = lazy(() => import('./app/admin/teams/page'))
const AdminUserApplyPage = lazy(() => import('./app/admin/user-apply/page'))
const AdminStatisticsPage = lazy(() => import('./app/admin/statistics/page'))
const AdminSendNotificationPage = lazy(() => import('./app/admin/notifications/send/page'))
const AdminNotificationRecordsPage = lazy(() => import('./app/admin/notifications/records/page'))
const AdminGrantPointsPage = lazy(() => import('./app/admin/points/grant/page'))
const AdminApiKeyPoolPage = lazy(() => import('./app/admin/api-key-pool/page'))
const AdminMCPPage = lazy(() => import('./app/admin/mcp/page'))
const AdminKevinPage = lazy(() => import('./app/admin/kevin/page'))
const AdminAppsPage = lazy(() => import('./app/admin/apps/page'))
import { AdminSidebar } from './components/admin/AdminSidebar'

type AdminPageType = 'canvas' | 'workflow' | 'nano2' | 'admin' | 'admin-providers' | 'admin-api-keys' | 'admin-system' | 'admin-models' | 'admin-mqtt' | 'admin-teams' | 'admin-user-apply' | 'admin-statistics' | 'admin-notifications-send' | 'admin-notifications-records' | 'admin-points-grant' | 'admin-api-key-pool' | 'admin-mcp' | 'admin-kevin' | 'admin-apps'

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
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

const ERROR_MESSAGES: Record<ErrorSeverity, string> = {
  network: '网络连接失败，请检查网络',
  server: '服务器繁忙，请稍后重试',
  client: '请求参数错误',
  auth: '登录已过期，请重新登录',
}

function AppContent() {
  const { t } = useI18n()
  const { enabled: cursorEnabled } = useCursor()
  const [currentPage, setCurrentPage] = useState<AdminPageType>('workflow')

  // 注册全局 API 错误处理
  useEffect(() => {
    setGlobalErrorHandler(({ severity, message }) => {
      const display = severity === 'client' ? message : ERROR_MESSAGES[severity]
      toast.error(display)
    })
    // 启动时加载模型路由配置
    loadRoutes()
  }, [])

  // 监听页面切换事件
  useEffect(() => {
    const handleSwitchPage = (e: CustomEvent) => {
      setCurrentPage(e.detail)
    }
    window.addEventListener('switch-page', handleSwitchPage as EventListener)
    return () => window.removeEventListener('switch-page', handleSwitchPage as EventListener)
  }, [])

  // 根据 URL 路径初始化页面
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/nano2') {
      setCurrentPage('nano2')
    } else if (path === '/canvas') {
      setCurrentPage('canvas')
    } else if (path.startsWith('/nanoaicanvas/admin/mqtt')) {
      setCurrentPage('admin-mqtt')
    } else if (path.startsWith('/nanoaicanvas/admin/teams')) {
      setCurrentPage('admin-teams')
    } else if (path.startsWith('/nanoaicanvas/admin/user-apply')) {
      setCurrentPage('admin-user-apply')
    } else if (path.startsWith('/nanoaicanvas/admin/statistics')) {
      setCurrentPage('admin-statistics')
    } else if (path.startsWith('/nanoaicanvas/admin/notifications/send')) {
      setCurrentPage('admin-notifications-send')
    } else if (path.startsWith('/nanoaicanvas/admin/notifications/records')) {
      setCurrentPage('admin-notifications-records')
    } else if (path.startsWith('/nanoaicanvas/admin/points/grant')) {
      setCurrentPage('admin-points-grant')
    } else if (path.startsWith('/nanoaicanvas/admin/points')) {
      setCurrentPage('admin-points-grant')
    } else if (path.startsWith('/nanoaicanvas/admin/mcp')) {
      setCurrentPage('admin-mcp')
    } else if (path.startsWith('/nanoaicanvas/admin/kevin')) {
      setCurrentPage('admin-kevin')
    } else if (path.startsWith('/nanoaicanvas/admin/apps')) {
      setCurrentPage('admin-apps')
    } else if (path.startsWith('/nanoaicanvas/admin/api-key-pool')) {
      setCurrentPage('admin-api-key-pool')
    } else if (path.startsWith('/nanoaicanvas/admin/providers')) {
      setCurrentPage('admin-providers')
    } else if (path.startsWith('/nanoaicanvas/admin/api-keys')) {
      setCurrentPage('admin-api-keys')
    } else if (path.startsWith('/nanoaicanvas/admin/system')) {
      setCurrentPage('admin-system')
    } else if (path.startsWith('/nanoaicanvas/admin/models')) {
      setCurrentPage('admin-models')
    } else if (path.startsWith('/nanoaicanvas/admin')) {
      setCurrentPage('admin')
    }
  }, [])

  // 监听 popstate 事件（浏览器前进/后退）
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/nano2') {
        setCurrentPage('admin-mqtt')
      } else if (path === '/canvas') {
        setCurrentPage('canvas')
      } else if (path.startsWith('/nanoaicanvas/admin/mqtt')) {
        setCurrentPage('admin-mqtt')
      } else if (path.startsWith('/nanoaicanvas/admin/teams')) {
        setCurrentPage('admin-teams')
      } else if (path.startsWith('/nanoaicanvas/admin/user-apply')) {
        setCurrentPage('admin-user-apply')
      } else if (path.startsWith('/nanoaicanvas/admin/statistics')) {
        setCurrentPage('admin-statistics')
      } else if (path.startsWith('/nanoaicanvas/admin/notifications')) {
        setCurrentPage('admin-notifications-send')
      } else if (path.startsWith('/nanoaicanvas/admin/points')) {
        setCurrentPage('admin-points-grant')
      } else if (path.startsWith('/nanoaicanvas/admin/mcp')) {
        setCurrentPage('admin-mcp')
      } else if (path.startsWith('/nanoaicanvas/admin/kevin')) {
        setCurrentPage('admin-kevin')
      } else if (path.startsWith('/nanoaicanvas/admin/apps')) {
        setCurrentPage('admin-apps')
      } else if (path.startsWith('/nanoaicanvas/admin/api-key-pool')) {
        setCurrentPage('admin-api-key-pool')
      } else if (path.startsWith('/nanoaicanvas/admin/providers')) {
        setCurrentPage('admin-providers')
      } else if (path.startsWith('/nanoaicanvas/admin/api-keys')) {
        setCurrentPage('admin-api-keys')
      } else if (path.startsWith('/nanoaicanvas/admin/system')) {
        setCurrentPage('admin-system')
      } else if (path.startsWith('/nanoaicanvas/admin/models')) {
        setCurrentPage('admin-models')
      } else if (path.startsWith('/nanoaicanvas/admin')) {
        setCurrentPage('admin')
      } else {
        setCurrentPage('workflow')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 可访问性：跳转到主内容链接 */}
      <SkipLink />

      {/* 自定义 cursor（可选功能） */}
      {cursorEnabled && <CustomCursor />}

      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        }
      >
        {currentPage === 'canvas' && <CanvasPage />}
        {currentPage === 'workflow' && <NanoaiWorkflowPage />}
        {currentPage === 'nano2' && <Nano2Page />}
        {currentPage === 'admin' && <AdminLayout><AdminPage /></AdminLayout>}
        {currentPage === 'admin-providers' && <AdminLayout><AdminProvidersPage /></AdminLayout>}
        {currentPage === 'admin-api-keys' && <AdminLayout><AdminApiKeysPage /></AdminLayout>}
        {currentPage === 'admin-system' && <AdminLayout><AdminSystemPage /></AdminLayout>}
        {currentPage === 'admin-models' && <AdminLayout><AdminModelsPage /></AdminLayout>}
        {currentPage === 'admin-mqtt' && <AdminLayout><AdminMqttPage /></AdminLayout>}
        {currentPage === 'admin-teams' && <AdminLayout><AdminTeamsPage /></AdminLayout>}
        {currentPage === 'admin-user-apply' && <AdminLayout><AdminUserApplyPage /></AdminLayout>}
        {currentPage === 'admin-statistics' && <AdminLayout><AdminStatisticsPage /></AdminLayout>}
        {currentPage === 'admin-notifications-send' && <AdminLayout><AdminSendNotificationPage /></AdminLayout>}
        {currentPage === 'admin-notifications-records' && <AdminLayout><AdminNotificationRecordsPage /></AdminLayout>}
        {currentPage === 'admin-points-grant' && <AdminLayout><AdminGrantPointsPage /></AdminLayout>}
        {currentPage === 'admin-api-key-pool' && <AdminLayout><AdminApiKeyPoolPage /></AdminLayout>}
        {currentPage === 'admin-mcp' && <AdminLayout><AdminMCPPage /></AdminLayout>}
        {currentPage === 'admin-kevin' && <AdminLayout><AdminKevinPage /></AdminLayout>}
        {currentPage === 'admin-apps' && <AdminLayout><AdminAppsPage /></AdminLayout>}
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="nanoai-workflow-theme">
      <CursorProvider>
        <AppContent />
      </CursorProvider>
    </ThemeProvider>
  )
}

export default App
