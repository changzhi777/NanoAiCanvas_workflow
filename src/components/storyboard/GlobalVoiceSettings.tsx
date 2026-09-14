'use client'

import { useStoryboardVoiceStore } from '@/stores/nanoImageStoryboardVoiceStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export function GlobalVoiceSettings() {
  const {
    globalVoice,
    globalSpeed,
    globalVolume,
    globalFormat,
    setGlobalVoice,
    setGlobalSpeed,
    setGlobalVolume,
    setGlobalFormat,
    clonedVoices,
  } = useStoryboardVoiceStore()

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <span className="text-primary">●</span>
        全局音色设置
      </h3>

      <div className="space-y-3">
        {/* 音色选择 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">默认音色</label>
          <Select value={globalVoice} onValueChange={(v) => v && setGlobalVoice(v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* 预设音色 */}
              <div className="px-2 py-1 text-[10px] text-muted-foreground">预设音色</div>
              {PRESET_VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center gap-2">
                    <span>{voice.name}</span>
                    <span className="text-muted-foreground text-[10px]">{voice.description}</span>
                  </div>
                </SelectItem>
              ))}

              {/* 克隆音色 */}
              {clonedVoices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] text-muted-foreground border-t mt-1 pt-1">
                    克隆音色
                  </div>
                  {clonedVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-muted-foreground text-[10px]">自定义</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 语速 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">语速</label>
            <span className="text-xs text-foreground">{globalSpeed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[globalSpeed]}
            onValueChange={(vals) => {
              const arr = Array.isArray(vals) ? vals : [vals]
              const v = arr[0] as number | undefined
              if (v !== undefined) setGlobalSpeed(v)
            }}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.5x 慢</span>
            <span>1.0x 正常</span>
            <span>2.0x 快</span>
          </div>
        </div>

        {/* 音量 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">音量</label>
            <span className="text-xs text-foreground">{(globalVolume * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[globalVolume]}
            onValueChange={(vals) => {
              const arr = Array.isArray(vals) ? vals : [vals]
              const v = arr[0] as number | undefined
              if (v !== undefined) setGlobalVolume(v)
            }}
            min={0.0}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0% 静音</span>
            <span>100% 正常</span>
            <span>200% 最大</span>
          </div>
        </div>

        {/* 格式 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">音频格式</label>
          <div className="flex gap-2">
            {(['wav', 'mp3', 'pcm'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setGlobalFormat(fmt)}
                className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                  globalFormat === fmt
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
