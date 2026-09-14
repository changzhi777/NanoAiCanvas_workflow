/**
 * Admin API 客户端 - 系统设置相关API
 *
 * 调用 NanoAPI 后端管理接口
 * 基础路径: /api/v2/admin
 */

import { client } from './client'

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nanoai_token')
  }
  return null
}

// ============ 类型定义 ============

export interface Provider {
  id: number
  name: string
  code: string
  api_base_url?: string
  description: string
  website: string
  is_active: boolean
  config?: Record<string, unknown>
  created_at: string
  model_count?: number
  active_key_count?: number
}

export interface ProviderCreate {
  name: string
  code: string
  api_base_url?: string
  description?: string
  website?: string
  config?: Record<string, unknown>
}

export interface Model {
  id: number
  name: string
  code: string
  provider_id: number
  model_type: string
  points_per_call: number
  points_per_token: number
  is_active: boolean
}

export interface ModelCreate {
  name: string
  code: string
  model_type: string
  points_per_call?: number
  points_per_token?: number
  config?: Record<string, unknown>
}

export interface APIKey {
  id: number
  provider_id: number
  name: string
  status: 'active' | 'inactive' | 'expired'
  daily_limit: number
  monthly_limit: number
  used_today: number
  used_this_month: number
  total_used: number
  priority: number
  weight: number
  max_concurrent: number
  expires_at: string | null
  last_used_at: string | null
  last_test_at: string | null
  last_test_success: boolean | null
  last_heartbeat_at: string | null
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown'
  last_response_ms: number | null
  last_error: string | null
  created_at: string
  key_preview: string
  detected_models: string[]
  last_scan_at: string | null
}

export interface APIKeyCreate {
  provider_id: number
  name: string
  api_key: string
  daily_limit?: number
  monthly_limit?: number
  priority?: number
  expires_at?: string
}

// ============ 渠道商 API ============

// 完整路径: /v2/admin/providers (client 会自动拼接 API_BASE_URL)
const PROVIDERS_BASE = '/v2/admin/providers'

/**
 * 获取渠道商列表
 */
export async function getProviders(): Promise<Provider[]> {
  try {
    const response = await client.get<Provider[]>(PROVIDERS_BASE)
    return response
  } catch (error) {
    console.error('获取渠道商列表失败:', error)
    throw error
  }
}

/**
 * 获取渠道商详情
 */
export async function getProvider(providerId: number): Promise<Provider> {
  const response = await client.get<Provider>(`${PROVIDERS_BASE}/${providerId}`)
  return response
}

/**
 * 创建渠道商
 */
export async function createProvider(data: ProviderCreate): Promise<Provider> {
  const response = await client.post<Provider>(PROVIDERS_BASE, data)
  return response
}

/**
 * 更新渠道商
 */
export async function updateProvider(providerId: number, data: Partial<ProviderCreate>): Promise<Provider> {
  const response = await client.put<Provider>(`${PROVIDERS_BASE}/${providerId}`, data)
  return response
}

/**
 * 删除渠道商
 */
export async function deleteProvider(providerId: number): Promise<void> {
  await client.delete(`${PROVIDERS_BASE}/${providerId}`)
}

/**
 * 启用/禁用渠道商
 */
export async function toggleProvider(providerId: number, isActive: boolean): Promise<void> {
  await client.post(`${PROVIDERS_BASE}/${providerId}/toggle`, { is_active: isActive })
}

// ============ 模型 API ============

/**
 * 获取渠道商的所有模型
 */
export async function getProviderModels(providerId: number): Promise<Model[]> {
  const response = await client.get<Model[]>(`${PROVIDERS_BASE}/${providerId}/models`)
  return response
}

/**
 * 创建模型
 */
export async function createModel(providerId: number, data: ModelCreate): Promise<Model> {
  const response = await client.post<Model>(`${PROVIDERS_BASE}/${providerId}/models`, data)
  return response
}

/**
 * 更新模型
 */
export async function updateModel(providerId: number, modelId: number, data: Partial<Model>): Promise<Model> {
  const response = await client.put<Model>(`${PROVIDERS_BASE}/${providerId}/models/${modelId}`, data)
  return response
}

/**
 * 启用/禁用模型
 */
export async function toggleModel(providerId: number, modelId: number, isActive: boolean): Promise<void> {
  await client.post(`${PROVIDERS_BASE}/${providerId}/models/${modelId}/toggle`, { is_active: isActive })
}

/**
 * 删除模型
 */
