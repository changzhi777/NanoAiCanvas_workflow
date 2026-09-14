/**
 * VoiceInput 语音输入组件
 * 基于浏览器原生 Web Speech API，支持中文语音识别
 * 可附加到任意输入框旁，点击麦克风按钮开始语音输入
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface VoiceInputProps {
  /** 识别结果回调，返回文字内容 */
  onResult: (text: string) => void
  /** 语言，默认 zh-CN */
  lang?: string
  /** 是否替换内容（true）还是追加（false），默认替换 */
  replace?: boolean
  /** 当前输入框的值（追加模式时需要） */
  currentValue?: string
  /** 自定义类名 */
  className?: string
  /** 按钮大小 */
  size?: 'sm' | 'md'
  /** 深色模式 */
  isDark?: boolean
}

export function VoiceInput({
  onResult,
  lang = 'zh-CN',
  replace = true,
  currentValue = '',
  className,
  size = 'sm',
  isDark = true,
}: VoiceInputProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // 检测浏览器支持
  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )

  // 清理
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported')
      setErrorMsg('浏览器不支持语音识别')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setStatus('listening')
      setErrorMsg('')
      // 10秒超时自动停止
      timeoutRef.current = setTimeout(() => {
        recognition.stop()
      }, 10000)
    }

    recognition.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || ''
      if (text) {
        const finalText = replace ? text : (currentValue ? currentValue + text : text)
        onResult(finalText)
      }
      setStatus('idle')
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        setErrorMsg('未检测到语音')
      } else if (e.error === 'not-allowed') {
        setErrorMsg('请允许麦克风权限')
      } else {
        setErrorMsg(`识别失败: ${e.error}`)
      }
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }

    recognition.onend = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (status === 'listening') setStatus('idle')
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, lang, replace, currentValue, onResult, status])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('idle')
  }, [])

  const handleClick = useCallback(() => {
    if (status === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }, [status, startListening, stopListening])

  if (!isSupported) return null

  const sizeCls = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={handleClick}
        title={status === 'listening' ? '停止录音' : '语音输入'}
        className={cn(
          'flex items-center justify-center rounded-md transition-all duration-200 border',
          sizeCls,
          status === 'listening'
            ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
            : status === 'error'
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : isDark
                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-300'
        )}
      >
        {status === 'listening' ? (
          <MicOff className={iconCls} />
        ) : status === 'processing' ? (
          <Loader2 className={cn(iconCls, 'animate-spin')} />
        ) : (
          <Mic className={iconCls} />
        )}
      </button>
      {status === 'listening' && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-400 whitespace-nowrap">
          录音中...
        </span>
      )}
      {status === 'error' && errorMsg && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-orange-400 whitespace-nowrap">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
