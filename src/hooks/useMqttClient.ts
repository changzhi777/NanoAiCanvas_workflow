/**
 * MQTT 客户端 Hook
 * 管理 MQTT 连接状态和消息
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import mqttClient, { MqttConfig, MqttMessage, MessageCallback } from '@/lib/mqtt-client'

export interface UseMqttClientOptions {
  broker: string
  port: number
  username?: string
  password?: string
  topics?: string[]
  autoConnect?: boolean
  clientId?: string
}

export interface UseMqttClientReturn {
  connected: boolean
  messages: MqttMessage[]
  connect: () => Promise<boolean>
  disconnect: () => void
  subscribe: (topics: string | string[]) => void
  publish: (topic: string, message: string) => boolean
  clearMessages: () => void
  reconnect: () => Promise<boolean>
  // 长连接服务模式
  startService: () => Promise<boolean>
  stopService: () => void
  getConnectionInfo: () => {
    connected: boolean
    uptime: number
    reconnectAttempts: number
    messageCount: number
    lastPingTime: number
  }
}

export function useMqttClient(options: UseMqttClientOptions): UseMqttClientReturn {
  const {
    broker,
    port,
    username,
    password,
    topics = [],
    autoConnect = true,
    clientId,
  } = options

  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<MqttMessage[]>([])
  const configRef = useRef<MqttConfig>({
    broker,
    port,
    username,
    password,
    topics,
    clientId,
  })

  // 更新配置
  useEffect(() => {
    configRef.current = {
      broker,
      port,
      username,
      password,
      topics,
      clientId,
    }
  }, [broker, port, username, password, topics, clientId])

  // 消息处理
  const handleMessage: MessageCallback = useCallback((topic, payload) => {
    setMessages((prev) => {
      const newMsg = { topic, payload, timestamp: Date.now() }
      const updated = [newMsg, ...prev].slice(0, 100) // 保留最近100条
      return updated
    })
  }, [])

  // 连接状态处理
  const handleConnection = useCallback((isConnected: boolean) => {
    setConnected(isConnected)
  }, [])

  // 初始化
  useEffect(() => {
    mqttClient.onMessage(handleMessage)
    mqttClient.onConnectionChange(handleConnection)

    return () => {
      mqttClient.offMessage(handleMessage)
      mqttClient.offConnectionChange(handleConnection)
    }
  }, [handleMessage, handleConnection])

  // 自动连接
  useEffect(() => {
    if (autoConnect && broker) {
      connect()
    }
  }, [autoConnect, broker]) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      return await mqttClient.connect(configRef.current)
    } catch (error) {
      console.error('[useMqttClient] Connect error:', error)
      return false
    }
  }, [])

  const disconnect = useCallback(() => {
    mqttClient.disconnect()
  }, [])

  const subscribe = useCallback((newTopics: string | string[]) => {
    mqttClient.subscribe(newTopics)
  }, [])

  const publish = useCallback((topic: string, message: string): boolean => {
    return mqttClient.publish(topic, message)
  }, [])

  const clearMessages = useCallback(() => {
    mqttClient.clearMessageLog()
    setMessages([])
  }, [])

  const reconnect = useCallback(async (): Promise<boolean> => {
    disconnect()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return connect()
  }, [disconnect, connect])

  // 启动长连接服务
  const startService = useCallback(async (): Promise<boolean> => {
    try {
      return await mqttClient.startService(configRef.current)
    } catch (error) {
      console.error('[useMqttClient] Start service error:', error)
      return false
    }
  }, [])

  // 停止长连接服务
  const stopService = useCallback(() => {
    mqttClient.stopService()
  }, [])

  // 获取连接详细信息
  const getConnectionInfo = useCallback(() => {
    return mqttClient.getConnectionInfo()
  }, [])

  return {
    connected,
    messages,
    connect,
    disconnect,
    subscribe,
    publish,
    clearMessages,
    reconnect,
    startService,
    stopService,
    getConnectionInfo,
  }
}

export default useMqttClient