export async function deleteModel(providerId: number, modelId: number): Promise<void> {
  await client.delete(`${PROVIDERS_BASE}/${providerId}/models/${modelId}`)
}

// ============ API密钥 API ============

// 完整路径: /v2/admin/api-keys
const API_KEYS_BASE = '/v2/admin/api-keys'

/**
 * 获取API密钥列表
 */
export async function getAPIKeys(providerId?: number, status?: string): Promise<APIKey[]> {
  const params = new URLSearchParams()
  if (providerId) params.set('provider_id', String(providerId))
  if (status) params.set('status', status)
  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await client.get<APIKey[]>(`${API_KEYS_BASE}${query}`)
  return response
}

/**
 * 获取密钥详情
 */
export async function getAPIKey(keyId: number): Promise<APIKey> {
  const response = await client.get<APIKey>(`${API_KEYS_BASE}/${keyId}`)
  return response
}

/**
 * 创建API密钥
 */
export async function createAPIKey(data: APIKeyCreate): Promise<APIKey> {
  const response = await client.post<APIKey>(API_KEYS_BASE, data)
  return response
}

/**
 * 更新API密钥
 */
export async function updateAPIKey(keyId: number, data: Partial<APIKey>): Promise<APIKey> {
  const response = await client.put<APIKey>(`${API_KEYS_BASE}/${keyId}`, data)
  return response
}

/**
 * 删除API密钥
 */
export async function deleteAPIKey(keyId: number): Promise<void> {
  await client.delete(`${API_KEYS_BASE}/${keyId}`)
}

/**
 * 测试API密钥
 */
export async function testAPIKey(keyId: number): Promise<{
  is_success: boolean
  response_time_ms: number
  error_message?: string
  health_status: string
  tested_at: string
}> {
  const response = await client.post<{
    is_success: boolean
    response_time_ms: number
    error_message?: string
    health_status: string
    tested_at: string
  }>(`${API_KEYS_BASE}/${keyId}/test`, {})
  return response
}

/**
 * 心跳保活
 */
export async function heartbeatAPIKey(keyId: number): Promise<{ ok: boolean; last_heartbeat_at: string }> {
  const response = await client.post<{ ok: boolean; last_heartbeat_at: string }>(`${API_KEYS_BASE}/${keyId}/heartbeat`, {})
  return response
}

/**
 * 扫描指定 Key 可用模型
 */
export async function scanKeyModels(keyId: number): Promise<{
  key_id: number
  detected_models: string[]
  scanned_at: string
}> {
  return client.post(`${API_KEYS_BASE}/${keyId}/scan-models`, {})
}

/**
 * 批量扫描所有 active Key 可用模型
 */
export async function scanAllKeyModels(): Promise<{
  total_scanned: number
  results: Array<{
    key_id: number
    name: string
    provider_id: number
    detected_models: string[]
  }>
}> {
  return client.post(`${API_KEYS_BASE}/scan-all-models`, {})
}

/**
 * 健康概览
 */
export async function getHealthSummary(): Promise<{
  total: number
  active: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}> {
  const response = await client.get<{
    total: number
    active: number
    healthy: number
    degraded: number
    down: number
    unknown: number
  }>(`${API_KEYS_BASE}/health-summary`)
  return response
}

/**
 * 更新API密钥负载均衡配置
 */
export async function updateLoadBalance(keyId: number, weight: number, maxConcurrent: number): Promise<void> {
  await client.post(`${API_KEYS_BASE}/${keyId}/load-balance?weight=${weight}&max_concurrent=${maxConcurrent}`, {})
}

/**
 * 获取密钥使用统计
 */
export async function getKeyStatistics(providerId?: number, days: number = 7): Promise<unknown> {
  const params = new URLSearchParams()
  if (providerId) params.set('provider_id', String(providerId))
  params.set('days', String(days))
  const response = await client.get(`${API_KEYS_BASE}/statistics/summary?${params}`)
  return response
}

// ============ 积分管理 API ============

export interface UserPointsInfo {
  user_id: string
  username: string
  email: string
  balance: number
  total_granted: number
  total_used: number
  created_at: string
}

export interface UserListResponse {
  users: UserPointsInfo[]
  total: number
}

export interface RechargeRequest {
  user_id: string
  amount: number
  description?: string
}

export interface RechargeResponse {
  success: boolean
  transaction_id: number
  new_balance: number
  amount: number
}

export interface BillingRule {
  id: number
  name: string
  model_type: string
  points_per_unit: number
  unit: string
  is_active: boolean
  created_at: string
}

