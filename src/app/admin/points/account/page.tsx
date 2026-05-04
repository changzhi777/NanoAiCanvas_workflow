'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Wallet } from 'lucide-react'

const mockAccounts = [
  { id: 1, name: '创作团队A', type: 'team', points: 15000, frozen: 500, available: 14500 },
  { id: 2, name: '张三', type: 'user', points: 3000, frozen: 0, available: 3000 },
  { id: 3, name: '设计工作室', type: 'team', points: 8000, frozen: 200, available: 7800 },
]

export default function PointsAccountPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="积分账户"
        subtitle="查看用户和团队积分余额"
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索账户..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            账户列表 ({mockAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>账户名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>总积分</TableHead>
                <TableHead>冻结</TableHead>
                <TableHead>可用</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.type === 'team' ? '团队' : '用户'}</Badge>
                  </TableCell>
                  <TableCell>{account.points.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{account.frozen}</TableCell>
                  <TableCell className="text-green-500 font-medium">{account.available.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}