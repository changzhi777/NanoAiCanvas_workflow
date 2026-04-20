import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from './hooks/useI18n'
import { SkipLink } from './components/accessibility/SkipLink'
import { CustomCursor } from './components/ui/CustomCursor'
import { CursorProvider, useCursor } from './contexts/CursorContext'

const CanvasPage = lazy(() => import('./pages/CanvasPage'))

function AppContent() {
  const { t } = useI18n()
  const { enabled: cursorEnabled } = useCursor()

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
        <CanvasPage />
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <CursorProvider>
      <AppContent />
    </CursorProvider>
  )
}

export default App
