/**
 * 管理后台类型定义
 *
 * Copyright ©2026 IoTchange (外星动物/常智)
 * All Rights Reserved.
 */

/**
 * 系统指标
 */
export interface SystemMetrics {
  cpu: {
    usage: number           // 使用率 0-100
    cores: number           // 核心数
    load: number[]          // 负载 [1min, 5min, 15min]
  }
  memory: {
    total: number          // 总字节
    used: number           // 已用字节
    free: number           // 空闲字节
    usage: number          // 使用率 0-100
  }
  disk: {
    total: number          // 总字节
    used: number           // 已用字节
    free: number           // 空闲字节
    usage: number          // 使用率 0-100
  }
  network: {
    in: number             // 入站字节
    out: number            // 出站字节
  }
  uptime: number           // 系统运行时间（秒）
  timestamp: string        // ISO时间戳
}

/**
 * Docker容器
 */
export interface DockerContainer {
  id: string
  name: string
  image: string
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead'
  status: string
  ports: string[]
  created: string
  cpu: number             // CPU使用率
  memory: number          // 内存使用MB
}

/**
 * 告警
 */
export interface Alert {
  id: string
  type: 'cpu' | 'memory' | 'disk' | 'container'
  level: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: string
  resolved: boolean
}

/**
 * 操作审计日志
 */
export interface AuditLog {
  id: number
  user_id: number
  username: string
  action: string          // 操作类型：restart/stop/start/config/clean
  target: string          // 操作对象
  details?: Record<string, any>
  ip_address: string
  timestamp: string
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}