export interface TransactionRecord {
  id: number
  user_id: string
  username: string
  transaction_type: string
  amount: number
  balance_before: number
  balance_after: number
  status: string
  description?: string
  created_at: string
}

export interface RechargeRecord {
  id: number
  user_id: string
  username: string
  amount: number
  payment_method?: string
  payment_status: string
  order_id?: string
  created_at: string
  paid_at?: string
}

/**
 * 获取所有用户及其积分信息
 */
export async function getUsersWithPoints(page = 1, pageSize = 20, search?: string): Promise<UserListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (search) params.set('search', search)
  const response = await client.get<UserListResponse>(`/v2/admin/points/users?${params}`, getToken() || undefined)
  return response
}

/**
 * 为用户充值积分
 */
export async function rechargeUserPoints(request: RechargeRequest): Promise<RechargeResponse> {
  const response = await client.post<RechargeResponse>('/v2/admin/points/recharge', request, getToken() || undefined)
  return response
}

/**
 * 获取交易记录
 */
export async function getTransactionRecords(
  page = 1,
  pageSize = 50,
  userId?: string,
  transactionType?: string
): Promise<TransactionRecord[]> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (userId) params.set('user_id', userId)
  if (transactionType) params.set('transaction_type', transactionType)
  const response = await client.get<TransactionRecord[]>(`/v2/admin/points/transactions?${params}`, getToken() || undefined)
  return response
}

/**
 * 获取扣费规则列表
 */
export async function getBillingRules(): Promise<BillingRule[]> {
  const response = await client.get<BillingRule[]>('/v2/admin/points/rules', getToken() || undefined)
  return response
}

/**
 * 创建扣费规则
 */
export async function createBillingRule(data: {
  name: string
  model_type: string
  points_per_unit: number
  unit: string
}): Promise<BillingRule> {
  const response = await client.post<BillingRule>('/v2/admin/points/rules', data, getToken() || undefined)
  return response
}

/**
 * 更新扣费规则
 */
export async function updateBillingRule(ruleId: number, data: Partial<BillingRule>): Promise<BillingRule> {
  const response = await client.put<BillingRule>(`/v2/admin/points/rules/${ruleId}`, data, getToken() || undefined)
  return response
}

/**
 * 删除扣费规则
 */
export async function deleteBillingRule(ruleId: number): Promise<void> {
  await client.delete(`/v2/admin/points/rules/${ruleId}`, getToken() || undefined)
}

/**
 * 获取充值记录
 */
export async function getRechargeRecords(
  page = 1,
  pageSize = 20,
  userId?: string,
  status?: string
): Promise<RechargeRecord[]> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (userId) params.set('user_id', userId)
  if (status) params.set('status', status)
  const response = await client.get<RechargeRecord[]>(`/v2/admin/points/recharge-records?${params}`, getToken() || undefined)
  return response
}

/**
 * 创建充值订单
 */
export async function createRechargeOrder(
  userId: string,
  amount: number,
  paymentMethod: 'wechat' | 'alipay'
): Promise<{ order_id: string; qr_code_url: string; amount: number; payment_method: string }> {
  const response = await client.post<{ order_id: string; qr_code_url: string; amount: number; payment_method: string }>('/v2/admin/points/recharge/create', {
    user_id: userId,
    amount,
    payment_method: paymentMethod
  }, getToken() || undefined)
  return response
}

/**
 * 获取积分系统统计数据
 */
export interface PointsStats {
  total_granted: number
  total_used: number
  active_users: number
  today_used: number
  model_distribution: { name: string; total: number }[]
  daily_trend: { date: string; total: number }[]
}

export async function getPointsStats(): Promise<PointsStats> {
  return client.get<PointsStats>('/v2/admin/points/stats', getToken() || undefined)
}

// ============ 导出所有 API ============

export const adminApi = {
  // 渠道商
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  toggleProvider,
  // 模型
  getProviderModels,
  createModel,
  updateModel,
  toggleModel,
  deleteModel,
  // API密钥
  getAPIKeys,
  getAPIKey,
  createAPIKey,
  updateAPIKey,
  deleteAPIKey,
  testAPIKey,
  heartbeatAPIKey,
  getHealthSummary,
  updateLoadBalance,
  getKeyStatistics,
  // 积分管理
  getUsersWithPoints,
  rechargeUserPoints,
  getTransactionRecords,
  getBillingRules,
  createBillingRule,
  updateBillingRule,
  deleteBillingRule,
  getRechargeRecords,
  createRechargeOrder,
  getPointsStats,
  // Key Mapper
  getFrontendAPIKeys,
  createFrontendAPIKey,
  updateFrontendAPIKey,
  deleteFrontendAPIKey,
  getBackendKeyMappings,
  addBackendKeyMapping,
  updateBackendKeyMapping,
  deleteBackendKeyMapping,
  refreshKeyMapperCache,
}

