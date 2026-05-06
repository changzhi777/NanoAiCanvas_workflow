/**
 * ModelRoutingService — 模型路由服务
 * 从后端拉取 category → model 映射，优先使用动态配置
 * 降级到各渠道商本地 config 的硬编码值
 */

import { client } from './client'

interface RouteEntry {
  model_code: string
  model_type: string
  provider_code: string
  api_base_url: string | null
}

type RoutesMap = Record<string, RouteEntry>

let cachedRoutes: RoutesMap = {}
let loaded = false
let loading: Promise<RoutesMap> | null = null

export async function loadRoutes(): Promise<RoutesMap> {
  if (loaded) return cachedRoutes
  if (loading) return loading

  loading = (async () => {
    try {
      const data = await client.get<RoutesMap>('/api/v2/admin/model-routes/map')
      cachedRoutes = data || {}
      loaded = true
      return cachedRoutes
    } catch {
      // 后端不可用，使用本地配置降级
      cachedRoutes = {}
      loaded = true
      return cachedRoutes
    } finally {
      loading = null
    }
  })()

  return loading
}

export function getRoute(category: string): RouteEntry | null {
  return cachedRoutes[category] || null
}

export function getModelCode(category: string, fallback: string): string {
  return cachedRoutes[category]?.model_code || fallback
}

export function getProviderForCategory(category: string): string | null {
  return cachedRoutes[category]?.provider_code || null
}

export function invalidateRoutes(): void {
  cachedRoutes = {}
  loaded = false
}

export function getAllRoutes(): RoutesMap {
  return cachedRoutes
}
