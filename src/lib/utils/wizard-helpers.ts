/**
 * 向导模式公共工具函数
 *
 * 使用方法：
 * import { downloadJson, parseJsonFile, showNotification } from '@/lib/utils/wizard-helpers'
 */

import { toast } from 'sonner'

/**
 * 下载 JSON 文件
 */
export function downloadJson(data: unknown, filename: string): boolean {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Download failed:', error)
    return false
  }
}

/**
 * 解析上传的 JSON 文件
 */
export function parseJsonFile<T>(file: File): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    if (!file.name.endsWith('.json')) {
      resolve({ success: false, error: '仅支持 .json 格式文件' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content) as T
        resolve({ success: true, data })
      } catch (e) {
        resolve({
          success: false,
          error: `解析失败：${e instanceof Error ? e.message : 'JSON 格式错误'}`
        })
      }
    }
    reader.onerror = () => {
      resolve({ success: false, error: '文件读取失败' })
    }
    reader.readAsText(file)
  })
}

/**
 * 显示通知（统一使用 toast）
 */
export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  switch (type) {
    case 'success':
      toast.success(message)
      break
    case 'error':
      toast.error(message)
      break
    default:
      toast.info(message)
  }
}

/**
 * 生成唯一 ID
 */
export function generateUniqueId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
