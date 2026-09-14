'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Copy, Edit2, Check, X, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { usePromptTemplateStore, TEMPLATE_CATEGORIES } from '@/stores/promptTemplateStore'
import type { PromptTemplate } from '@/types/image'

interface PromptTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (template: PromptTemplate) => void
}

interface EditingTemplate {
  id?: string
  name: string
  description: string
  category: string
  template: string
}

export function PromptTemplateDialog({ open, onOpenChange, onApply }: PromptTemplateDialogProps) {
  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = usePromptTemplateStore()

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null)

  // 过滤模板列表
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter((t) => t.category === selectedCategory)

  // 开始创建新模板
  const handleStartCreate = useCallback(() => {
    setEditingTemplate({
      name: '',
      description: '',
      category: 'custom',
      template: '',
    })
  }, [])

  // 开始编辑模板
  const handleStartEdit = useCallback((template: PromptTemplate) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      template: template.template,
    })
  }, [])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingTemplate(null)
  }, [])

  // 保存模板
  const handleSave = useCallback(() => {
    if (!editingTemplate) return

    if (!editingTemplate.name.trim()) {
      toast.error('请输入模板名称')
      return
    }
    if (!editingTemplate.template.trim()) {
      toast.error('请输入模板内容')
      return
    }

    if (editingTemplate.id) {
      // 更新
      updateTemplate(editingTemplate.id, {
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        template: editingTemplate.template,
      })
      toast.success('模板已更新')
    } else {
      // 创建
      addTemplate({
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        template: editingTemplate.template,
        params: {},
      })
      toast.success('模板已创建')
    }

    setEditingTemplate(null)
  }, [editingTemplate, addTemplate, updateTemplate])

  // 删除模板
  const handleDelete = useCallback((id: string) => {
    deleteTemplate(id)
    toast.success('模板已删除')
  }, [deleteTemplate])

  // 复制模板
  const handleDuplicate = useCallback((id: string) => {
    duplicateTemplate(id)
    toast.success('模板已复制')
  }, [duplicateTemplate])

  // 应用模板
  const handleApply = useCallback((template: PromptTemplate) => {
    onApply(template)
    onOpenChange(false)
    toast.success(`已应用模板: ${template.name}`)
  }, [onApply, onOpenChange])

  // 渲染模板列表项
  const renderTemplateItem = (template: PromptTemplate) => (
    <div
      key={template.id}
      className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{template.name}</h4>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleDuplicate(template.id)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleStartEdit(template)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-400"
            onClick={() => handleDelete(template.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {template.template}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 bg-muted rounded">
          {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
        </span>
        <Button
          size="sm"
          variant="link"
          className="text-xs h-auto p-0"
          onClick={() => handleApply(template)}
        >
          应用模板
        </Button>
      </div>
    </div>
  )

  // 渲染编辑/创建表单
  const renderEditForm = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">模板名称</label>
        <Input
          value={editingTemplate?.name || ''}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, name: e.target.value } : null)}
          placeholder="给模板起个名字..."
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">描述（可选）</label>
        <Input
          value={editingTemplate?.description || ''}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, description: e.target.value } : null)}
          placeholder="简短描述模板用途..."
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">分类</label>
        <Select
          value={editingTemplate?.category || 'custom'}
          onValueChange={(v) => setEditingTemplate((prev) => prev ? { ...prev, category: v } : null)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">模板内容</label>
        <Textarea
          value={editingTemplate?.template || ''}
          onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, template: e.target.value } : null)}
          placeholder="输入提示词模板，使用 {'{placeholder}'} 表示占位符..."
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground mt-1">
          使用 {'{xxx}'} 作为占位符，生成时会被替换
        </p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            提示词模板
          </DialogTitle>
        </DialogHeader>

        {editingTemplate ? (
          // 编辑/创建模式
          <div className="flex-1 overflow-y-auto">
            {renderEditForm()}
          </div>
        ) : (
          // 列表模式
          <div className="flex-1 overflow-y-auto">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto py-1">
                <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    className="text-xs"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                <div className="space-y-3">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      暂无模板
                    </div>
                  ) : (
                    filteredTemplates.map(renderTemplateItem)
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          {editingTemplate ? (
            // 编辑/创建模式的按钮
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 mr-1" />
                保存模板
              </Button>
            </div>
          ) : (
            // 列表模式的按钮
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                onClick={handleStartCreate}
              >
                <Plus className="h-4 w-4 mr-1" />
                创建模板
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
