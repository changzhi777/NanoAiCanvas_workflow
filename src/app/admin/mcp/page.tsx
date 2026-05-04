'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Plug,
  CheckCircle,
  XCircle,
  Terminal,
  Key,
  Globe,
  Upload,
  Download,
  FileJson,
  AlertCircle,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Save } from 'lucide-react'

// MCP Server 配置类型
interface MCPServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  description?: string
  lastUsed?: string
}

// MCP Client 配置类型（用于 JSON 导入/导出）
interface MCPClientConfig {
  mcpServers: Record<string, {
    command: string
    args: string[]
    env?: Record<string, string>
  }>
}

// MCP 配置 API 响应类型
interface MCPConfigResponse {
  servers: MCPServerConfig[]
  updated_at?: string
}

// 预设的 MCP 配置模板
const MCP_TEMPLATES = [
  {
    name: 'MiniMax Token Plan MCP',
    description: 'MiniMax 图片理解 & 网络搜索 MCP',
    command: 'uvx',
    args: ['minimax-coding-plan-mcp', '-y'],
    env: {
      MINIMAX_API_KEY: '${MINIMAX_API_KEY}',
      MINIMAX_API_HOST: 'https://api.minimaxi.com',
    },
    tools: ['web_search', 'understand_image'],
  },
  {
    name: 'Claude Code 内置 MCP',
    description: 'Claude Code 自带工具',
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server'],
    env: {
      ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}',
    },
    tools: ['computer', 'bash'],
  },
  {
    name: '文件系统 MCP',
    description: '本地文件系统访问',
    command: 'uvx',
    args: ['@modelcontextprotocol/server-filesystem'],
    env: {},
    tools: ['read_file', 'write_file', 'list_directory'],
  },
]

// 示例配置数据
const mockMCPServers: MCPServerConfig[] = [
  {
    id: '1',
    name: 'MiniMax MCP',
    command: 'uvx',
    args: ['minimax-coding-plan-mcp', '-y'],
    env: {
      MINIMAX_API_KEY: 'sk-xxxxx',
      MINIMAX_API_HOST: 'https://api.minimaxi.com',
    },
    enabled: true,
    description: 'MiniMax Token Plan 图片理解和网络搜索',
    lastUsed: '2026-05-04 10:30:00',
  },
  {
    id: '2',
    name: '文件系统 MCP',
    command: 'uvx',
    args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    enabled: false,
    description: '本地文件系统访问',
  },
]

