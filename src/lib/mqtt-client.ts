/**
 * MQTT 客户端模块
 * 支持 MQTT over WebSocket (TLS)
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt'

export interface MqttMessage {
  topic: string
  payload: string
  timestamp: number
}

export interface MqttConfig {
  broker: string
  port: number
  username?: string
  password?: string
  clientId?: string
  topics?: string[]
  ca?: string // CA 证书路径
  cert?: string // 客户端证书路径
  key?: string // 客户端私钥路径
}

export type MessageCallback = (topic: string, payload: string) => void
export type ConnectionCallback = (connected: boolean) => void

class MqttClientManager {
  private client: MqttClient | null = null
  private messageCallbacks: MessageCallback[] = []
  private connectionCallbacks: ConnectionCallback[] = []
  private messageLog: MqttMessage[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 5000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatPeriod = 30000 // 30秒心跳检测
  private lastPingTime = 0
  private config: MqttConfig | null = null
  private isManualDisconnect = false
  private lastConnectedAt = 0
  private connectionUptime = 0

  /**
   * 启动 MQTT 服务（长连接模式）
   */
  startService(config: MqttConfig): Promise<boolean> {
    this.config = config
    this.isManualDisconnect = false
    return this.connect(config)
  }

  /**
   * 停止 MQTT 服务
   */
  stopService(): void {
    this.isManualDisconnect = true
    this.stopHeartbeat()
    this.disconnect()
  }

  /**
   * 重启服务（自动重连）
   */
  async restartService(): Promise<boolean> {
    this.stopService()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (this.config) {
      return this.startService(this.config)
    }
    return false
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.lastPingTime = Date.now()
    this.heartbeatInterval = setInterval(() => {
      if (this.client?.connected) {
        const now = Date.now()
        const elapsed = now - this.lastPingTime

        // 如果超过心跳周期的 1.5 倍还未收到服务器响应，认为连接可能已断开
        if (elapsed > this.heartbeatPeriod * 1.5) {
          console.log('[MQTT] Heartbeat timeout, checking connection...')
          // MQTT.js 会自动处理 ping，客户端心跳主要用于状态监控
          this.checkConnectionHealth()
        }
      }
    }, this.heartbeatPeriod)
    console.log('[MQTT] Heartbeat started, period:', this.heartbeatPeriod, 'ms')
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('[MQTT] Heartbeat stopped')
    }
  }

  /**
   * 检查连接健康状态
   */
  private checkConnectionHealth(): void {
    if (this.client) {
      const isConnected = this.client.connected
      console.log('[MQTT] Connection health:', isConnected ? 'OK' : 'DEAD')
      if (!isConnected && !this.isManualDisconnect) {
        console.log('[MQTT] Attempting to reconnect...')
        this.reconnectAttempts++
        console.log(`[MQTT] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      }
    }
  }

  /**
   * 获取连接运行时长
   */
  getUptime(): number {
    if (this.lastConnectedAt === 0) return 0
    if (this.client?.connected) {
      return this.connectionUptime + (Date.now() - this.lastConnectedAt)
    }
    return this.connectionUptime
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    connected: boolean
    uptime: number
    reconnectAttempts: number
    messageCount: number
    lastPingTime: number
  } {
    return {
      connected: this.client?.connected ?? false,
      uptime: this.getUptime(),
      reconnectAttempts: this.reconnectAttempts,
      messageCount: this.messageLog.length,
      lastPingTime: this.lastPingTime,
    }
  }

  /**
   * 连接 MQTT Broker
   */
  connect(config: MqttConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.client) {
        this.disconnect()
      }

      const clientId = config.clientId || `nanoai_${Date.now()}`

      // MQTT over WebSocket 配置
      const wsUrl = `wss://${config.broker}:${config.port}/mqtt`

      // EMQX Cloud 连接: 使用 App ID 作为 username, App Secret 作为 password
      // 或者使用在 EMQX Cloud 控制台创建的 MQTT 用户
      const options: IClientOptions = {
        clientId,
        keepalive: 60,
        reconnectPeriod: this.reconnectDelay,
        connectTimeout: 30000,
        clean: true,
        rejectUnauthorized: false, // 允许自签名证书
      }

      // EMQX Cloud 认证: 优先使用提供的用户名密码
      // 如果没有提供，使用 App ID/Secret (EMQX Cloud 凭证)
      if (config.username) {
        options.username = config.username
        options.password = config.password || 'emqx_c_secret_placeholder'
      }

      console.log('[MQTT] Connecting to:', wsUrl)

      this.client = mqtt.connect(wsUrl, options)

      this.client.on('connect', () => {
        console.log('[MQTT] Connected')
        this.reconnectAttempts = 0
        this.lastConnectedAt = Date.now()
        this.connectionUptime = 0
        this.lastPingTime = Date.now()
        this.notifyConnection(true)
        this.startHeartbeat() // 启动心跳

        // 订阅默认 topics
        if (config.topics && config.topics.length > 0) {
          this.subscribe(config.topics)
        }

        resolve(true)
      })

      this.client.on('message', (topic, message) => {
        const payload = message.toString()
        console.log('[MQTT] Message:', topic, payload)

        // 记录消息
        this.messageLog.unshift({
          topic,
          payload,
          timestamp: Date.now(),
        })
        if (this.messageLog.length > 100) {
          this.messageLog.pop()
        }

        // 通知回调
        this.messageCallbacks.forEach((cb) => cb(topic, payload))
      })

      this.client.on('error', (error) => {
        console.error('[MQTT] Error:', error)
        reject(error)
      })

      this.client.on('close', () => {
        console.log('[MQTT] Connection closed')
        this.notifyConnection(false)
      })

      this.client.on('reconnect', () => {
        this.reconnectAttempts++
        console.log(`[MQTT] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('[MQTT] Max reconnect attempts reached')
          this.client?.end()
        }
      })

      this.client.on('offline', () => {
        console.log('[MQTT] Offline')
        this.notifyConnection(false)
      })
    })
  }

  /**
   * 订阅主题
   */
  subscribe(topics: string | string[]): void {
    if (!this.client) {
      console.warn('[MQTT] Client not connected')
      return
    }

    const topicList = Array.isArray(topics) ? topics : [topics]
    console.log('[MQTT] Subscribing to:', topicList)

    this.client.subscribe(topicList, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err)
      } else {
        console.log('[MQTT] Subscribed to:', topicList)
      }
    })
  }

  /**
   * 发布消息
   */
  publish(topic: string, message: string): boolean {
    if (!this.client || !this.client.connected) {
      console.warn('[MQTT] Client not connected')
      return false
    }

    console.log('[MQTT] Publishing to:', topic, message)
    this.client.publish(topic, message)
    return true
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.client) {
      console.log('[MQTT] Disconnecting...')
      this.stopHeartbeat()
      // 计算连接时长
      if (this.lastConnectedAt > 0) {
        this.connectionUptime += Date.now() - this.lastConnectedAt
      }
      this.client.end()
      this.client = null
      this.notifyConnection(false)
    }
  }

  /**
   * 添加消息回调
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback)
  }

  /**
   * 移除消息回调
   */
  offMessage(callback: MessageCallback): void {
    this.messageCallbacks = this.messageCallbacks.filter((cb) => cb !== callback)
  }

  /**
   * 添加连接状态回调
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback)
  }

  /**
   * 移除连接状态回调
   */
  offConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks = this.connectionCallbacks.filter((cb) => cb !== callback)
  }

  /**
   * 获取消息日志
   */
  getMessageLog(): MqttMessage[] {
    return [...this.messageLog]
  }

  /**
   * 清空消息日志
   */
  clearMessageLog(): void {
    this.messageLog = []
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.client?.connected ?? false
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(connected))
  }
}

// 单例模式
export const mqttClient = new MqttClientManager()
export default mqttClient