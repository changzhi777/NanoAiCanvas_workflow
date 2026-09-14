'use client'

import { useState, useMemo, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Model } from '@/lib/api/admin-api'

interface ModelSelectorProps {
  selectedModels: string[]
  onChange: (models: string[]) => void
  appId: string
}

// 模拟模型数据（当API不可用时使用）
const fallbackModels: Record<string, Model[]> = {
  storyboard: [
    { id: 5, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
    { id: 3, name: 'GLM-5', code: 'glm-5', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 100, is_active: true },
  ],
  image: [
    { id: 1, name: 'GPT-Image-2', code: 'gpt-image-2', provider_id: 1, model_type: 'image', points_per_call: 10, points_per_token: 0, is_active: true },
    { id: 2, name: 'NanoBanana-2', code: 'nano-banana-2', provider_id: 1, model_type: 'image', points_per_call: 8, points_per_token: 0, is_active: true },
    { id: 8, name: 'image-01', code: 'image-01', provider_id: 3, model_type: 'image', points_per_call: 1, points_per_token: 0, is_active: true },
  ],
  voice: [
    { id: 7, name: 'Speech 2.8', code: 'speech-2.8-hd', provider_id: 3, model_type: 'audio', points_per_call: 1, points_per_token: 0, is_active: true },
  ],
  dialogue: [
    { id: 5, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
    { id: 3, name: 'GLM-5', code: 'glm-5', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 100, is_active: true },
  ],
  text: [
    { id: 5, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
    { id: 4, name: 'GLM-5-Turbo', code: 'glm-5-turbo', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 80, is_active: true },
  ],
  realtime: [
    { id: 5, name: 'MiniMax-M2.7', code: 'MiniMax-M2.7', provider_id: 3, model_type: 'text', points_per_call: 1, points_per_token: 0, is_active: true },
  ],
  prompt_optimize: [
    { id: 10, name: 'GLM-4.7-Flash（快速）', code: 'glm-4.7-flash', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 30, is_active: true },
    { id: 3, name: 'GLM-5', code: 'glm-5', provider_id: 2, model_type: 'text', points_per_call: 0, points_per_token: 100, is_active: true },
  ],
}

export function ModelSelector({ selectedModels, onChange, appId }: ModelSelectorProps) {
  const [expanded, setExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableModels, setAvailableModels] = useState<Model[]>([])

  // 从API加载模型数据
  useEffect(() => {
    const loadModels = async () => {
      // 使用 fallback 数据
      const models = fallbackModels[appId] || []
      setAvailableModels(models)
    }
    loadModels()
  }, [appId])

  const filteredModels = useMemo(() => {
    return availableModels.filter((model) => {
      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [availableModels, searchQuery])

  const toggleModel = (modelCode: string) => {
    if (selectedModels.includes(modelCode)) {
      onChange(selectedModels.filter((m) => m !== modelCode))
    } else {
      onChange([...selectedModels, modelCode])
    }
  }

  const selectAll = () => {
    onChange(filteredModels.map((m) => m.code))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-3">
      {/* 已选择的模型标签 */}
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
          {selectedModels.map((code) => {
            const model = availableModels.find((m) => m.code === code)
            return (
              <Badge key={code} variant="default" className="gap-1">
                {model?.name || code}
                <button
                  onClick={() => toggleModel(code)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* 展开/收起按钮 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        {expanded ? '收起模型列表' : `选择模型 (${availableModels.length} 个可选)`}
      </button>

      {/* 模型选择面板 */}
      {expanded && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">选择模型</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>
                  全选
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  清空
                </Button>
              </div>
            </div>
            <Input
              placeholder="搜索模型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {filteredModels.map((model) => {
                const isSelected = selectedModels.includes(model.code)
                return (
                  <button
                    key={model.code}
                    onClick={() => toggleModel(model.code)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.code}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                )
              })}
              {filteredModels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  没有找到匹配的模型
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 负载均衡提示 */}
      {selectedModels.length > 1 && (
        <p className="text-xs text-muted-foreground">
          已启用负载均衡，{selectedModels.length} 个模型将同时接受请求
        </p>
      )}
    </div>
  )
}