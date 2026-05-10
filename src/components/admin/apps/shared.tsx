'use client'

import { useState, useMemo } from 'react'
import { Eye, EyeOff, Lock, Search, CheckSquare, Square, ArrowUpDown, Clock, User } from 'lucide-react'
import type { VisibilityState } from '@/stores/appVisibilityStore'
import type { AuditLogEntry } from '@/lib/api/app-visibility-api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const VISIBILITY_OPTIONS: { value: VisibilityState; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'active', label: '可见可用', icon: <Eye className="w-3.5 h-3.5" />, color: 'text-green-500' },
  { value: 'disabled', label: '可见不可用', icon: <Lock className="w-3.5 h-3.5" />, color: 'text-yellow-500' },
  { value: 'hidden', label: '不可见', icon: <EyeOff className="w-3.5 h-3.5" />, color: 'text-red-500' },
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
              <span className={opt.color}>{opt.icon}</span>
              <span>{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ============ 统计卡片 ============

export function StatsCards({ stats }: {
  stats: Record<string, { total: number; active: number; disabled: number; hidden: number }>
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: '总数', value: Object.values(stats).reduce((s, v) => s + v.total, 0), color: 'text-foreground' },
        { label: '可见可用', value: Object.values(stats).reduce((s, v) => s + v.active, 0), color: 'text-green-500', icon: <Eye className="w-4 h-4" /> },
        { label: '可见不可用', value: Object.values(stats).reduce((s, v) => s + v.disabled, 0), color: 'text-yellow-500', icon: <Lock className="w-4 h-4" /> },
        { label: '不可见', value: Object.values(stats).reduce((s, v) => s + v.hidden, 0), color: 'text-red-500', icon: <EyeOff className="w-4 h-4" /> },
      ].map(item => (
        <div key={item.label} className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {item.icon}
            {item.label}
          </div>
          <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// ============ 筛选+搜索栏 ============

export function FilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  categories,
}: {
  searchQuery: string
  onSearchChange: (v: string) => void
  categoryFilter: string
  onCategoryChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  categories: string[]
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索名称或描述..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-40 h-9 text-xs">
          <SelectValue placeholder="全部分类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部分类</SelectItem>
          {categories.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-36 h-9 text-xs">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {VISIBILITY_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <span className={opt.color}>{opt.icon}</span>
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ============ 数据表格（带批量操作） ============

interface VisibilityItem {
  id: string
  name: string
  description: string
  category: string
}

export function VisibilityDataTable({
  title,
  description,
  items,
  visibility,
  onChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  fallbackState = 'disabled',
}: {
  title: string
  description: string
  items: VisibilityItem[]
  visibility: Record<string, VisibilityState>
  onChange: (id: string, state: VisibilityState) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  fallbackState?: VisibilityState
}) {
  const [sortField, setSortField] = useState<'name' | 'category' | 'visibility'>('category')
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
      else {
        const order: Record<string, number> = { active: 0, disabled: 1, hidden: 2 }
        cmp = (order[visibility[a.id] || fallbackState] ?? 1) - (order[visibility[b.id] || fallbackState] ?? 1)
      }
      return sortAsc ? cmp : -cmp
    })
  }, [items, sortField, sortAsc, visibility, fallbackState])

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id))
  const counts = {
    active: items.filter(i => visibility[i.id] === 'active').length,
    disabled: items.filter(i => visibility[i.id] === 'disabled').length,
    hidden: items.filter(i => visibility[i.id] === 'hidden').length,
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-green-500" /> {counts.active}</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-yellow-500" /> {counts.disabled}</span>
            <span className="flex items-center gap-1"><EyeOff className="w-3 h-3 text-red-500" /> {counts.hidden}</span>
            <span>共 {items.length}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 表头 */}
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          <button onClick={onSelectAll} className="flex-shrink-0 w-5 flex items-center">
            {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
          </button>
          <button onClick={() => toggleSort('name')} className="flex-1 flex items-center gap-1 min-w-0 text-left">
            名称 <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('category')} className="w-24 flex items-center gap-1 text-left">
            分类 <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('visibility')} className="w-36 flex items-center gap-1 text-left">
            状态 <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* 行 */}
        <div className="max-h-[480px] overflow-y-auto">
          {sorted.map(item => {
            const state = visibility[item.id] || fallbackState
            const isSelected = selectedIds.has(item.id)
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2 border-b last:border-0 transition-colors ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-accent/30'
                }`}
              >
                <button onClick={() => onToggleSelect(item.id)} className="flex-shrink-0 w-5 flex items-center">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <Badge variant="outline" className="w-24 justify-center text-[10px] flex-shrink-0">
                  {item.category}
                </Badge>
                <div className="w-36 flex-shrink-0">
                  <VisibilitySelector
                    value={state}
                    onChange={(v) => onChange(item.id, v)}
                  />
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">无匹配结果</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ 批量操作栏 ============

export function BatchActionBar({
  selectedCount,
  onBatchSet,
  onClearSelection,
}: {
  selectedCount: number
  onBatchSet: (state: VisibilityState) => void
  onClearSelection: () => void
}) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium">已选择 {selectedCount} 项</span>
      <div className="flex gap-2 ml-auto">
        {VISIBILITY_OPTIONS.map(opt => (
          <Button key={opt.value} size="sm" variant="outline" onClick={() => onBatchSet(opt.value)}>
            <span className={opt.color}>{opt.icon}</span>
            <span className="ml-1.5">{opt.label}</span>
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onClearSelection}>取消选择</Button>
      </div>
    </div>
  )
}

// ============ 审计时间线 ============

export function AuditTimeline({ logs }: { logs: AuditLogEntry[] }) {
  if (logs.length === 0) return null

  const actionLabels: Record<string, string> = {
    update: '单项更新',
    batch_update: '批量更新',
    reset: '重置默认',
    create: '创建',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          最近变更
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[320px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex gap-3 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{actionLabels[log.action] || log.action}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {log.admin_name || 'system'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : ''}
                  </span>
                </div>
                {log.changes && log.changes.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {log.changes.slice(0, 5).map((c, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{c.item_name || c.item_id}</span>：
                        <span className={VISIBILITY_OPTIONS.find(o => o.value === c.old)?.color}>
                          {VISIBILITY_OPTIONS.find(o => o.value === c.old)?.label || c.old}
                        </span>
                        {' → '}
                        <span className={VISIBILITY_OPTIONS.find(o => o.value === c.new)?.color}>
                          {VISIBILITY_OPTIONS.find(o => o.value === c.new)?.label || c.new}
                        </span>
                      </div>
                    ))}
                    {log.changes.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        ...及其他 {log.changes.length - 5} 项
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ 图例说明 ============

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
