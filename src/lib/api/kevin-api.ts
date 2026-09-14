/**
 * Kevin Algorithm API
 * 负载均衡管理接口
 */

const API_BASE = '/api/v2/admin/kevin'

export interface KevinStatus {
  current_mode: 'practice' | 'premium'
  strategy: string
  nodes: Record<string, any>
  circuit_breaker: Record<string, any>
  health: Record<string, any>
  node_manager: {
    local_node_id: string | null
    work_mode: string
    master_id: string | null
    leader_id: string | null
    nodes: Record<string, any>
  }
  coordinator: {
    coordinator_type: string
    is_leader: boolean
    leader: string | null
    raft_state: string
    hash_ring_nodes: number
  }
}

export interface Node {
  id: string
  name: string
  weight: number
  enabled: boolean
}

export interface Strategy {
  name: string
  description: string
}

export interface WeightConfig {
  provider_id: string
  weight: number
  enabled: boolean
}

export interface PlanConfig {
  providers: WeightConfig[]
}

export interface WeightsResponse {
  global_weights: Record<string, number>
  plans: {
    practice: PlanConfig
    premium: PlanConfig
  }
}

export interface MetricsSummary {
  total_requests: number
  successful_requests: number
  failed_requests: number
  average_latency: number
  nodes: Record<string, {
    requests: number
    successes: number
    failures: number
    avg_latency: number
  }>
}

export const kevinApi = {
  // 获取整体状态
  async getStatus(): Promise<KevinStatus> {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) throw new Error('获取状态失败')
    return res.json()
  },

  // 获取策略列表
  async getStrategies(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/strategy/list`)
    if (!res.ok) throw new Error('获取策略列表失败')
    const data = await res.json()
    return data.strategies
  },

  // 获取当前策略
  async getCurrentStrategy(): Promise<string> {
    const res = await fetch(`${API_BASE}/strategy/current`)
    if (!res.ok) throw new Error('获取当前策略失败')
    const data = await res.json()
    return data.strategy
  },

  // 设置策略
  async setStrategy(strategy: string): Promise<void> {
    const res = await fetch(`${API_BASE}/strategy/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy),
    })
    if (!res.ok) throw new Error('设置策略失败')
  },

  // 获取当前模式
  async getMode(): Promise<'practice' | 'premium'> {
    const res = await fetch(`${API_BASE}/mode`)
    if (!res.ok) throw new Error('获取模式失败')
    const data = await res.json()
    return data.mode
  },

  // 切换模式
  async switchMode(mode: 'practice' | 'premium'): Promise<void> {
    const res = await fetch(`${API_BASE}/mode/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    if (!res.ok) throw new Error('切换模式失败')
  },

  // 获取权重配置
  async getWeights(): Promise<WeightsResponse> {
    const res = await fetch(`${API_BASE}/weights`)
    if (!res.ok) throw new Error('获取权重失败')
    return res.json()
  },

  // 更新权重
  async updateWeight(providerId: string, weight: number, mode?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/weight/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, weight, mode }),
    })
    if (!res.ok) throw new Error('更新权重失败')
  },

  // 获取节点列表
  async getNodes(): Promise<Node[]> {
    const res = await fetch(`${API_BASE}/nodes`)
    if (!res.ok) throw new Error('获取节点列表失败')
    const data = await res.json()
    return data.nodes
  },

  // 注册节点
  async registerNode(node: Omit<Node, 'enabled'>): Promise<void> {
    const res = await fetch(`${API_BASE}/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...node, enabled: true }),
    })
    if (!res.ok) throw new Error('注册节点失败')
  },

  // 注销节点
  async unregisterNode(nodeId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/nodes/unregister/${nodeId}`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('注销节点失败')
  },

  // 获取节点管理器状态
  async getNodeManagerStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/node-manager/status`)
    if (!res.ok) throw new Error('获取节点管理器状态失败')
    return res.json()
  },

  // 设置工作模式
  async setWorkMode(workMode: string): Promise<void> {
    const res = await fetch(`${API_BASE}/node-manager/work-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_mode: workMode }),
    })
    if (!res.ok) throw new Error('设置工作模式失败')
  },

  // 选举主节点
  async electMaster(): Promise<string | null> {
    const res = await fetch(`${API_BASE}/node-manager/elect-master`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('选举主节点失败')
    const data = await res.json()
    return data.master_id
  },

  // 获取协调器状态
  async getCoordinatorStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/coordinator/status`)
    if (!res.ok) throw new Error('获取协调器状态失败')
    return res.json()
  },

  // 获取熔断器状态
  async getCircuitBreakerStatus(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/circuit-breaker/status`)
    if (!res.ok) throw new Error('获取熔断器状态失败')
    const data = await res.json()
    return data.states
  },

  // 控制熔断器
  async controlCircuitBreaker(nodeId: string, action: 'force_open' | 'force_close' | 'reset'): Promise<void> {
    const res = await fetch(`${API_BASE}/circuit-breaker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, action }),
    })
    if (!res.ok) throw new Error('控制熔断器失败')
  },

  // 获取健康检测状态
  async getHealthStatus(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/health/status`)
    if (!res.ok) throw new Error('获取健康检测状态失败')
    const data = await res.json()
    return data.health
  },

  // 获取负载指标
  async getMetrics(): Promise<MetricsSummary> {
    const res = await fetch(`${API_BASE}/metrics`)
    if (!res.ok) throw new Error('获取负载指标失败')
    const data = await res.json()
    return data.metrics
  },
}
