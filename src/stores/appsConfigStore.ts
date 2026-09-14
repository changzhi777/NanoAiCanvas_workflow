/**
 * 应用配置 Store
 * 管理各应用模块的模型配置
 * 支持多模型同时启用（负载均衡）
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 应用类型
export type AppType = 'storyboard' | 'image' | 'voice' | 'dialogue' | 'text' | 'realtime' | 'prompt_optimize'

// 应用配置
export interface AppConfig {
  id: AppType
  name: string
  description: string
  icon: string
  enabled: boolean
  models: string[]  // 选中的模型ID列表
}

// 应用列表定义
export const APPS_LIST: AppConfig[] = [
  {
    id: 'storyboard',
    name: '故事板生成',
    description: '视频分镜头脚本生成',
    icon: 'film',
    enabled: true,
    models: [],
  },
  {
    id: 'image',
    name: '图片生成',
    description: 'AI 图片创作生成',
    icon: 'image',
    enabled: true,
    models: [],
  },
  {
    id: 'voice',
    name: '语音合成',
    description: 'TTS 和声音克隆',
    icon: 'mic',
    enabled: true,
    models: [],
  },
  {
    id: 'dialogue',
    name: '对白生成',
    description: '角色对话脚本生成',
    icon: 'message-square',
    enabled: true,
    models: [],
  },
  {
    id: 'text',
    name: '文字增强',
    description: '文案优化和润色',
    icon: 'type',
    enabled: true,
    models: [],
  },
  {
    id: 'realtime',
    name: '实时语音',
    description: '语音对话交互',
    icon: 'phone',
    enabled: true,
    models: [],
  },
  {
    id: 'prompt_optimize',
    name: '提示词优化',
    description: 'GLM 提示词优化服务',
    icon: 'sparkles',
    enabled: true,
    models: [],
  },
]

interface AppsConfigState {
  apps: AppConfig[]
  lastSynced: string | null

  // 方法
  setAppModels: (appId: AppType, models: string[]) => void
  toggleAppEnabled: (appId: AppType) => void
  resetToDefault: () => void
  syncFromServer: (apps: AppConfig[]) => void
}

export const useAppsConfigStore = create<AppsConfigState>()(
  persist(
    (set) => ({
      apps: APPS_LIST,
      lastSynced: null,

      setAppModels: (appId, models) => {
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === appId ? { ...app, models } : app
          ),
        }))
      },

      toggleAppEnabled: (appId) => {
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === appId ? { ...app, enabled: !app.enabled } : app
          ),
        }))
      },

      resetToDefault: () => {
        set({ apps: APPS_LIST, lastSynced: null })
      },

      syncFromServer: (apps) => {
        set({ apps, lastSynced: new Date().toISOString() })
      },
    }),
    {
      name: 'apps-config-storage',
    }
  )
)

// 获取单个应用配置
export const getAppConfig = (appId: AppType): AppConfig | undefined => {
  return useAppsConfigStore.getState().apps.find((app) => app.id === appId)
}

// 获取应用启用的模型列表
export const getAppEnabledModels = (appId: AppType): string[] => {
  const app = getAppConfig(appId)
  return app?.enabled ? app.models : []
}