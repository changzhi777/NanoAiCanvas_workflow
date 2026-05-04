'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Users, Copy, QrCode, Trash2, Edit } from 'lucide-react'

const mockTeams = [
  { id: 1, name: '创作团队A', leader: '张三', members: 5, points: 15000, inviteCode: 'TEAM-A1B2', status: 'active' },
  { id: 2, name: '设计工作室', leader: '李四', members: 3, points: 8000, inviteCode: 'TEAM-C3D4', status: 'active' },
  { id: 3, name: 'AI 实验室', leader: '王五', members: 8, points: 25000, inviteCode: 'TEAM-E5F6', status: 'active' },
  { id: 4, name: '影视制作组', leader: '赵六', members: 4, points: 12000, inviteCode: 'TEAM-G7H8', status: 'inactive' },
]

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="团队列表"
        subtitle="管理团队成员和积分分配"
        action={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            创建团队
          </Button>
        }
      />

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索团队名称..." className="pl-10" />
        </div>
      </div>

      {/* 团队列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            团队列表 ({mockTeams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>团队名称</TableHead>
                <TableHead>团长</TableHead>
                <TableHead>成员</TableHead>
                <TableHead>团队积分</TableHead>
                <TableHead>邀请码</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.leader}</TableCell>
                  <TableCell>{team.members} 人</TableCell>
                  <TableCell>{team.points.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{team.inviteCode}</code>
                      <Button variant="ghost" size="icon-xs">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                      {team.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs">
                        <QrCode className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs">
                        <Edit className="w-3 h-3" />
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