'use client'

import { Eye, EyeOff, Lock } from 'lucide-react'
import type { VisibilityState } from '@/stores/appVisibilityStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const VISIBILITY_OPTIONS: { value: VisibilityState; label: string; icon: React.ReactNode }[] = [
  { value: 'active', label: '可见可用', icon: <Eye className="w-3.5 h-3.5 text-green-500" /> },
  { value: 'disabled', label: '可见不可用', icon: <Lock className="w-3.5 h-3.5 text-yellow-500" /> },
  { value: 'hidden', label: '不可见', icon: <EyeOff className="w-3.5 h-3.5 text-red-500" /> },
]

export function VisibilitySelector({ value, onChange }: { value: VisibilityState; onChange: (v: VisibilityState) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisibilityState)}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VISIBILITY_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              {opt.icon}
              <span>{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface VisibilityItem {
  id: string
  name: string
  description: string
  category: string
}

export function VisibilityTable({
  title,
  description,
  items,
  visibility,
  onChange,
  fallbackState = 'disabled',
}: {
  title: string
  description: string
  items: VisibilityItem[]
  visibility: Record<string, VisibilityState>
  onChange: (id: string, state: VisibilityState) => void
  fallbackState?: VisibilityState
}) {
  const groups = items.reduce<Record<string, VisibilityItem[]>>((acc, item) => {
    const cat = item.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const counts = {
    active: items.filter(i => visibility[i.id] === 'active').length,
    disabled: items.filter(i => visibility[i.id] === 'disabled').length,
    hidden: items.filter(i => visibility[i.id] === 'hidden').length,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-green-500" /> 可用 {counts.active}</span>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-yellow-500" /> 不可用 {counts.disabled}</span>
          <span className="flex items-center gap-1"><EyeOff className="w-3 h-3 text-red-500" /> 不可见 {counts.hidden}</span>
          <span className="text-muted-foreground">共 {items.length}</span>
        </div>
      </CardHeader>
      <CardContent>
        {Object.entries(groups).map(([category, categoryItems]) => (
          <div key={category} className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2 border-b pb-1">{category}</h4>
            <div className="space-y-1">
              {categoryItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <VisibilitySelector
                    value={visibility[item.id] || fallbackState}
                    onChange={(state) => onChange(item.id, state)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function VisibilityLegend({ extraNote }: { extraNote?: string }) {
  return (
    <div className="p-4 bg-muted rounded-lg">
      <h4 className="font-medium mb-2">状态说明</h4>
      <ul className="text-sm text-muted-foreground space-y-1">
        <li><Eye className="w-3 h-3 inline text-green-500" /> <strong>可见可用</strong>：用户可看到并使用</li>
        <li><Lock className="w-3 h-3 inline text-yellow-500" /> <strong>可见不可用</strong>：用户可看到但无法使用{extraNote}</li>
        <li><EyeOff className="w-3 h-3 inline text-red-500" /> <strong>不可见</strong>：用户完全看不到</li>
      </ul>
    </div>
  )
}
