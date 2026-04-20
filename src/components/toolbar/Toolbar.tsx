import { useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Settings,
  Languages,
  Moon,
  Sun,
  MousePointer2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme, setLocale, selectAutosave } from '@/store/slices/settingsSlice'
import { useReactFlow } from 'reactflow'
import { useI18n } from '@/hooks/useI18n'
import { exportData } from '@/store/db'
import { toast } from 'sonner'
import { useCursor } from '@/contexts/CursorContext'

export default function Toolbar() {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const autosave = useAppSelector(selectAutosave)
  const theme = useAppSelector((state) => state.settings.theme)
  const locale = useAppSelector((state) => state.settings.locale)
  const { enabled: cursorEnabled, toggleCursor } = useCursor()

  // 缩放操作
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 })
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ duration: 300 })
  }, [fitView])

  // 主题切换
  const handleToggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    dispatch(setTheme(newTheme))
  }, [theme, dispatch])

  // 语言切换
  const handleToggleLocale = useCallback(() => {
    const newLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN'
    dispatch(setLocale(newLocale))
  }, [locale, dispatch])

  // 导出数据
  const handleExport = useCallback(async () => {
    try {
      const data = await exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nanoai-canvas-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('common.export'))
    } catch (error) {
      toast.error('导出失败')
    }
  }, [t])

  // 导入数据
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          await file.text()
          // TODO: 导入数据逻辑
          toast.success(t('common.import'))
        } catch (error) {
          toast.error('导入失败')
        }
      }
    }
    input.click()
  }, [t])

  // 手动保存
  const handleSave = useCallback(() => {
    toast.success('保存成功')
  }, [])

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      {/* 左侧：Logo 和文件操作 */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-primary">NanoAiCanvas</h1>
        <div className="ml-4 flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            {t('common.save')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t('common.export')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4" />
            {t('common.import')}
          </Button>
        </div>
      </div>

      {/* 中间：画布操作 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomOut}
          aria-label={t('a11y.zoomOut')}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomIn}
          aria-label={t('a11y.zoomIn')}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleFitView}
          aria-label={t('a11y.fitView')}
        >
          <Maximize className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <Button variant="ghost" size="icon-sm" aria-label={t('canvas.undo')}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={t('canvas.redo')}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 右侧：设置和工具 */}
      <div className="flex items-center gap-1">
        {autosave && (
          <span className="mr-2 text-xs text-muted-foreground">
            {t('canvas.autosave')}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleLocale}
          aria-label="切换语言"
        >
          <Languages className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleTheme}
          aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant={cursorEnabled ? 'default' : 'ghost'}
          size="icon-sm"
          onClick={toggleCursor}
          aria-label={cursorEnabled ? '禁用自定义光标' : '启用自定义光标'}
          title={cursorEnabled ? '自定义光标已启用' : '自定义光标已禁用'}
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={t('common.settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
