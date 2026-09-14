'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, MessageSquare, RefreshCw } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getNotificationRecords, type Notification } from '@/lib/api/notifications-api'
import { useAuthStore } from '@/stores/remoteStore'

const typeLabels: Record<string, string> = {
  system: '系统通知',
  broadcast: '全站广播',
  team: '团队消息',
  user: '用户私信',
}

const statusLabels: Record<string, string> = {
  pending: '待发送',
  sent: '已发送',
  delivered: '已送达',
  read: '已读',
}

export default function NotificationRecordsPage() {
  const [records, setRecords] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { user } = useAuthStore()

  const fetchRecords = useCallback(async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }
    setLoading(true)
    try {
      const data = await getNotificationRecords(
        1,
        100,
        typeFilter === 'all' ? undefined : typeFilter
      )
      setRecords(data)
    } catch (error: any) {
      toast.error(error.message || '获取记录失败')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, user])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const filteredRecords = records.filter((r) =>
    search ? r.title.includes(search) || r.content.includes(search) : true
  )

  return (
    <div className="space-y-6">
      <AdminHeader
        title="消息记录"
        subtitle="查看已发送的消息记录"
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索消息..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="broadcast">全站广播</SelectItem>
            <SelectItem value="team">团队消息</SelectItem>
            <SelectItem value="user">用户私信</SelectItem>
            <SelectItem value="system">系统通知</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchRecords} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            消息记录 ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>发送者</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{record.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {record.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[record.notification_type] || record.notification_type}</Badge>
                  </TableCell>
                  <TableCell>{record.sender_name || '系统'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(record.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'read' ? 'default' : 'secondary'}>
                      {statusLabels[record.status] || record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    暂无消息记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
