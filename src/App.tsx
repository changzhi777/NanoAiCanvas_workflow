import { Suspense, lazy, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from './hooks/useI18n'
import { SkipLink } from './components/accessibility/SkipLink'
import { CustomCursor } from './components/ui/CustomCursor'
import { CursorProvider, useCursor } from './contexts/CursorContext'
import { ThemeProvider } from './components/nanoai-workflow/ui/Theme'

const CanvasPage = lazy(() => import('./pages/CanvasPage'))
const NanoaiWorkflowPage = lazy(() => import('./pages/NanoaiWorkflowPage'))

function AppContent() {
  const { t } = useI18n()
  const { enabled: cursorEnabled } = useCursor()
  const [currentPage, setCurrentPage] = useState<'canvas' | 'workflow'>('workflow')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 可访问性：跳转到主内容链接 */}
      <SkipLink />

      {/* 页面切换按钮 - Base Nova OKLCH 配色系统 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 rounded-full p-1 border backdrop-blur-sm bg-card/90 border-border">
        <button
          onClick={() => setCurrentPage('canvas')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            currentPage === 'canvas'
              ? 'text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
          style={currentPage === 'canvas' ? {
            background: 'hsl(var(--primary))',
            border: '1px solid hsl(var(--primary))',
          } : {
            border: '1px solid transparent',
          }}
        >
          无限画布
        </button>
        <button
          onClick={() => setCurrentPage('workflow')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            currentPage === 'workflow'
              ? 'text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
          style={currentPage === 'workflow' ? {
            background: 'hsl(var(--primary))',
            border: '1px solid hsl(var(--primary))',
          } : {
            border: '1px solid transparent',
          }}
        >
          NanoAI Workflow
        </button>
      </div>

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
        {currentPage === 'canvas' ? <CanvasPage /> : <NanoaiWorkflowPage />}
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
