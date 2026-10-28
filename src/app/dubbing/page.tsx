'use client'

/**
 * 配音大师 —— MiniMax 音色设计 + 文字转语音 独立子应用
 * 双 Tab 独立页：音色设计的产物（voice_id）直接进入 TTS 页音色库（API 天然互通）
 * 后端代理 /api/v2/dubbing/*（key 存后端）；契约见 docs/minimax-voice-deep-dive.md
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, AudioLines, Download, Loader2, Mic, Play, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/remoteStore'
import {
  voiceDesign, textToSpeech, ttsAsyncCreate, pollTtsAsync, listVoices, deleteVoice,
  breezeTts, listBreezeVoices,
  randomSampleText, TTS_MODELS, EMOTIONS, INTERJECTIONS, VOICE_PROMPT_PRESETS,
  type DesignedVoice, type SystemVoice, type TtsResult, type BreezeVoice,
} from '@/lib/api/dubbing-api'

const SYNC_TEXT_MAX = 10000
const ASYNC_TEXT_MAX = 50000

/** 消耗预估：hd 3.5 元/万字符，turbo 2.0 元/万字符（官方定价） */
function estimateCost(chars: number, model: string): string {
  const perChar = model.includes('turbo') ? 2.0 : 3.5
  return `¥${((chars / 10000) * perChar).toFixed(2)}`
}

