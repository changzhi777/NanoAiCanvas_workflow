import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBananaBrotherStore, BANANA_BROTHER_INSTRUCTIONS } from '@/stores/nanoImageBananaBrotherStore'

describe('BananaBrotherStore', () => {
  beforeEach(() => {
    useBananaBrotherStore.getState().reset()
  })

  it('should have correct initial state', () => {
    const state = useBananaBrotherStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.isConnected).toBe(false)
    expect(state.isRecording).toBe(false)
    expect(state.isSpeaking).toBe(false)
    expect(state.isProcessing).toBe(false)
    expect(state.messages).toEqual([])
    expect(state.currentTranscript).toBe('')
    expect(state.summarizedPrompt).toBe('')
    expect(state.referenceImageUrl).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should open and close dialog', () => {
    useBananaBrotherStore.getState().openDialog()
    expect(useBananaBrotherStore.getState().isOpen).toBe(true)

    useBananaBrotherStore.getState().closeDialog()
    expect(useBananaBrotherStore.getState().isOpen).toBe(false)
  })

  it('should track connection and recording states', () => {
    useBananaBrotherStore.getState().setConnected(true)
    expect(useBananaBrotherStore.getState().isConnected).toBe(true)

    useBananaBrotherStore.getState().setRecording(true)
    expect(useBananaBrotherStore.getState().isRecording).toBe(true)

    useBananaBrotherStore.getState().setSpeaking(true)
    expect(useBananaBrotherStore.getState().isSpeaking).toBe(true)

    useBananaBrotherStore.getState().setProcessing(true)
    expect(useBananaBrotherStore.getState().isProcessing).toBe(true)
  })

  it('should add messages with auto-generated id and timestamp', () => {
    useBananaBrotherStore.getState().addMessage({
      role: 'user',
      content: 'Hello',
    })

    const messages = useBananaBrotherStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Hello')
    expect(messages[0].id).toBeTruthy()
    expect(messages[0].timestamp).toBeGreaterThan(0)
  })

  it('should add multiple messages in order', () => {
    useBananaBrotherStore.getState().addMessage({ role: 'user', content: 'Hi' })
    useBananaBrotherStore.getState().addMessage({ role: 'assistant', content: 'Hey!' })

    const messages = useBananaBrotherStore.getState().messages
    expect(messages).toHaveLength(2)
    expect(messages[0].content).toBe('Hi')
    expect(messages[1].content).toBe('Hey!')
  })

  it('should append transcript text', () => {
    useBananaBrotherStore.getState().appendTranscript('Hello ')
    useBananaBrotherStore.getState().appendTranscript('World')

    expect(useBananaBrotherStore.getState().currentTranscript).toBe('Hello World')
  })

  it('should clear transcript', () => {
    useBananaBrotherStore.getState().appendTranscript('Some text')
    useBananaBrotherStore.getState().clearTranscript()

    expect(useBananaBrotherStore.getState().currentTranscript).toBe('')
  })

  it('should set summarized prompt', () => {
    useBananaBrotherStore.getState().setSummarizedPrompt('a professional photo')
    expect(useBananaBrotherStore.getState().summarizedPrompt).toBe('a professional photo')
  })

  it('should set reference image URL', () => {
    useBananaBrotherStore.getState().setReferenceImageUrl('https://example.com/img.png')
    expect(useBananaBrotherStore.getState().referenceImageUrl).toBe('https://example.com/img.png')

    useBananaBrotherStore.getState().setReferenceImageUrl(null)
    expect(useBananaBrotherStore.getState().referenceImageUrl).toBeNull()
  })

  it('should handle error state', () => {
    useBananaBrotherStore.getState().setError('Connection failed')
    expect(useBananaBrotherStore.getState().error).toBe('Connection failed')

    useBananaBrotherStore.getState().setError(null)
    expect(useBananaBrotherStore.getState().error).toBeNull()
  })

  it('should reset all state except dialog open state', () => {
    useBananaBrotherStore.getState().openDialog()
    useBananaBrotherStore.getState().setConnected(true)
    useBananaBrotherStore.getState().addMessage({ role: 'user', content: 'test' })
    useBananaBrotherStore.getState().setError('err')

    useBananaBrotherStore.getState().reset()

    const state = useBananaBrotherStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.isRecording).toBe(false)
    expect(state.isSpeaking).toBe(false)
    expect(state.isProcessing).toBe(false)
    expect(state.messages).toEqual([])
    expect(state.currentTranscript).toBe('')
    expect(state.summarizedPrompt).toBe('')
    expect(state.referenceImageUrl).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should export BANANA_BROTHER_INSTRUCTIONS constant', () => {
    expect(BANANA_BROTHER_INSTRUCTIONS).toContain('香蕉哥哥')
    expect(BANANA_BROTHER_INSTRUCTIONS).toContain('---PROMPT---')
  })
})
