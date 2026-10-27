import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockFetchResponse, lastFetchUrl } from '@/test/mock-fetch'
import {
  voiceDesign, textToSpeech, ttsAsyncCreate, ttsAsyncQuery, listVoices, deleteVoice, randomSampleText,
} from '@/lib/api/dubbing-api'

describe('dubbing-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('voiceDesign posts prompt and preview_text', async () => {
    mockFetchResponse({ voice_id: 'moss_v1', trial_audio_url: '/asset-uploads/dubbing/x.mp3' })
    const r = await voiceDesign('低沉男声', '你好', 'token')
    expect(r.voice_id).toBe('moss_v1')
    expect(lastFetchUrl()).toContain('/api/v2/dubbing/voice-design')
  })

  it('textToSpeech posts params', async () => {
    mockFetchResponse({ audio_url: '/asset-uploads/dubbing/y.mp3', subtitle_url: null, audio_length_ms: 1200, usage_characters: 4 })
    const r = await textToSpeech({ text: '测试', voice_id: 'v1', emotion: 'sad', speed: 1.2 }, 'token')
    expect(r.audio_url).toContain('.mp3')
    expect(r.usage_characters).toBe(4)
  })

  it('ttsAsyncCreate returns task_id', async () => {
    mockFetchResponse({ task_id: 't-9', file_id: 42 })
    const r = await ttsAsyncCreate({ text: '长文', voice_id: 'v1' }, 'token')
    expect(r.task_id).toBe('t-9')
  })

  it('ttsAsyncQuery builds download query param', async () => {
    mockFetchResponse({ task_id: 't-9', status: 'success', file_id: 42, audio_url: '/asset-uploads/dubbing/z.mp3' })
    const r = await ttsAsyncQuery('t-9', true, 'token')
    expect(r.status).toBe('success')
    expect(lastFetchUrl()).toContain('download=true')
  })

  it('listVoices returns system and designed groups', async () => {
    mockFetchResponse({ system: [{ voice_id: 'male-qn-qingse', voice_name: '青涩', description: ['男'] }], designed: [] })
    const r = await listVoices('token')
    expect(r.system).toHaveLength(1)
    expect(r.designed).toHaveLength(0)
    expect(lastFetchUrl()).toContain('/api/v2/dubbing/voices')
  })

  it('deleteVoice encodes voice_id', async () => {
    mockFetchResponse({ deleted: true })
    const r = await deleteVoice('moss v1', 'token')
    expect(r.deleted).toBe(true)
    expect(lastFetchUrl()).toContain(encodeURIComponent('moss v1'))
  })

  it('randomSampleText returns non-empty sentence', () => {
    expect(randomSampleText().length).toBeGreaterThan(4)
  })
})