// ============ 前端 API Key 管理 (Key Mapper) ============

export interface FrontendAPIKey {
  id: number
  frontend_key: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  backend_key_count: number
}

export interface FrontendAPIKeyCreate {
  frontend_key: string
  description?: string
}

export interface BackendKeyMapping {
  id: number
  frontend_key_id: number
  backend_key: string
  provider_type: string
  model_type: string
  mcp_config: Record<string, unknown> | null
  skills: Record<string, unknown> | null
  priority: number
  is_active: boolean
  created_at: string
}

export interface BackendKeyMappingCreate {
  backend_key: string
  provider_type: string
  model_type: string
  mcp_config?: Record<string, unknown>
  skills?: Record<string, unknown>
  priority?: number
}

const KEY_MAPPER_BASE = '/v2/admin/key-mapper'

/**
 * 获取所有前端 API Key 配置
 */
export async function getFrontendAPIKeys(): Promise<FrontendAPIKey[]> {
  const response = await client.get<FrontendAPIKey[]>(KEY_MAPPER_BASE)
  return response
}

/**
 * 创建前端 API Key 配置
 */
export async function createFrontendAPIKey(data: FrontendAPIKeyCreate): Promise<FrontendAPIKey> {
  const response = await client.post<FrontendAPIKey>(KEY_MAPPER_BASE, data)
  return response
}

/**
 * 更新前端 API Key 配置
 */
export async function updateFrontendAPIKey(id: number, data: Partial<FrontendAPIKeyCreate>): Promise<FrontendAPIKey> {
  const response = await client.put<FrontendAPIKey>(`${KEY_MAPPER_BASE}/${id}`, data)
  return response
}

/**
 * 删除前端 API Key 配置
 */
export async function deleteFrontendAPIKey(id: number): Promise<void> {
  await client.delete(`${KEY_MAPPER_BASE}/${id}`)
}

/**
 * 获取前端 API Key 的所有 Backend Key 映射
 */
export async function getBackendKeyMappings(frontendKeyId: number): Promise<BackendKeyMapping[]> {
  const response = await client.get<BackendKeyMapping[]>(`${KEY_MAPPER_BASE}/${frontendKeyId}/mappings`)
  return response
}

/**
 * 添加 Backend Key 映射
 */
export async function addBackendKeyMapping(frontendKeyId: number, data: BackendKeyMappingCreate): Promise<BackendKeyMapping> {
  const response = await client.post<BackendKeyMapping>(`${KEY_MAPPER_BASE}/${frontendKeyId}/mappings`, data)
  return response
}

/**
 * 更新 Backend Key 映射
 */
export async function updateBackendKeyMapping(mappingId: number, data: Partial<BackendKeyMappingCreate>): Promise<BackendKeyMapping> {
  const response = await client.put<BackendKeyMapping>(`${KEY_MAPPER_BASE}/mappings/${mappingId}`, data)
  return response
}

/**
 * 删除 Backend Key 映射
 */
export async function deleteBackendKeyMapping(mappingId: number): Promise<void> {
  await client.delete(`${KEY_MAPPER_BASE}/mappings/${mappingId}`)
}

/**
 * 手动刷新配置缓存
 */
export async function refreshKeyMapperCache(): Promise<void> {
  await client.post(`${KEY_MAPPER_BASE}/refresh-cache`, {})
}

// ============ User Approval API ============

export interface PendingUser {
  id: string
  username: string
  email: string
  created_at: string
  status: string
}

export async function listPendingUsers(): Promise<PendingUser[]> {
  const response = await client.get<PendingUser[]>('/api/admin/users/pending')
  return response
}

export async function listAllUsers(statusFilter?: string): Promise<PendingUser[]> {
  const url = statusFilter ? `/api/admin/users/all?status_filter=${statusFilter}` : '/api/admin/users/all'
  const response = await client.get<PendingUser[]>(url)
  return response
}

export async function approveUser(userId: string): Promise<PendingUser> {
  const response = await client.post<PendingUser>(`/api/admin/users/${userId}/approve`, {})
  return response
}

export async function rejectUser(userId: string): Promise<PendingUser> {
  const response = await client.post<PendingUser>(`/api/admin/users/${userId}/reject`, {})
  return response
}

export default adminApi