export default function MCPPage() {
  const [servers, setServers] = useState<MCPServerConfig[]>(mockMCPServers)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null)
  const [importText, setImportText] = useState('')
  const [importFormat, setImportFormat] = useState<'json' | 'cline'>('json')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // 加载保存的配置
  useEffect(() => {
    const saved = localStorage.getItem('mcp-config')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (Array.isArray(data)) {
          setServers(data)
          setLastSaved(new Date().toLocaleTimeString())
          toast.success('已加载保存的配置')
        }
      } catch (e) {
        console.error('Failed to load saved config:', e)
      }
    }
  }, [])

  // 保存配置到 localStorage
  const handleSaveConfig = useCallback(() => {
    try {
      localStorage.setItem('mcp-config', JSON.stringify(servers))
      setLastSaved(new Date().toLocaleTimeString())
      toast.success('MCP 配置已保存')
    } catch (e) {
      toast.error('保存失败')
    }
  }, [servers])

  // 新建/编辑表单状态
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    args: '',
    envVars: '',
    enabled: true,
    description: '',
  })

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      toast.success('MCP 服务器列表已刷新')
      setLoading(false)
    }, 500)
  }

  const handleCopyConfig = (server: MCPServerConfig) => {
    const configStr = JSON.stringify({
      command: server.command,
      args: server.args,
      env: server.env,
    }, null, 2)
    navigator.clipboard.writeText(configStr)
    toast.success('配置已复制到剪贴板')
  }

  // 导出所有配置为 JSON
  const handleExportJSON = () => {
    const config: MCPClientConfig = {
      mcpServers: {}
    }
    servers.forEach(s => {
      if (s.enabled) {
        config.mcpServers[s.name.toLowerCase().replace(/\s+/g, '-')] = {
          command: s.command,
          args: s.args,
          env: s.env,
        }
      }
    })
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mcp-config.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('MCP 配置已导出为 JSON')
  }

  // 导出为 Claude Code 格式
  const handleExportClaudeCode = () => {
    let text = '# Claude Code MCP 配置\n\n在终端运行以下命令添加 MCP 服务器：\n\n'
    servers.filter(s => s.enabled).forEach(s => {
      const envStr = Object.entries(s.env)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
      text += `## ${s.name}\n`
      text += `\`\`\`bash\nclaude mcp add -s user ${s.name.toLowerCase().replace(/\s+/g, '-')} `
      text += Object.entries(s.env).map(([k]) => `--env ${k}`).join(' ') + ' -- '
      text += `${s.command} ${s.args.join(' ')}\n`
      text += `\`\`\`\n\n`
    })
    navigator.clipboard.writeText(text)
    toast.success('Claude Code 配置命令已复制到剪贴板')
  }

  // 导出为 Cursor 格式
  const handleExportCursor = () => {
    const config: MCPClientConfig = {
      mcpServers: {}
    }
    servers.filter(s => s.enabled).forEach(s => {
      config.mcpServers[s.name.toLowerCase().replace(/\s+/g, '-')] = {
        command: s.command,
        args: s.args,
        env: s.env,
      }
    })
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    toast.success('Cursor MCP 配置已复制到剪贴板')
  }

  // 导入 JSON 配置
  const handleImportJSON = useCallback((text: string) => {
    try {
      const data = JSON.parse(text)
      let newServers: MCPServerConfig[] = []

      // 支持多种 JSON 格式
      if (data.mcpServers) {
        // 标准 MCP 格式 { mcpServers: { name: { command, args, env } } }
        Object.entries(data.mcpServers).forEach(([name, config]: [string, any]) => {
          newServers.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name,
            command: config.command || '',
            args: Array.isArray(config.args) ? config.args : [],
            env: config.env || {},
            enabled: true,
            description: `导入的配置`,
          })
        })
      } else if (Array.isArray(data)) {
        // 数组格式 [{ name, command, args, env }]
        data.forEach((item: any) => {
          newServers.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: item.name || `Server ${newServers.length + 1}`,
            command: item.command || '',
            args: Array.isArray(item.args) ? item.args : [],
            env: item.env || {},
            enabled: true,
            description: item.description || `导入的配置`,
          })
        })
      } else if (typeof data === 'object') {
        // 直接对象格式 { name: { command, args, env } }
        Object.entries(data).forEach(([name, config]: [string, any]) => {
          newServers.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name,
            command: config.command || '',
            args: Array.isArray(config.args) ? config.args : [],
            env: config.env || {},
            enabled: true,
            description: `导入的配置`,
          })
        })
      } else {
        throw new Error('不支持的 JSON 格式')
      }

      if (newServers.length === 0) {
        toast.error('未找到有效的 MCP 服务器配置')
        return
      }

      setServers([...servers, ...newServers])
      toast.success(`成功导入 ${newServers.length} 个 MCP 服务器配置`)
      setLastSaved(new Date().toLocaleTimeString())
      setImportDialogOpen(false)
      setImportText('')
    } catch (e) {
      toast.error(`导入失败: ${e instanceof Error ? e.message : 'JSON 解析错误'}`)
    }
  }, [servers])

  // 导入 Cline/Roo Code 格式
  const handleImportCline = useCallback((text: string) => {
    try {
      const lines = text.split('\n')
      const newServers: MCPServerConfig[] = []
      let currentServer: Partial<MCPServerConfig> = {}

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          // 新服务开始
          if (currentServer.name) {
            newServers.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: currentServer.name,
              command: currentServer.command || '',
              args: currentServer.args || [],
              env: currentServer.env || {},
              enabled: true,
            })
          }
          currentServer = { name: trimmed.slice(1, -1) }
        } else if (trimmed.startsWith('command=')) {
          currentServer.command = trimmed.split('=')[1]
        } else if (trimmed.startsWith('args=')) {
          currentServer.args = trimmed.split('=')[1].split(' ').filter(Boolean)
        } else if (trimmed.startsWith('env.')) {
          const [, key, value] = trimmed.split(/env\.(.+?)=/)
          if (key && value) {
            currentServer.env = currentServer.env || {}
            currentServer.env[key] = value
          }
        }
      }

      // 添加最后一个服务
      if (currentServer.name) {
        newServers.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: currentServer.name,
          command: currentServer.command || '',
          args: currentServer.args || [],
          env: currentServer.env || {},
          enabled: true,
        })
      }

      if (newServers.length === 0) {
        toast.error('未找到有效的 MCP 服务器配置 (Cline/Roo Code 格式)')
        return
      }

      setServers([...servers, ...newServers])
      toast.success(`成功导入 ${newServers.length} 个 MCP 服务器配置`)
      setImportDialogOpen(false)
      setImportText('')
    } catch (e) {
      toast.error(`导入失败: ${e instanceof Error ? e.message : '解析错误'}`)
    }
  }, [servers])

  // 处理文件导入
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (importFormat === 'json') {
        handleImportJSON(text)
      } else {
        handleImportCline(text)
      }
    }
    reader.readAsText(file)
    // 清空 input 以允许重复选择同一文件
    e.target.value = ''
  }, [importFormat, handleImportJSON, handleImportCline])

  const handleToggle = (id: string) => {
    setServers(servers.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ))
    toast.success('MCP 服务器状态已更新')
    setLastSaved(new Date().toLocaleTimeString())
  }

  const handleDelete = (id: string) => {
    setServers(servers.filter(s => s.id !== id))
    toast.success('MCP 服务器已删除')
    setLastSaved(new Date().toLocaleTimeString())
  }

  const handleOpenDialog = (server?: MCPServerConfig) => {
    if (server) {
      setEditingServer(server)
      setFormData({
        name: server.name,
        command: server.command,
        args: server.args.join(' '),
        envVars: Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n'),
        enabled: server.enabled,
        description: server.description || '',
      })
    } else {
      setEditingServer(null)
      setFormData({
        name: '',
        command: '',
        args: '',
        envVars: '',
        enabled: true,
        description: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = () => {
    const env: Record<string, string> = {}
    formData.envVars.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })

    if (editingServer) {
      setServers(servers.map(s =>
        s.id === editingServer.id ? {
          ...s,
          name: formData.name,
          command: formData.command,
          args: formData.args.split(' ').filter(Boolean),
          env,
          enabled: formData.enabled,
          description: formData.description,
        } : s
      ))
      toast.success('MCP 服务器配置已更新')
    } else {
      const newServer: MCPServerConfig = {
        id: Date.now().toString(),
        name: formData.name,
        command: formData.command,
        args: formData.args.split(' ').filter(Boolean),
        env,
        enabled: formData.enabled,
        description: formData.description,
      }
      setServers([...servers, newServer])
      toast.success('MCP 服务器已添加')
    }
    setLastSaved(new Date().toLocaleTimeString())
    setDialogOpen(false)
  }

  const handleApplyTemplate = (template: typeof MCP_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      command: template.command,
      args: template.args.join(' '),
      envVars: Object.entries(template.env).map(([k, v]) => `${k}=${v}`).join('\n'),
      enabled: true,
      description: template.description,
    })
    setEditingServer(null)
    setDialogOpen(true)
  }

  const enabledCount = servers.filter(s => s.enabled).length

  return (
    <div className="space-y-6">
      <AdminHeader
        title="MCP 配置"
        subtitle="管理 Model Context Protocol 服务器配置"
        action={
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground mr-2">
                已保存 {lastSaved}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSaveConfig}>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>
        }
      />

      {/* MCP 介绍 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">什么是 MCP？</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <strong>Model Context Protocol (MCP)</strong> 是一种用于 AI 模型与外部工具和服务交互的标准化协议。
            通过配置 MCP 服务器，可以让 AI 助手（如 Claude Code、Cursor 等）调用各种工具，
            如网络搜索、图片理解、文件操作等。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" /> 网络搜索
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Key className="w-3 h-3" /> 图片理解
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Terminal className="w-3 h-3" /> 文件系统
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* MCP 服务器列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">MCP 服务器 ({enabledCount}/{servers.length} 已启用)</CardTitle>
            <CardDescription>已配置的 MCP 服务器列表</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCursor}>
              <FileJson className="w-4 h-4 mr-2" />
              Cursor 格式
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportClaudeCode}>
              <Terminal className="w-4 h-4 mr-2" />
              Claude Code
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无 MCP 服务器配置</p>
              <p className="text-sm">点击上方按钮添加第一个 MCP 服务器</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">状态</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>命令</TableHead>
                  <TableHead>环境变量</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id} className={!server.enabled ? 'opacity-50' : ''}>
                    <TableCell>
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => handleToggle(server.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {server.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{server.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                        {server.command} {server.args.join(' ')}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Object.keys(server.env).length > 0 ? (
                          Object.keys(server.env).map(key => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">无</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {server.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(server)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyConfig(server)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(server.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 配置模板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">快速配置模板</CardTitle>
          <CardDescription>使用预设模板快速配置 MCP 服务器</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MCP_TEMPLATES.map((template, index) => (
              <Card key={index} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleApplyTemplate(template)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plug className="w-4 h-4 text-primary" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tools.map(tool => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {template.command} {template.args.join(' ')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <p className="font-medium">安装 uvx</p>
              <p className="text-muted-foreground">MCP 服务器需要通过 uvx 运行。安装命令：<code className="bg-muted px-1 rounded">curl -LsSf https://astral.sh/uv/install.sh | sh</code></p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">2</div>
            <div>
              <p className="font-medium">配置环境变量</p>
              <p className="text-muted-foreground">在环境变量中设置 API Key 等敏感信息，使用 <code className="bg-muted px-1 rounded">$&#123;VAR_NAME&#125;</code> 格式引用</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">3</div>
            <div>
              <p className="font-medium">在 AI 工具中使用</p>
              <p className="text-muted-foreground">导出配置后，复制到 Claude Code、Cursor 等工具的 MCP 配置中即可使用</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">4</div>
            <div>
              <p className="font-medium">导入配置</p>
              <p className="text-muted-foreground">支持导入 JSON 格式（标准 MCP 配置）或 Cline/Roo Code 格式</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingServer ? '编辑 MCP 服务器' : '添加 MCP 服务器'}</DialogTitle>
            <DialogDescription>
              {editingServer ? '修改 MCP 服务器配置' : '填写 MCP 服务器的配置信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：MiniMax MCP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="command">命令</Label>
              <Input
                id="command"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder="例如：uvx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="args">参数</Label>
              <Input
                id="args"
                value={formData.args}
                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                placeholder="用空格分隔，例如：minimax-coding-plan-mcp -y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="envVars">环境变量（每行一个，格式：KEY=value）</Label>
              <textarea
                id="envVars"
                className="w-full min-h-[100px] px-3 py-2 bg-background border border-input rounded-md text-sm font-mono"
                value={formData.envVars}
                onChange={(e) => setFormData({ ...formData, envVars: e.target.value })}
                placeholder="MINIMAX_API_KEY=sk-xxxx&#10;MINIMAX_API_HOST=https://api.minimaxi.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="MCP 服务器的功能描述"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">启用此 MCP 服务器</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>导入 MCP 配置</DialogTitle>
            <DialogDescription>
              从 JSON 文件或剪贴板导入 MCP 服务器配置
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label>导入格式</Label>
                <Select value={importFormat} onValueChange={(v: 'json' | 'cline') => setImportFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">标准 MCP JSON</SelectItem>
                    <SelectItem value="cline">Cline/Roo Code 格式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".json,.md,.txt"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full mt-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  选择文件导入
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或粘贴内容</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importText">
                {importFormat === 'json' ? 'MCP JSON 配置' : 'Cline/Roo Code 配置'}
              </Label>
              <Textarea
                id="importText"
                className="w-full min-h-[200px] font-mono text-sm"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={importFormat === 'json'
                  ? `{\n  "mcpServers": {\n    "my-mcp": {\n      "command": "uvx",\n      "args": ["my-mcp-server"],\n      "env": {\n        "API_KEY": "xxx"\n      }\n    }\n  }\n}`
                  : `[my-mcp-server]\ncommand=uvx\nargs=my-mcp-server\nenv.API_KEY=xxx`}
              />
            </div>

            {importText && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p>检测到 {importText.split('\n').length} 行内容</p>
                  <p className="mt-1">点击"导入"按钮解析并添加配置</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportText('') }}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (importFormat === 'json') {
                  handleImportJSON(importText)
                } else {
                  handleImportCline(importText)
                }
              }}
              disabled={!importText.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}