export default function DubbingPage() {
  const { toast } = useToast()
  const token = useAuthStore((s) => s.token)
  const [tab, setTab] = useState<'design' | 'tts'>('design')

  // —— 音色库（两 Tab 共享，设计完成即入列）——
  const [systemVoices, setSystemVoices] = useState<SystemVoice[]>([])
  const [designedVoices, setDesignedVoices] = useState<DesignedVoice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')

  // toast 来自 useToast() 每渲染新建，不可入依赖（会致无限拉取）；错误静默，列表空态自明
  const refreshVoices = useCallback(async (t = token) => {
    setVoicesLoading(true)
    try {
      const r = await listVoices(t || undefined)
      setSystemVoices(r.system)
      setDesignedVoices(r.designed)
    } catch {
      /* 音色库失败不阻断页面 */
    } finally {
      setVoicesLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => { refreshVoices() }, [refreshVoices])

  // ==================== Tab1 音色设计 ====================
  const [designPrompt, setDesignPrompt] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [designing, setDesigning] = useState(false)
  const [lastDesign, setLastDesign] = useState<{ voice_id: string; trial_audio_url: string | null } | null>(null)

  const handleDesign = async () => {
    if (!designPrompt.trim() || !previewText.trim()) {
      toast.error('请填写音色描述与试听文本')
      return
    }
    setDesigning(true)
    try {
      const r = await voiceDesign(designPrompt.trim(), previewText.trim(), token || undefined)
      setLastDesign(r)
      if (r.voice_id) setSelectedVoiceId(r.voice_id)
      await refreshVoices()
      toast.success(`音色已设计：${r.voice_id}（首次用于合成时产生音色费，7 天内使用有效）`)
    } catch (e: any) {
      toast.error(e?.message || '音色设计失败')
    } finally {
      setDesigning(false)
    }
  }

  const handleDeleteVoice = async (voiceId: string) => {
    try {
      await deleteVoice(voiceId, token || undefined)
      if (selectedVoiceId === voiceId) setSelectedVoiceId('')
      await refreshVoices()
      toast.success('音色已删除')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  const voiceLabel = (v: SystemVoice | DesignedVoice): string => {
    const desc = Array.isArray(v.description) ? v.description.join(' ') : String(v.description ?? '')
    return 'voice_name' in v && v.voice_name ? `${v.voice_name} · ${desc}` : desc || v.voice_id
  }

  // ==================== Tab2 文字转语音 ====================
  const [engine, setEngine] = useState<'minimax' | 'breeze'>('minimax')
  const [breezeVoices, setBreezeVoices] = useState<BreezeVoice[]>([])
  const [breezeLoaded, setBreezeLoaded] = useState(false)
  const [breezeInstruction, setBreezeInstruction] = useState('Speak clearly and naturally.')
  const isBreeze = engine === 'breeze'

  const loadBreezeVoices = useCallback(async (silent = false) => {
    try {
      setBreezeVoices(await listBreezeVoices(token || undefined))
      setBreezeLoaded(true)
    } catch {
      if (!silent) toast.error('Breeze 引擎不可达（未部署或未配置 BREEZE_BASE_URL）')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const switchEngine = (e: 'minimax' | 'breeze') => {
    setEngine(e)
    setSelectedVoiceId('')
    if (e === 'breeze' && !breezeLoaded) loadBreezeVoices()
  }

  const [ttsText, setTtsText] = useState('')
  const [ttsModel, setTtsModel] = useState<string>('speech-2.8-hd')
  const [emotion, setEmotion] = useState<string>('none')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [vol, setVol] = useState(1.0)
  const [longMode, setLongMode] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<TtsResult | null>(null)
  const [sessionHistory, setSessionHistory] = useState<TtsResult[]>([])
  const textRef = useRef<HTMLTextAreaElement>(null)

  const textLimit = longMode ? ASYNC_TEXT_MAX : SYNC_TEXT_MAX
  const overLimit = ttsText.length > textLimit

  /** 在光标处插入标记（停顿 <#x#> / 语气词 (xxx)） */
  const insertAtCursor = (snippet: string) => {
    const el = textRef.current
    if (!el) { setTtsText(t => t + snippet); return }
    const start = el.selectionStart ?? ttsText.length
    const end = el.selectionEnd ?? start
    const next = ttsText.slice(0, start) + snippet + ttsText.slice(end)
    if (next.length > textLimit) { toast.error(`超出 ${textLimit} 字上限`); return }
    setTtsText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  const handleGenerate = async () => {
    if (!ttsText.trim()) { toast.error('请输入要合成的文本'); return }
    if (!selectedVoiceId) { toast.error('请先选择音色（可在「音色设计」页创建）'); return }
    if (overLimit) { toast.error(`文本超出 ${textLimit} 字上限`); return }

    setGenerating(true)
    try {
      let r: TtsResult
      if (isBreeze) {
        r = await breezeTts({
          text: ttsText, voice_id: selectedVoiceId || undefined,
          instruction: breezeInstruction, cfg_scale: 2.0,
        }, token || undefined)
      } else if (longMode) {
        const params = {
          text: ttsText, voice_id: selectedVoiceId, model: ttsModel,
          emotion: emotion === 'none' ? null : emotion, speed, pitch, vol,
        }
        const { task_id } = await ttsAsyncCreate(params, token || undefined)
        toast.info('长文任务已提交，合成中…')
        const done = await pollTtsAsync(task_id, token || undefined)
        if (done.status !== 'success' || !done.audio_url) {
          throw new Error(done.detail || '长文合成失败')
        }
        r = { audio_url: done.audio_url, subtitle_url: null, audio_length_ms: null, usage_characters: null }
      } else {
        const params = {
          text: ttsText, voice_id: selectedVoiceId, model: ttsModel,
          emotion: emotion === 'none' ? null : emotion, speed, pitch, vol,
        }
        r = await textToSpeech(params, token || undefined)
      }
      setResult(r)
      setSessionHistory(h => [r, ...h].slice(0, 20))
      toast.success('合成完成')
    } catch (e: any) {
      toast.error(e?.message || '合成失败')
    } finally {
      setGenerating(false)
    }
  }

  const applyDesignedVoice = (v: DesignedVoice) => {
    setSelectedVoiceId(v.voice_id)
    toast.info(`已选用音色 ${v.voice_id}，去「文字转语音」页配音`)
  }

  const voiceSelectValue = isBreeze
    ? (breezeVoices.some(v => v.voice_id === selectedVoiceId) ? selectedVoiceId : '')
    : systemVoices.some(v => v.voice_id === selectedVoiceId)
      ? selectedVoiceId
      : designedVoices.some(v => v.voice_id === selectedVoiceId) ? selectedVoiceId : ''

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('switch-page', { detail: 'workflow' }))}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <div className="flex items-center gap-2">
          <AudioLines className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">配音大师</h1>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">MiniMax 语音 · 40 语种 · 300+ 音色</span>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <Tabs value={tab} onValueChange={v => setTab(v as 'design' | 'tts')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="design"><Wand2 className="w-4 h-4 mr-1" />音色设计</TabsTrigger>
            <TabsTrigger value="tts"><Mic className="w-4 h-4 mr-1" />文字转语音</TabsTrigger>
          </TabsList>

          {/* ==================== Tab1 音色设计 ==================== */}
          <TabsContent value="design" className="space-y-4">
            <Card className="p-4 space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">音色描述</div>
                <Textarea
                  value={designPrompt}
                  onChange={e => setDesignPrompt(e.target.value)}
                  placeholder="用文字描述你想要的音色，例如：低沉磁性的中年男声，语速从容，带一丝沙哑的故事感…"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {VOICE_PROMPT_PRESETS.map(p => {
                    const [name, desc] = p.split('：')
                    return (
                      <button
                        key={name}
                        className="text-xs px-2 py-1 rounded-full border hover:bg-accent transition-colors"
                        title={desc}
                        onClick={() => setDesignPrompt(p)}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 flex items-center justify-between">
                  <span>试听文本 <span className="text-muted-foreground font-normal">({previewText.length}/500)</span></span>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewText(randomSampleText())}>
                    <Wand2 className="w-3.5 h-3.5 mr-1" />自动生成
                  </Button>
                </div>
                <Textarea
                  value={previewText}
                  onChange={e => setPreviewText(e.target.value.slice(0, 500))}
                  placeholder="用这段文字试听新音色…"
                  rows={2}
                />
              </div>
              <Button onClick={handleDesign} disabled={designing} className="w-full">
                {designing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                {designing ? '设计中…' : '生成音色'}
              </Button>
            </Card>

            {lastDesign && (
              <Card className="p-4 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  新音色 <Badge variant="secondary">{lastDesign.voice_id}</Badge>
                </div>
                {lastDesign.trial_audio_url && (
                  <audio controls src={lastDesign.trial_audio_url} className="w-full" />
                )}
                <div className="text-xs text-muted-foreground">
                  已自动选用为当前音色——切到「文字转语音」页即可用它配音。提示：临时音色 7 天内未使用将被删除；首次用于合成时产生 ¥9.9/音色 费用。
                </div>
              </Card>
            )}

            {/* 我的设计音色 */}
            <Card className="p-4">
              <div className="text-sm font-medium mb-3 flex items-center justify-between">
                <span>我的设计音色 <Badge variant="outline">{designedVoices.length}</Badge></span>
                <Button variant="ghost" size="sm" onClick={() => refreshVoices()} disabled={voicesLoading}>
                  {voicesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '刷新'}
                </Button>
              </div>
              {designedVoices.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">还没有设计音色，用上面的描述生成一个吧</div>
              ) : (
                <div className="grid gap-2">
                  {designedVoices.map(v => (
                    <div key={v.voice_id} className="flex items-center gap-2 p-2 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{voiceLabel(v)}</div>
                        <div className="text-xs text-muted-foreground">{v.voice_id} · {v.created_time}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => applyDesignedVoice(v)} title="选用">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteVoice(v.voice_id)} title="删除">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==================== Tab2 文字转语音 ==================== */}
          <TabsContent value="tts" className="space-y-4">
            {/* 引擎切换 */}
            <Card className="p-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium mr-1">引擎</span>
              <button
                onClick={() => switchEngine('minimax')}
                className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (!isBreeze ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent')}
              >MiniMax 云端 ⭐</button>
              <button
                onClick={() => switchEngine('breeze')}
                className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (isBreeze ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent')}
              >Breeze 本地·免费</button>
              {isBreeze && (
                <span className="text-xs text-muted-foreground">非商用许可·仅内部使用 · 情绪/语速参数不生效</span>
              )}
            </Card>

            {/* 音色选择 */}
            <Card className="p-4 space-y-3">
              <div className="text-sm font-medium">音色</div>
              <Select value={voiceSelectValue} onValueChange={setSelectedVoiceId}>
                <SelectTrigger><SelectValue placeholder="选择音色（设计音色 + 系统音色）" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {isBreeze && (
                    <>
                      <div className="px-2 py-1 text-xs text-muted-foreground">Breeze 音色库</div>
                      {breezeVoices.length === 0 && (
                        <div className="px-2 py-1 text-xs text-muted-foreground">暂无（引擎未部署或未注册音色）</div>
                      )}
                      {breezeVoices.map(v => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>
                          {(v.description[0] || v.voice_id).slice(0, 40)}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {!isBreeze && designedVoices.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-muted-foreground">我的设计音色</div>
                      {designedVoices.map(v => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>
                          {voiceLabel(v).slice(0, 40)}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-2">系统音色</div>
                    </>
                  )}
                  {!isBreeze && systemVoices.map(v => (
                    <SelectItem key={v.voice_id} value={v.voice_id}>
                      {voiceLabel(v).slice(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVoiceId && (
                <div className="text-xs text-muted-foreground">当前音色 ID：{selectedVoiceId}</div>
              )}
              {isBreeze && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">音色描述 / 演绎指令（Breeze 的 Voice Design 即指令）</div>
                  <Input value={breezeInstruction} onChange={e => setBreezeInstruction(e.target.value)} placeholder="A warm, thoughtful young woman with a clear, calm delivery." />
                </div>
              )}
            </Card>

            {/* 文本与工具条 */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">文本</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={overLimit ? 'text-destructive' : ''}>{ttsText.length}/{textLimit}</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    长文模式
                    <Switch checked={longMode} onCheckedChange={setLongMode} />
                  </label>
                </div>
              </div>
              <Textarea
                ref={textRef}
                value={ttsText}
                onChange={e => setTtsText(e.target.value.slice(0, textLimit))}
                placeholder="输入要转为语音的文本…支持 <#0.5#> 停顿标记与 (laughs) 等语气词标签"
                rows={7}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger className="w-28 h-8 text-xs" disabled={isBreeze}><SelectValue placeholder="情绪" /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => insertAtCursor('<#0.5#>')} title="插入 0.5 秒停顿" disabled={isBreeze}>
                  ⏸ 停顿
                </Button>
                <Select onValueChange={v => insertAtCursor(v)}>
                  <SelectTrigger className="w-32 h-8 text-xs" disabled={isBreeze}><SelectValue placeholder="语气词 +" /></SelectTrigger>
                  <SelectContent>
                    {INTERJECTIONS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ttsModel} onValueChange={setTtsModel}>
                  <SelectTrigger className="w-44 h-8 text-xs" disabled={isBreeze} title={isBreeze ? 'Breeze 引擎不使用 MiniMax 模型档位' : undefined}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TTS_MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 参数滑杆 */}
              <div className="grid sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">语速 {speed.toFixed(1)}x</div>
                  <Slider value={speed} min={0.5} max={2} step={0.1} onValueChange={setSpeed} disabled={isBreeze} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">声调 {pitch > 0 ? `+${pitch}` : pitch}</div>
                  <Slider value={pitch} min={-12} max={12} step={1} onValueChange={setPitch} disabled={isBreeze} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">音量 {vol.toFixed(1)}</div>
                  <Slider value={vol} min={0.5} max={10} step={0.5} onValueChange={setVol} disabled={isBreeze} />
                </div>
              </div>
              {/* 消耗预估 + 生成 */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {isBreeze ? '本地引擎 · 免费无限量' : `预计消耗 ${ttsText.length} 字符 ≈ ${estimateCost(ttsText.length, ttsModel)}`}
                </span>
                <Button onClick={handleGenerate} disabled={generating || overLimit}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                  {generating ? (longMode ? '长文合成中…' : '合成中…') : '生成音频'}
                </Button>
              </div>
            </Card>

            {/* 结果 */}
            {result && (
              <Card className="p-4 space-y-2">
                <div className="text-sm font-medium">合成结果</div>
                <audio controls src={result.audio_url} className="w-full" autoPlay />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {result.audio_length_ms != null && <span>时长 {(result.audio_length_ms / 1000).toFixed(1)}s</span>}
                  {result.usage_characters != null && <span>计费 {result.usage_characters} 字符</span>}
                  <a href={result.audio_url} download className="flex items-center gap-1 text-primary hover:underline">
                    <Download className="w-3.5 h-3.5" /> 下载 MP3
                  </a>
                </div>
              </Card>
            )}

            {/* 会话历史 */}
            {sessionHistory.length > 0 && (
              <Card className="p-4">
                <div className="text-sm font-medium mb-2">本次生成历史 <Badge variant="outline">{sessionHistory.length}</Badge></div>
                <div className="grid gap-2">
                  {sessionHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-md border">
                      <audio controls src={h.audio_url} className="h-8 flex-1 min-w-0" />
                      {h.usage_characters != null && <span className="text-xs text-muted-foreground shrink-0">{h.usage_characters} 字</span>}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">全部历史已同步至资产库（音频类，category=dubbing）</div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
