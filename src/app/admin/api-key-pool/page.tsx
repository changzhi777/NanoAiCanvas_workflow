'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Key, Copy, Trash2, RefreshCw } from 'lucide-react'

const mockKeys = [
  { id: 1, name: 'MiniMax 主 Key', provider: 'MiniMax', key: 'sk-****abc123', status: 'active', usedToday: 150, limit: 500 },
  { id: 2, name: 'MiniMax 备用 Key', provider: 'MiniMax', key: 'sk-****def456', status: 'active', usedToday: 80, limit: 500 },
  { id: 3, name: '速创API Key', provider: '速创API', key: 'sk-****ghi789', status: 'active', usedToday: 0, limit: 200 },
]

export default function ApiKeyPoolPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="API Key 池管理"
        subtitle="管理所有渠道商的 API Keys"
        action={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            添加 Key
          </Button>
        }
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索 Key 名称..." className="pl-10" />
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新状态
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Key 列表 ({mockKeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>渠道商</TableHead>
                <TableHead>Key 预览</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>今日使用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>{key.provider}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.key}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                      {key.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${key.usedToday / key.limit > 0.8 ? 'bg-red-500' : 'bg-primary'} rounded-full`}
                          style={{ width: `${(key.usedToday / key.limit) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{key.usedToday}/{key.limit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}