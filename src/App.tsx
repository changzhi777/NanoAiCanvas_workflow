import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from './hooks/useI18n'

const CanvasPage = lazy(() => import('./pages/CanvasPage'))

function App() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background text-foreground">
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

export default App
