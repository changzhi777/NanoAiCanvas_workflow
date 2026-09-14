'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clapperboard,
  Sparkles,
  Copy,
  Check,
  Upload,
  FileJson,
  FileType,
  FileText,
  Users,
  MessageSquare,
  LayoutGrid,
  Volume2,
  X,
  Wand2,
  Images,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useStoryboardStore,
  STORYBOARD_STYLE_OPTIONS,
  type StoryboardStyle,
} from '@/stores/nanoImageStoryboardStore'
import { useStoryboardTaskStore } from '@/stores/nanoImageStoryboardTaskStore'
import { useAuthStore } from '@/stores/remoteStore'
import { StoryboardWizard } from '@/components/storyboard/StoryboardWizard'
import {
  CharactersTab,
  DialoguesTab,
  StoryboardChartTab,
  VoiceSynthesisTab,
} from '@/components/storyboard'
import { GenerationAnimation } from '@/components/storyboard/GenerationAnimation'
import {
  parseUploadedFile,
  exportToMarkdownStoryboard,
  exportToJson,
  downloadFile,
} from '@/lib/utils/file-parser'
import AssetLibraryPanel from '@/components/ui/AssetLibrary/AssetLibraryPanel'
import { AssetReferenceSelector } from '@/components/ui/AssetLibrary/AssetReferenceSelector'
import { CharacterConsistencyPanel } from '@/components/ui/AssetLibrary/CharacterConsistencyPanel'
import type { Asset } from '@/lib/api/client'

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface StoryboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  textApiKey: string  // 智谱 API Key，用于生成分镜头脚本
  imageApiKey: string // 速创 API Key，用于生成图片
}

// Tab 类型
type TabType = 'script' | 'characters' | 'dialogues' | 'chart' | 'voice'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// 默认用户ID（单用户模式）
const DEFAULT_USER_ID = 'changzhi'

