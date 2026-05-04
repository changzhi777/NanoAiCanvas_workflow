'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, UserPlus, Check, X, Clock } from 'lucide-react'

const mockApplications = [
  { id: 1, username: '新用户A', email: 'user1@example.com', applyTime: '2026-05-03 10:00', status: 'pending' },
  { id: 2, username: '新用户B', email: 'user2@example.com', applyTime: '2026-05-03 09:30', status: 'pending' },
  { id: 3, username: '创作者C', email: 'user3@example.com', applyTime: '2026-05-02 15:20', status: 'approved' },
  { id: 4, username: '开发者D', email: 'user4@example.com', applyTime: '2026-05-02 14:00', status: 'rejected' },
]

export default function UserApplyPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="用户申请"
        subtitle="管理新用户注册申请"
      />

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索用户名或邮箱..." className="pl-10" />
        </div>
        <Button variant="outline">筛选</Button>
      </div>

      {/* 申请列表 */}
      <Card>
        <CardHeader>
          <CardTitle>申请列表 ({mockApplications.filter(a => a.status === 'pending').length} 待处理)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.username}</TableCell>
                  <TableCell className="text-muted-foreground">{app.email}</TableCell>
                  <TableCell>{app.applyTime}</TableCell>
                  <TableCell>
                    <Badge variant={
                      app.status === 'pending' ? 'warning' :
                      app.status === 'approved' ? 'default' : 'secondary'
                    }>
                      {app.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {app.status === 'approved' && <Check className="w-3 h-3 mr-1" />}
                      {app.status === 'rejected' && <X className="w-3 h-3 mr-1" />}
                      {app.status === 'pending' ? '待处理' : app.status === 'approved' ? '已通过' : '已拒绝'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-green-500">
                          <Check className="w-4 h-4 mr-1" />
                          通过
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <X className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    )}
                    {app.status !== 'pending' && (
                      <Button variant="ghost" size="sm">
                        <UserPlus className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                    )}
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