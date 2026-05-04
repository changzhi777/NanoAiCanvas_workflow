'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, MessageSquare } from 'lucide-react'

const mockRecords = [
  { id: 1, title: '系统通知', target: '创作团队A', sender: '管理员', time: '2026-05-03 10:00', status: 'sent' },
  { id: 2, title: '积分变动提醒', target: '用户张三', sender: '系统', time: '2026-05-03 09:30', status: 'sent' },
  { id: 3, title: '版本更新通知', target: '全部用户', sender: '管理员', time: '2026-05-02 15:00', status: 'delivered' },
]

export default function NotificationRecordsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="消息记录"
        subtitle="查看已发送的消息记录"
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索消息..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            消息记录 ({mockRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>发送目标</TableHead>
                <TableHead>发送者</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.title}</TableCell>
                  <TableCell>{record.target}</TableCell>
                  <TableCell>{record.sender}</TableCell>
                  <TableCell>{record.time}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'sent' ? 'default' : 'secondary'}>
                      {record.status === 'sent' ? '已发送' : '已送达'}
                    </Badge>
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