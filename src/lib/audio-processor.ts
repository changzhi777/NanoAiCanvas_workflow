/**
 * 音频处理工具
 * 用于 GLM-Realtime 语音对话功能
 */

// 音频配置
export const AUDIO_CONFIG = {
  inputSampleRate: 16000,    // 输入采样率
  outputSampleRate: 24000,   // 输出采样率
  channels: 1,               // 单声道
  bitDepth: 16,              // 16位深
}

/**
 * 将 Float32Array 转换为 16 位 PCM
 */
export function float32ToPCM16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return int16
}

/**
 * 将 16 位 PCM 转换为 Float32Array
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF)
  }
  return float32
}

/**
 * 编码 WAV 格式音频
 */
export async function encodeWAV(samples: Float32Array, sampleRate: number): Promise<Blob> {
  const pcm16 = float32ToPCM16(samples)
  const buffer = new ArrayBuffer(44 + pcm16.length * 2)
  const view = new DataView(buffer)

  // WAV Header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + pcm16.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size
  view.setUint16(20, 1, true) // AudioFormat (PCM)
  view.setUint16(22, 1, true) // NumChannels
  view.setUint32(24, sampleRate, true) // SampleRate
  view.setUint32(28, sampleRate * 2, true) // ByteRate
  view.setUint16(32, 2, true) // BlockAlign
  view.setUint16(34, 16, true) // BitsPerSample
  writeString(36, 'data')
  view.setUint32(40, pcm16.length * 2, true)

  // Write PCM data
  const dataOffset = 44
  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(dataOffset + i * 2, pcm16[i], true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Base64 编码
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Base64 解码
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 音频播放器
 * 用于播放 GLM-Realtime 返回的 PCM 音频流
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private audioQueue: Int16Array[] = []
  private isPlaying = false
  private sourceNode: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.outputSampleRate })
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
    }

    // 恢复 AudioContext（用户交互后）
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * 播放 PCM 音频（Base64 编码）
   */
  play(base64Pcm: string): void {
    if (!this.audioContext || !this.gainNode) {
      console.warn('[AudioPlayer] Not initialized')
      return
    }

    try {
      // 解码 Base64 PCM 数据
      const pcmBuffer = base64ToArrayBuffer(base64Pcm)
      const pcm16 = new Int16Array(pcmBuffer)
      const float32 = pcm16ToFloat32(pcm16)

      // 创建 AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        AUDIO_CONFIG.channels,
        float32.length,
        AUDIO_CONFIG.outputSampleRate
      )
      // 复制到 channel，使用 slice 确保类型兼容
      audioBuffer.copyToChannel(float32.slice() as Float32Array<ArrayBuffer>, 0)

      // 播放
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.gainNode)
      source.start()

      this.sourceNode = source
    } catch (error) {
      console.error('[AudioPlayer] Play error:', error)
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop()
      } catch {
        // Ignore
      }
      this.sourceNode = null
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.gainNode = null
    this.audioQueue = []
  }
}

/**
 * 麦克风录音器
 * 用于采集用户语音并发送给 GLM-Realtime
 */
export class AudioRecorder {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private isRecording = false
  private onChunkCallback: ((base64Wav: string) => void) | null = null

  /**
   * 初始化录音器
   */
  async init(): Promise<void> {
    // 请求麦克风权限
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: AUDIO_CONFIG.inputSampleRate,
        channelCount: AUDIO_CONFIG.channels,
        echoCancellation: true,
        noiseSuppression: true,
      }
    })

    // 创建 AudioContext
    this.audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.inputSampleRate })

    // 加载 AudioWorklet（用于实时音频处理）
    try {
      await this.audioContext.audioWorklet.addModule('/nano2/audio-worklet.js')
    } catch {
      console.warn('[AudioRecorder] AudioWorklet not available, using ScriptProcessor fallback')
    }
  }

  /**
   * 开始录音
   */
  async start(onChunk: (base64Wav: string) => void): Promise<void> {
    if (this.isRecording) return
    if (!this.mediaStream || !this.audioContext) {
      await this.init()
    }

    this.onChunkCallback = onChunk
    this.isRecording = true

    const source = this.audioContext!.createMediaStreamSource(this.mediaStream!)

    // 使用 AudioWorklet 或 ScriptProcessor
    if (this.audioContext!.audioWorklet) {
      try {
        this.workletNode = new AudioWorkletNode(this.audioContext!, 'audio-processor')
        this.workletNode.port.onmessage = (event) => {
          if (this.isRecording && this.onChunkCallback) {
            const float32 = event.data as Float32Array
            encodeWAV(float32, AUDIO_CONFIG.inputSampleRate).then(blob => {
              blob.arrayBuffer().then(buffer => {
                this.onChunkCallback!(arrayBufferToBase64(buffer))
              })
            })
          }
        }
        source.connect(this.workletNode)
      } catch {
        // Fallback to ScriptProcessor
        this.useScriptProcessor(source)
      }
    } else {
      this.useScriptProcessor(source)
    }
  }

  private useScriptProcessor(source: MediaStreamAudioSourceNode): void {
    const bufferSize = 4096
    const processor = this.audioContext!.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (event) => {
      if (!this.isRecording || !this.onChunkCallback) return

      const inputData = event.inputBuffer.getChannelData(0)
      const float32 = new Float32Array(inputData)

      encodeWAV(float32, AUDIO_CONFIG.inputSampleRate).then(blob => {
        blob.arrayBuffer().then(buffer => {
          this.onChunkCallback!(arrayBufferToBase64(buffer))
        })
      })
    }

    source.connect(processor)
    processor.connect(this.audioContext!.destination)
  }

  /**
   * 停止录音
   */
  stop(): void {
    this.isRecording = false
    this.onChunkCallback = null
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop()
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.workletNode = null
  }
}

/**
 * 音色配置
 */
export const VOICE_OPTIONS = [
  { id: 'tongtong', label: '童童', description: '通用女声（默认）' },
  { id: 'xiaochen', label: '小晨', description: '通用男声' },
  { id: 'female-tianmei', label: '甜美', description: '甜美女性' },
  { id: 'female-shaonv', label: '少女', description: '少女声线' },
  { id: 'male-qn-daxuesheng', label: '大学生', description: '青年大学生' },
  { id: 'male-qn-jingying', label: '精英', description: '精英青年' },
  { id: 'lovely_girl', label: '童声', description: '萌萌女童' },
]
