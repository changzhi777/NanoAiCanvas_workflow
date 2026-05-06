'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Key,
  RefreshCw,
  Trash2,
  ChevronRight,
  Loader2,
  Settings,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminApi,
  FrontendAPIKey,
  BackendKeyMapping,
} from '@/lib/api/admin-api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function KeyMapperPage() {
  const [frontendKeys, setFrontendKeys] = useState<FrontendAPIKey[]>([])
  const [selectedKey, setSelectedKey] = useState<FrontendAPIKey | null>(null)
  const [mappings, setMappings] = useState<BackendKeyMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Create form state
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyDesc, setNewKeyDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Mapping form state
  const [mappingBackendKey, setMappingBackendKey] = useState('')
  const [mappingProviderType, setMappingProviderType] = useState('wuyinkeji')
  const [mappingModelType, setMappingModelType] = useState('nano-banana2')
  const [mappingPriority, setMappingPriority] = useState(0)
  const [mappingMcpConfig, setMappingMcpConfig] = useState('')
  const [mappingSkills, setMappingSkills] = useState('')
  const [creatingMapping, setCreatingMapping] = useState(false)

  useEffect(() => {
    loadFrontendKeys()
  }, [])

  async function loadFrontendKeys() {
    setLoading(true)
    try {
      const keys = await adminApi.getFrontendAPIKeys()
      setFrontendKeys(keys)
    } catch (error) {
      console.error('Failed to load frontend keys:', error)
      toast.error('加载前端 API Key 失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadMappings(frontendKeyId: number) {
    setLoadingMappings(true)
    try {
      const maps = await adminApi.getBackendKeyMappings(frontendKeyId)
      setMappings(maps)
    } catch (error) {
      console.error('Failed to load mappings:', error)
      toast.error('加载映射配置失败')
    } finally {
      setLoadingMappings(false)
    }
  }

  async function handleCreateKey() {
    if (!newKeyValue.trim()) {
      toast.error('请输入前端 API Key')
      return
    }
    setCreating(true)
    try {
      await adminApi.createFrontendAPIKey({
        frontend_key: newKeyValue.trim(),
        description: newKeyDesc.trim() || undefined,
      })
      toast.success('创建前端 API Key 成功')
      setShowCreateDialog(false)
      setNewKeyValue('')
      setNewKeyDesc('')
      loadFrontendKeys()
    } catch (error) {
      console.error('Failed to create frontend key:', error)
      toast.error('创建前端 API Key 失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteKey(id: number) {
    try {
      await adminApi.deleteFrontendAPIKey(id)
      toast.success('删除前端 API Key 成功')
      loadFrontendKeys()
      if (selectedKey?.id === id) {
        setSelectedKey(null)
        setMappings([])
      }
    } catch (error) {
      console.error('Failed to delete frontend key:', error)
      toast.error('删除前端 API Key 失败')
    }
  }

  async function handleCreateMapping() {
    if (!selectedKey) return
    if (!mappingBackendKey.trim()) {
      toast.error('请输入 Backend Key')
      return
    }
    setCreatingMapping(true)
    try {
      await adminApi.addBackendKeyMapping(selectedKey.id, {
        backend_key: mappingBackendKey.trim(),
        provider_type: mappingProviderType,
        model_type: mappingModelType,
        priority: mappingPriority,
        mcp_config: mappingMcpConfig ? JSON.parse(mappingMcpConfig) : undefined,
        skills: mappingSkills ? JSON.parse(mappingSkills) : undefined,
      })
      toast.success('添加 Backend Key 映射成功')
      setShowMappingDialog(false)
      resetMappingForm()
      loadMappings(selectedKey.id)
    } catch (error) {
      console.error('Failed to create mapping:', error)
      toast.error('添加 Backend Key 映射失败')
    } finally {
      setCreatingMapping(false)
    }
  }

  async function handleDeleteMapping(mappingId: number) {
    try {
      await adminApi.deleteBackendKeyMapping(mappingId)
      toast.success('删除 Backend Key 映射成功')
      if (selectedKey) {
        loadMappings(selectedKey.id)
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error)
      toast.error('删除 Backend Key 映射失败')
    }
  }

  async function handleRefreshCache() {
    try {
      await adminApi.refreshKeyMapperCache()
      toast.success('配置缓存已刷新')
    } catch (error) {
      console.error('Failed to refresh cache:', error)
      toast.error('刷新配置缓存失败')
    }
  }

  function resetMappingForm() {
    setMappingBackendKey('')
    setMappingProviderType('wuyinkeji')
    setMappingModelType('nano-banana2')
    setMappingPriority(0)
    setMappingMcpConfig('')
    setMappingSkills('')
  }

  function selectKey(key: FrontendAPIKey) {
    setSelectedKey(key)
    loadMappings(key.id)
  }

  const filteredKeys = frontendKeys.filter(key =>
    key.frontend_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const providerTypeLabels: Record<string, string> = {
    wuyinkeji: '速创API',
    minimax: 'MiniMax',
    glm: '智谱GLM',
  }

  const modelTypeLabels: Record<string, string> = {
    'nano-banana2': 'Nano Banana2',
    'nano-banana-pro': 'Nano Banana Pro',
    'gpt-image-2': 'GPT Image 2',
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      <AdminHeader title="Key Mapper" subtitle="API Key 映射管理" />

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">API Key 映射管理</h1>
            <p className="text-sm text-gray-400 mt-1">
              管理前端 API Key 到后端 API Key 的映射配置，支持热加载
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCache}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新缓存
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建前端 Key
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Frontend Keys List */}
          <Card className="bg-[#14141a] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center">
                <Key className="w-4 h-4 mr-2" />
                前端 API Keys
              </CardTitle>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="搜索 Key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#1a1a24] border-gray-700 text-white"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? '未找到匹配的 Key' : '暂无前端 API Key'}
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredKeys.map((key) => (
                    <div
                      key={key.id}
                      onClick={() => selectKey(key)}
                      className={`p-4 cursor-pointer hover:bg-[#1a1a24] transition-colors ${
                        selectedKey?.id === key.id ? 'bg-[#1a1a24] border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-white truncate">
                              {key.frontend_key}
                            </span>
                            <Badge
                              variant="outline"
                              className={key.is_active
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                              }
                            >
                              {key.is_active ? '活跃' : '禁用'}
                            </Badge>
                          </div>
                          {key.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {key.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            {key.backend_key_count} 个映射
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteKey(key.id)
                            }}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Mappings Detail */}
          <Card className="bg-[#14141a] border-gray-800 lg:col-span-2">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center">
                <Database className="w-4 h-4 mr-2" />
                {selectedKey ? (
                  <>
                    映射配置
                    <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {selectedKey.frontend_key}
                    </Badge>
                  </>
                ) : (
                  '映射配置'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!selectedKey ? (
                <div className="text-center py-12 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>请从左侧选择一个前端 API Key</p>
                  <p className="text-sm mt-1">查看和管理其映射的后端 Key 配置</p>
                </div>
              ) : loadingMappings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-400">
                      共 {mappings.length} 个后端 Key 映射
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        resetMappingForm()
                        setShowMappingDialog(true)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加映射
                    </Button>
                  </div>

                  {mappings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                      <p>暂无后端 Key 映射</p>
                      <p className="text-sm mt-1">点击"添加映射"创建新的映射关系</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="p-4 bg-[#1a1a24] rounded-lg border border-gray-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="bg-orange-500/10 text-orange-400 border-orange-500/20"
                                >
                                  {providerTypeLabels[mapping.provider_type] || mapping.provider_type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-400 border-purple-500/20"
                                >
                                  {modelTypeLabels[mapping.model_type] || mapping.model_type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={mapping.is_active
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                  }
                                >
                                  {mapping.is_active ? '启用' : '禁用'}
                                </Badge>
                              </div>

                              <div className="mt-2">
                                <div className="text-xs text-gray-500">Backend Key</div>
                                <div className="text-sm font-mono text-white truncate">
                                  {mapping.backend_key}
                                </div>
                              </div>

                              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                <span>优先级: {mapping.priority}</span>
                                {mapping.mcp_config && (
                                  <span>MCP: 已配置</span>
                                )}
                                {mapping.skills && (
                                  <span>Skills: 已配置</span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Frontend Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#14141a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>新建前端 API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>前端 API Key</Label>
              <Input
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="输入前端 API Key"
                className="mt-1 bg-[#1a1a24] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label>描述（可选）</Label>
              <Input
                value={newKeyDesc}
                onChange={(e) => setNewKeyDesc(e.target.value)}
                placeholder="描述这个 Key 的用途"
                className="mt-1 bg-[#1a1a24] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="bg-[#14141a] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加 Backend Key 映射</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Backend Key</Label>
              <Input
                value={mappingBackendKey}
                onChange={(e) => setMappingBackendKey(e.target.value)}
                placeholder="输入后端 API Key"
                className="mt-1 bg-[#1a1a24] border-gray-700 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Provider 类型</Label>
                <select
                  value={mappingProviderType}
                  onChange={(e) => setMappingProviderType(e.target.value)}
                  className="mt-1 w-full bg-[#1a1a24] border-gray-700 text-white rounded-md px-3 py-2"
                >
                  <option value="wuyinkeji">速创API (wuyinkeji)</option>
                  <option value="minimax">MiniMax</option>
                  <option value="glm">智谱GLM</option>
                </select>
              </div>
              <div>
                <Label>模型类型</Label>
                <select
                  value={mappingModelType}
                  onChange={(e) => setMappingModelType(e.target.value)}
                  className="mt-1 w-full bg-[#1a1a24] border-gray-700 text-white rounded-md px-3 py-2"
                >
                  <option value="nano-banana2">Nano Banana2</option>
                  <option value="nano-banana-pro">Nano Banana Pro</option>
                  <option value="gpt-image-2">GPT Image 2</option>
                </select>
              </div>
            </div>
            <div>
              <Label>优先级</Label>
              <Input
                type="number"
                value={mappingPriority}
                onChange={(e) => setMappingPriority(parseInt(e.target.value) || 0)}
                className="mt-1 bg-[#1a1a24] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">数值越高优先级越高</p>
            </div>
            <div>
              <Label>MCP 配置（JSON，可选）</Label>
              <textarea
                value={mappingMcpConfig}
                onChange={(e) => setMappingMcpConfig(e.target.value)}
                placeholder='{"server": "xxx", "config": {}}'
                className="mt-1 w-full h-20 bg-[#1a1a24] border-gray-700 text-white rounded-md px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <Label>Skills 配置（JSON，可选）</Label>
              <textarea
                value={mappingSkills}
                onChange={(e) => setMappingSkills(e.target.value)}
                placeholder='{"skill1": "enabled", "skill2": {}}'
                className="mt-1 w-full h-20 bg-[#1a1a24] border-gray-700 text-white rounded-md px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateMapping} disabled={creatingMapping}>
              {creatingMapping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
