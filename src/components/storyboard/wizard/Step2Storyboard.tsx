'use client'

import { useState, useRef } from 'react'
import { Download, Loader2, Sparkles, Image as ImageIcon, Trash2, ChevronUp, ChevronDown, FileText, FolderArchive, FileImage, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStoryboardWizardStore, type StoryboardImage } from '@/stores/nanoImageStoryboardWizardStore'
import { cn } from '@/lib/utils'
import { showNotification, generateUniqueId } from '@/lib/utils/wizard-helpers'

// JSZip 类型声明
declare global {
  interface Window {
    JSZip: any
  }
}

export function Step2Storyboard() {
  const {
    scriptData,
    storyboardImages,
    isGeneratingStoryboard,
    setStoryboardImages,
    setIsGeneratingStoryboard,
    removeStoryboardImage,
    reorderStoryboardImages,
    addStoryboardImage,
  } = useStoryboardWizardStore()

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  // 生成故事板图片
  const handleGenerateStoryboard = async () => {
    if (!scriptData?.scenes?.length) {
      showNotification('请先生成剧本', 'error')
      return
    }

    setIsGeneratingStoryboard(true)
    try {
      const { generateStoryboardImages } = await import('@/lib/api/storyboard')
      const { useAuthStore } = await import('@/stores/remoteStore')
      const user = useAuthStore.getState().user

      if (!user?.imageApiKey) {
        showNotification('请先配置速创 API Key', 'error')
        return
      }

      const urls = await generateStoryboardImages(
        user.imageApiKey,
        scriptData as any, // 类型转换以兼容
        (scriptData.style as any) || 'comic',
        (current, total, _url) => {
          console.log(`生成进度: ${current}/${total}`)
        }
      )

      const newImages: StoryboardImage[] = urls.map((url, index) => ({
        id: generateUniqueId('img'),
        url,
        sceneId: scriptData.scenes[index]?.id || index,
        description: scriptData.scenes[index]?.description || '',
        order: index + 1,
        generatedAt: new Date().toISOString(),
      }))

      setStoryboardImages(newImages)
      showNotification(`成功生成 ${newImages.length} 张故事板图片`, 'success')
    } catch (error) {
      console.error('生成故事板失败:', error)
      showNotification(error instanceof Error ? error.message : '生成故事板失败', 'error')
    } finally {
      setIsGeneratingStoryboard(false)
    }
  }

  // 导入图片
  const handleImportImages = () => {
    fileInputRef.current?.click()
  }

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: StoryboardImage[] = []
    const existingCount = storyboardImages.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      const url = URL.createObjectURL(file)
      newImages.push({
        id: generateUniqueId('img'),
        url,
        file,
        sceneId: `imported_${i}`,
        description: file.name.replace(/\.[^/.]+$/, ''),
        order: existingCount + i + 1,
        generatedAt: new Date().toISOString(),
      })
    }

    // 添加到现有图片列表
    newImages.forEach(img => addStoryboardImage(img))
    showNotification(`成功导入 ${newImages.length} 张图片`, 'success')
    e.target.value = ''
  }

  // 导入 ZIP
  const handleImportZip = () => {
    zipInputRef.current?.click()
  }

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // 动态加载 JSZip
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)

      const newImages: StoryboardImage[] = []
      const existingCount = storyboardImages.length
      let index = 0

      // 遍历 ZIP 中的图片文件
      const promises: Promise<void>[] = []

      zip.forEach((relativePath: string, zipEntry: any) => {
        if (zipEntry.dir) return
        if (!relativePath.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i)) return

        const promise = zipEntry.async('blob').then((blob: Blob) => {
          const url = URL.createObjectURL(blob)
          newImages.push({
            id: generateUniqueId('img'),
            url,
            sceneId: `zip_${index}`,
            description: relativePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || relativePath,
            order: existingCount + index + 1,
            generatedAt: new Date().toISOString(),
          })
          index++
        })
        promises.push(promise)
      })

      await Promise.all(promises)

      // 按顺序添加
      newImages.sort((a, b) => a.order - b.order)
      newImages.forEach(img => addStoryboardImage(img))

      showNotification(`从 ZIP 导入 ${newImages.length} 张图片`, 'success')
    } catch (error) {
      console.error('ZIP 解压失败:', error)
      showNotification('ZIP 解压失败，请检查文件格式', 'error')
    }

    e.target.value = ''
  }

  // 导出为 JSON
  const handleExportJson = () => {
    if (storyboardImages.length === 0) {
      showNotification('没有图片可导出', 'error')
      return
    }

    const data = {
      images: storyboardImages.map(({ file: _file, ...rest }) => rest),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `storyboard_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('已导出 JSON 配置', 'success')
  }

  // 导出为 ZIP
  const handleExportZip = async () => {
    if (storyboardImages.length === 0) {
      showNotification('没有图片可导出', 'error')
      return
    }

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // 下载所有图片并添加到 ZIP
      for (let i = 0; i < storyboardImages.length; i++) {
        const img = storyboardImages[i]
        try {
          const response = await fetch(img.url)
          const blob = await response.blob()
          const ext = img.url.includes('.png') ? 'png' : img.url.includes('.gif') ? 'gif' : 'jpg'
          zip.file(`${String(i + 1).padStart(3, '0')}_${img.description.slice(0, 20)}.${ext}`, blob)
        } catch (e) {
          console.warn(`下载图片 ${i + 1} 失败:`, e)
        }
      }

      // 添加 manifest.json
      const manifest = {
        total: storyboardImages.length,
        images: storyboardImages.map(({ file: _file, ...rest }) => rest),
      }
      zip.file('manifest.json', JSON.stringify(manifest, null, 2))

      // 生成并下载
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `storyboard_${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      showNotification('已导出 ZIP 压缩包', 'success')
    } catch (error) {
      console.error('ZIP 导出失败:', error)
      showNotification('ZIP 导出失败', 'error')
    }
  }

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    // 检查是否为 ZIP
    if (files[0].name.endsWith('.zip')) {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(files[0])

      const newImages: StoryboardImage[] = []
      const existingCount = storyboardImages.length
      let index = 0

      const promises: Promise<void>[] = []
      zip.forEach((relativePath: string, zipEntry: any) => {
        if (zipEntry.dir) return
        if (!relativePath.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i)) return

        const promise = zipEntry.async('blob').then((blob: Blob) => {
          const url = URL.createObjectURL(blob)
          newImages.push({
            id: generateUniqueId('img'),
            url,
            sceneId: `drop_${index}`,
            description: relativePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || relativePath,
            order: existingCount + index + 1,
            generatedAt: new Date().toISOString(),
          })
          index++
        })
        promises.push(promise)
      })

      await Promise.all(promises)
      newImages.sort((a, b) => a.order - b.order)
      newImages.forEach(img => addStoryboardImage(img))
      showNotification(`拖拽导入 ${newImages.length} 张图片`, 'success')
    } else {
      // 普通图片文件
      const newImages: StoryboardImage[] = []
      const existingCount = storyboardImages.length

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        const url = URL.createObjectURL(file)
        newImages.push({
          id: generateUniqueId('img'),
          url,
          file,
          sceneId: `drop_${i}`,
          description: file.name.replace(/\.[^/.]+$/, ''),
          order: existingCount + i + 1,
          generatedAt: new Date().toISOString(),
        })
      }

      newImages.forEach(img => addStoryboardImage(img))
      showNotification(`拖拽导入 ${newImages.length} 张图片`, 'success')
    }
  }, [storyboardImages.length, addStoryboardImage])

  // 删除图片
  const handleDeleteImage = (id: string) => {
    removeStoryboardImage(id)
    if (selectedImageId === id) setSelectedImageId(null)
    showNotification('已删除图片', 'info')
  }

  // 移动图片
  const handleMoveImage = (id: string, direction: 'up' | 'down') => {
    const index = storyboardImages.findIndex(img => img.id === id)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= storyboardImages.length) return

    reorderStoryboardImages(index, newIndex)
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportImages}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <FileImage className="w-3.5 h-3.5 mr-1.5" />
            导入图片
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportZip}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <FolderArchive className="w-3.5 h-3.5 mr-1.5" />
            导入 ZIP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={storyboardImages.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            导出 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportZip}
            disabled={storyboardImages.length === 0}
            className="h-8 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            导出 ZIP
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageFilesChange}
            className="hidden"
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipFileChange}
            className="hidden"
          />
        </div>
        <span className="text-xs text-slate-500">支持图片 / ZIP</span>
      </div>

      {/* 剧本摘要 */}
      {scriptData && (
        <details className="border border-slate-700 rounded-lg">
          <summary className="px-3 py-2 cursor-pointer text-sm text-slate-300 hover:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            剧本摘要 ({scriptData.scenes?.length || 0} 个场景)
          </summary>
          <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-700">
            <p className="font-medium text-slate-300 mb-1">{scriptData.title}</p>
            <p className="line-clamp-2">{scriptData.synopsis}</p>
          </div>
        </details>
      )}

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerateStoryboard}
        disabled={isGeneratingStoryboard || !scriptData?.scenes?.length}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        {isGeneratingStoryboard ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            正在生成故事板...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            生成故事板图片
          </>
        )}
      </Button>

      {/* 拖拽上传区域 / 图片网格 */}
      {storyboardImages.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDraggingOver
              ? "border-purple-500 bg-purple-500/10"
              : "border-slate-700 hover:border-slate-600"
          )}
        >
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400 mb-2">拖拽图片或 ZIP 文件到此处</p>
          <p className="text-xs text-slate-500">支持 PNG, JPG, GIF, WEBP</p>
        </div>
      ) : (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              故事板图片 ({storyboardImages.length})
            </span>
            <span className="text-xs text-slate-500">点击选择，拖拽可排序</span>
          </div>
          <ScrollArea className="h-[220px]">
            <div
              className="grid grid-cols-3 gap-3 p-3"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {storyboardImages.map((image, index) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                    selectedImageId === image.id
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-transparent hover:border-purple-500/50"
                  )}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  {/* 图片序号 */}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded z-10">
                    #{image.order || index + 1}
                  </div>

                  {/* 图片 */}
                  <div className="aspect-video bg-slate-700 flex items-center justify-center">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.description}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                    )}
                  </div>

                  {/* 操作按钮 - hover显示 */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 bg-red-500/80 hover:bg-red-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteImage(image.id)
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* 排序按钮 */}
          {selectedImageId && (
            <div className="px-3 py-2 bg-slate-800/30 border-t border-slate-700 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMoveImage(selectedImageId, 'up')}
                disabled={storyboardImages.findIndex(img => img.id === selectedImageId) === 0}
                className="h-7 text-xs"
              >
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                上移
              </Button>
              <span className="text-xs text-slate-500">
                选中 #{storyboardImages.find(img => img.id === selectedImageId)?.order || '-'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMoveImage(selectedImageId, 'down')}
                disabled={storyboardImages.findIndex(img => img.id === selectedImageId) === storyboardImages.length - 1}
                className="h-7 text-xs"
              >
                下移
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
