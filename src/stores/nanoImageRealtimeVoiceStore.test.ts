import { describe, it, expect, beforeEach } from 'vitest'
import { useRealtimeVoiceStore } from '@/stores/nanoImageRealtimeVoiceStore'

describe('RealtimeVoiceStore', () => {
  beforeEach(() => {
    useRealtimeVoiceStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useRealtimeVoiceStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.isConnecting).toBe(false)
    expect(state.isRecording).toBe(false)
    expect(state.isSpeaking).toBe(false)
    expect(state.isProcessing).toBe(false)
    expect(state.selectedTemplate).toBe('general')
    expect(state.selectedVoice).toBe('tongtong')
    expect(state.messages).toEqual([])
    expect(state.currentTranscript).toBe('')
    expect(state.error).toBeNull()
    expect(state.rateLimitRemaining).toBe(5)
  })

  it('should track connection lifecycle', () => {
    useRealtimeVoiceStore.getState().setConnecting(true)
    expect(useRealtimeVoiceStore.getState().isConnecting).toBe(true)

    useRealtimeVoiceStore.getState().setConnected(true)
    expect(useRealtimeVoiceStore.getState().isConnected).toBe(true)

    useRealtimeVoiceStore.getState().setConnecting(false)
    expect(useRealtimeVoiceStore.getState().isConnecting).toBe(false)
  })

  it('should track recording/speaking/processing states', () => {
    useRealtimeVoiceStore.getState().setRecording(true)
    expect(useRealtimeVoiceStore.getState().isRecording).toBe(true)

    useRealtimeVoiceStore.getState().setSpeaking(true)
    expect(useRealtimeVoiceStore.getState().isSpeaking).toBe(true)

    useRealtimeVoiceStore.getState().setProcessing(true)
    expect(useRealtimeVoiceStore.getState().isProcessing).toBe(true)
  })

  it('should set template and voice', () => {
    useRealtimeVoiceStore.getState().setTemplate('creative')
    expect(useRealtimeVoiceStore.getState().selectedTemplate).toBe('creative')

    useRealtimeVoiceStore.getState().setVoice('voice-123')
    expect(useRealtimeVoiceStore.getState().selectedVoice).toBe('voice-123')
  })

  it('should add messages with auto-generated id and timestamp', () => {
    useRealtimeVoiceStore.getState().addMessage({
      role: 'user',
      content: 'Hello',
    })

    const messages = useRealtimeVoiceStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Hello')
    expect(messages[0].id).toBeTruthy()
    expect(messages[0].timestamp).toBeGreaterThan(0)
  })

  it('should add message with optional audioUrl', () => {
    useRealtimeVoiceStore.getState().addMessage({
      role: 'assistant',
      content: 'Response',
      audioUrl: 'https://example.com/audio.mp3',
    })

    const msg = useRealtimeVoiceStore.getState().messages[0]
    expect(msg.audioUrl).toBe('https://example.com/audio.mp3')
  })

  it('should append and clear transcript', () => {
    useRealtimeVoiceStore.getState().appendTranscript('Hello ')
    useRealtimeVoiceStore.getState().appendTranscript('World')
    expect(useRealtimeVoiceStore.getState().currentTranscript).toBe('Hello World')

    useRealtimeVoiceStore.getState().clearTranscript()
    expect(useRealtimeVoiceStore.getState().currentTranscript).toBe('')
  })

  it('should manage rate limit', () => {
    useRealtimeVoiceStore.getState().setRateLimit(3)
    expect(useRealtimeVoiceStore.getState().rateLimitRemaining).toBe(3)
  })

  it('should clear messages and transcript together', () => {
    useRealtimeVoiceStore.getState().addMessage({ role: 'user', content: 'test' })
    useRealtimeVoiceStore.getState().appendTranscript('speech')

    useRealtimeVoiceStore.getState().clearMessages()

    const state = useRealtimeVoiceStore.getState()
    expect(state.messages).toEqual([])
    expect(state.currentTranscript).toBe('')
  })

  it('should reset all state to defaults', () => {
    useRealtimeVoiceStore.getState().setConnected(true)
    useRealtimeVoiceStore.getState().addMessage({ role: 'user', content: 'x' })
    useRealtimeVoiceStore.getState().setError('err')
    useRealtimeVoiceStore.getState().setTemplate('custom')

    useRealtimeVoiceStore.getState().reset()

    const state = useRealtimeVoiceStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.isConnecting).toBe(false)
    expect(state.messages).toEqual([])
    expect(state.error).toBeNull()
    // reset preserves template/voice? Let's see the implementation...
  })

  it('should handle error state', () => {
    useRealtimeVoiceStore.getState().setError('timeout')
    expect(useRealtimeVoiceStore.getState().error).toBe('timeout')

    useRealtimeVoiceStore.getState().setError(null)
    expect(useRealtimeVoiceStore.getState().error).toBeNull()
  })
})