export function StoryboardDialog({
  open,
  onOpenChange,
  textApiKey,
  imageApiKey,
}: StoryboardDialogProps) {
  const router = useRouter()

  // 用户信息
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || DEFAULT_USER_ID

  // 故事板UI Store
  const {
    isGenerating,
    currentTask,
    progress,
    inputText,
    selectedStyle,
    script,
    storyboardImages,
    characterDesigns,
    setInputText,
    setStyle,
    setGenerating,
    setScript,
    addStoryboardImage,
    setCharacterDesign,
    reset,
  } = useStoryboardStore()

  // 故事板任务队列 Store
  const {
    tasks: storyboardTasks,
    startTask,
    cancelTask,
    loadTasks,
    loadAssets,
    runningTaskId,
    showCompletionToast,
    dismissCompletionToast,
  } = useStoryboardTaskStore()

  // Local state
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('script')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [assetSelectOpen, setAssetSelectOpen] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([])
  const [characterRefs, setCharacterRefs] = useState<Array<{ id: string; name: string; imageUrl: string; traits: string[] }>>([])

  // 加载任务列表
  useEffect(() => {
    if (open) {
      loadTasks()
      loadAssets()
    }
  }, [open, loadTasks, loadAssets])

  // 监听后台任务完成，刷新UI显示
  useEffect(() => {
    if (runningTaskId) {
      const runningTask = storyboardTasks.find(t => t.id === runningTaskId)
      if (runningTask?.status === 'success' && runningTask.script) {
        // 将完成的任务数据同步到UI Store
        setScript(runningTask.script)
        runningTask.storyboardImages?.forEach((url: string) => addStoryboardImage(url))
        runningTask.characterDesigns?.forEach((cd: any) => setCharacterDesign(cd.characterId, cd.imageUrl || ''))
        setActiveTab('chart')
      }
    }
  }, [storyboardTasks, runningTaskId, setScript, addStoryboardImage, setCharacterDesign])

  // 一键生成所有内容 - 改为后台任务模式
  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) {
      toast.error('请输入文案内容')
      return
    }

    if (!textApiKey) {
      toast.error('请先配置智谱 API Key')
      return
    }

    if (!imageApiKey) {
      toast.error('请先配置速创 API Key')
      return
    }

    try {
      // 启动后台任务
      await startTask(
        userId,
        textApiKey,
        imageApiKey,
        inputText.trim(),
        selectedStyle,
        referenceAssetIds,
        characterRefs
      )
      toast.success('任务已加入队列，可关闭窗口继续其他工作')

      // 同时在当前窗口显示进度（同步模式）
      reset()
      setGenerating(true, 'script')

      // 等待任务完成或窗口关闭
    } catch (error) {
      console.error('[Storyboard] Start task error:', error)
      toast.error('启动任务失败')
    }
  }, [inputText, textApiKey, imageApiKey, selectedStyle, userId, startTask, reset, setGenerating])

  // 取消当前任务
  const handleCancelTask = useCallback(async () => {
    if (runningTaskId) {
      await cancelTask(runningTaskId)
      setGenerating(false)
      toast.info('任务已取消')
    }
  }, [runningTaskId, cancelTask, setGenerating])

  // 复制脚本
  const handleCopyScript = useCallback(async () => {
    if (!script) return

    const text = script.scenes
      .map((s, i) => {
        const dialogues = s.dialogues.map((d) => `${d.characterName}：${d.text}`).join('\n')
        return `【镜头${i + 1}】${s.shotType} | ${s.duration}\n画面：${s.description}\n镜头：${s.camera}\n${dialogues ? `对白：\n${dialogues}` : ''}${s.narrator ? `\n旁白：${s.narrator}` : ''}`
      })
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }, [script])

  // 下载图片
  const handleDownloadImage = useCallback((url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  // 生成视频
  const [isVideoGenerating, setIsVideoGenerating] = useState(false)
  const handleGenerateVideo = useCallback((_sceneId: number, imageUrl: string) => {
    if (!imageUrl) {
      toast.error('请先生成图片')
      return
    }
    setIsVideoGenerating(true)
    toast.success('视频生成已启动，可在 Workflow 页面查看进度')
    // 实际视频生成逻辑将通过 Workflow 执行
    setTimeout(() => setIsVideoGenerating(false), 3000)
  }, [])

  // 对话框关闭时 - 允许关闭但后台任务继续运行
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // 如果有运行中的任务，提示用户
      if (runningTaskId) {
        toast.info('任务将在后台继续运行，可在任务队列中查看')
      }
      // 清理UI状态但不影响后台任务
      reset()
      setActiveTab('script')
      dismissCompletionToast()
    }
    onOpenChange(open)
  }, [runningTaskId, reset, onOpenChange, dismissCompletionToast])

  // 文件上传处理
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件格式
    if (!file.name.endsWith('.md') && !file.name.endsWith('.json')) {
      toast.error('仅支持 .md 或 .json 格式文件')
      return
    }

    try {
      const result = await parseUploadedFile(file)

      if (!result) {
        toast.error('无法解析文件内容')
        return
      }

      if (result.type === 'storyboard') {
        // 直接导入分镜头脚本
        setScript(result.data)
        toast.success('分镜头脚本已导入')
      } else if (result.type === 'script') {
        // 导入剧本文本
        const scriptText = result.data.scenes
          .map((s: any) => `## ${s.sceneName}\n${s.description}\n${s.dialogues.map((d: any) => `${d.character}：${d.line}`).join('\n')}`)
          .join('\n\n')
        setInputText(scriptText)
        toast.success('剧本内容已导入，可点击生成转换为分镜头')
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast.error('文件解析失败')
    }

    // 清空 input
    e.target.value = ''
  }, [setScript, setInputText])

  // 导出为 MD
  const handleExportMd = useCallback(() => {
    if (!script) {
      toast.error('没有可导出的分镜头脚本')
      return
    }

    const md = exportToMarkdownStoryboard(script)
    const today = new Date().toISOString().slice(0, 10)
    downloadFile(md, `storyboard_${today}.md`, 'text/markdown')
    toast.success('已导出 Markdown 文件')
  }, [script])

  // 导出为 JSON
  const handleExportJson = useCallback(() => {
    if (!script) {
      toast.error('没有可导出的分镜头脚本')
      return
    }

    const json = exportToJson(script)
    const today = new Date().toISOString().slice(0, 10)
    downloadFile(json, `storyboard_${today}.json`, 'application/json')
    toast.success('已导出 JSON 文件')
  }, [script])

  // 获取任务描述
  const getTaskLabel = () => {
    switch (currentTask) {
      case 'script':
        return '生成分镜头脚本'
      case 'storyboard':
        return '生成故事板图片'
      case 'character':
        return '生成角色设计图'
      default:
        return '准备中'
    }
  }

  // Tab 配置
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'script', label: '分镜头脚本', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'characters', label: '角色设定', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'dialogues', label: '对白列表', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'chart', label: '故事板图表', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'voice', label: '语音合成', icon: <Volume2 className="w-3.5 h-3.5" /> },
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] bg-card/60 border-white/10 backdrop-blur-xl overflow-hidden flex flex-col">
        <DialogTitle className="flex items-center gap-2 flex-shrink-0">
          <Clapperboard className="w-5 h-5 text-primary" />
          <span>故事板生成</span>
        </DialogTitle>

        <div className="flex-1 grid grid-cols-[320px_1fr] gap-4 overflow-hidden">
          {/* 左侧：输入区 */}
          <div className="flex flex-col gap-3 overflow-hidden">
            {/* 文案输入 */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">文案内容</label>
                <label className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-colors text-xs text-muted-foreground">
                  <Upload className="w-3 h-3" />
                  <span>上传文件</span>
                  <input
                    type="file"
                    accept=".md,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                </label>
              </div>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入文案内容，或上传 .md/.json 文件..."
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* 风格选择 */}
            <div className="flex-shrink-0">
              <label className="text-xs text-muted-foreground mb-1 block">图片风格</label>
              <div className="grid grid-cols-2 gap-2">
                {STORYBOARD_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    disabled={isGenerating}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      selectedStyle === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] opacity-70">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成/取消按钮 */}
            {isGenerating || runningTaskId ? (
              <Button
                onClick={handleCancelTask}
                variant="destructive"
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                取消任务
              </Button>
            ) : (
              <div className="flex gap-2">
                {/* 向导模式按钮 */}
                <Button
                  onClick={() => setWizardOpen(true)}
                  variant="outline"
                  className="flex-1 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  向导模式
                </Button>
                {/* 一键生成按钮 */}
                <Button
                  onClick={handleGenerate}
                  disabled={!inputText.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  一键生成全部
                </Button>
              </div>
            )}

            {/* 进度显示 - 使用生成动画组件 */}
            {(isGenerating || runningTaskId) && (
              <GenerationAnimation
                isGenerating={true}
                currentTask={getTaskLabel()}
                progress={progress}
                className="mt-2"
              />
            )}

            {/* 后台任务提示 */}
            {runningTaskId && (
              <div className="text-xs text-center text-cyan-400 bg-cyan-400/10 rounded p-2">
                任务已在后台运行，可关闭窗口
              </div>
            )}

            {/* 完成后显示查看资产库按钮 */}
            {showCompletionToast && !runningTaskId && (
              <div className="space-y-2">
                <div className="text-xs text-center text-green-400 bg-green-400/10 rounded p-2">
                  ✅ 故事板生成完成！
                </div>
                <Button
                  onClick={() => router.push('/storyboard-assets')}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-green-500/50 text-green-400 hover:bg-green-500/10"
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                  查看资产库
                </Button>
              </div>
            )}

            {/* 剧本梗概 */}
            {script?.synopsis && (
              <div className="flex-shrink-0 p-2 rounded-lg border border-white/10 bg-black/20">
                <div className="text-xs font-medium text-foreground mb-1">剧本梗概</div>
                <p className="text-xs text-muted-foreground line-clamp-3">{script.synopsis}</p>
              </div>
            )}

            {/* 从资产库选择素材按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssetSelectOpen(true)}
              className="flex-shrink-0 h-7 border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            >
              <Images className="w-3 h-3 mr-1" />
              从资产库选择素材 ({selectedAssets.length})
            </Button>

            {/* 参考图选择 */}
            <div className="flex-shrink-0">
              <AssetReferenceSelector
                selectedAssets={referenceAssetIds}
                onAssetsChange={setReferenceAssetIds}
                maxSelection={4}
              />
            </div>

            {/* 角色一致性配置 */}
            <div className="flex-shrink-0">
              <CharacterConsistencyPanel
                characterRefs={characterRefs}
                onCharacterRefsChange={setCharacterRefs}
                maxCharacters={5}
              />
            </div>

            {/* 导出按钮 */}
            {script && (
              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-7" onClick={handleExportMd}>
                  <FileType className="w-3 h-3 mr-1" />
                  导出 MD
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-7" onClick={handleExportJson}>
                  <FileJson className="w-3 h-3 mr-1" />
                  导出 JSON
                </Button>
              </div>
            )}
          </div>

          {/* 右侧：Tab 内容区 */}
          <div className="flex flex-col overflow-hidden">
            {/* Tab 导航 */}
            <div className="flex items-center gap-1 p-1 border-b border-white/10 flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!script}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-white/5'
                  } ${!script ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 内容 */}
            <div className="flex-1 overflow-hidden">
              {!script ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Clapperboard className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">请输入文案并点击生成</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab 1: 分镜头脚本 */}
                  {activeTab === 'script' && (
                    <div className="h-full flex gap-3 p-2">
                      {/* 左侧：剧本梗概 */}
                      <div className="w-[200px] flex-shrink-0 flex flex-col">
                        {/* 头部信息 */}
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 mb-2">
                          <div className="font-medium text-foreground text-sm">{script.title}</div>
                          <div className="text-xs text-muted-foreground">
                            总时长：{script.totalDuration}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {script.scenes.length} 个镜头
                          </div>
                        </div>

                        {/* 剧本梗概 */}
                        {script.synopsis && (
                          <div className="flex-1 p-2 rounded-lg border border-white/10 bg-white/5 overflow-hidden flex flex-col">
                            <div className="text-xs font-medium text-foreground mb-1 flex-shrink-0">剧本梗概</div>
                            <ScrollArea className="flex-1">
                              <p className="text-xs text-muted-foreground leading-relaxed">{script.synopsis}</p>
                            </ScrollArea>
                          </div>
                        )}

                        {/* 复制按钮 */}
                        <Button variant="ghost" size="sm" className="h-7 mt-2" onClick={handleCopyScript}>
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              复制脚本
                            </>
                          )}
                        </Button>
                      </div>

                      {/* 右侧：场景列表 */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-2">
                          {script.scenes.map((scene, i) => (
                            <div key={scene.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium">
                                  镜头{i + 1}
                                </span>
                                <span className="text-xs text-muted-foreground">{scene.shotType}</span>
                                <span className="text-xs text-muted-foreground">{scene.duration}</span>
                                <span className="text-xs text-muted-foreground">{scene.camera}</span>
                              </div>
                              <p className="text-xs text-foreground mb-1">{scene.description}</p>

                              {/* 对白 */}
                              {scene.dialogues.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {scene.dialogues.map((d, di) => (
                                    <div key={di} className="text-xs pl-2 border-l-2 border-white/20">
                                      <span className="text-primary font-medium">{d.characterName}</span>
                                      <span className="text-muted-foreground">：{d.text}</span>
                                      <span className="ml-1 text-[10px] text-muted-foreground/50">
                                        [{d.emotion} | {d.tone}]
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 旁白 */}
                              {scene.narrator && (
                                <div className="mt-1 text-xs text-cyan-400/70 italic pl-2 border-l-2 border-cyan-400/20">
                                  【旁白】{scene.narrator}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Tab 2: 角色设定 */}
                  {activeTab === 'characters' && (
                    <CharactersTab
                      characters={script.characters}
                      characterDesigns={characterDesigns}
                      onDownloadImage={handleDownloadImage}
                    />
                  )}

                  {/* Tab 3: 对白列表 */}
                  {activeTab === 'dialogues' && (
                    <DialoguesTab
                      scenes={script.scenes}
                      characters={script.characters}
                      characterDesigns={characterDesigns}
                    />
                  )}

                  {/* Tab 4: 故事板图表 */}
                  {activeTab === 'chart' && (
                    <StoryboardChartTab
                      scenes={script.scenes}
                      images={storyboardImages}
                      onDownloadImage={handleDownloadImage}
                      onGenerateVideo={handleGenerateVideo}
                      isVideoGenerating={isVideoGenerating}
                    />
                  )}

                  {/* Tab 5: 语音合成 */}
                  {activeTab === 'voice' && (
                    <VoiceSynthesisTab
                      script={script}
                      apiKey={textApiKey}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* 向导模式对话框 */}
      <StoryboardWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSubmit={async (payload) => {
          // 将向导数据同步到主对话框
          if (payload.inputText) setInputText(payload.inputText)
          if (payload.style) setStyle(payload.style as StoryboardStyle)

          // 如果有图片数据
          if (payload.storyboardImages?.length) {
            payload.storyboardImages.forEach((img: { url: string }) => addStoryboardImage(img.url))
          }

          toast.success('向导数据已同步，可以继续调整或提交')
        }}
      />

      {/* 资产库选择对话框 */}
      <AssetLibraryPanel
        open={assetSelectOpen}
        onClose={() => setAssetSelectOpen(false)}
        selectionMode={true}
        onSelectAsset={(asset) => {
          // 添加到已选素材
          if (!selectedAssets.find(a => a.id === asset.id)) {
            setSelectedAssets([...selectedAssets, asset])
            // 同时添加到故事板图片
            addStoryboardImage(asset.url)
            toast.success(`已添加素材: ${asset.name}`)
          }
          setAssetSelectOpen(false)
        }}
      />
    </Dialog>
  )
}
