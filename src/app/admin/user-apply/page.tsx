'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Check, X, Loader2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/useToast'
import {
  listPendingUsers,
  approveUser,
  rejectUser,
  type PendingUser,
} from '@/lib/api/admin-api'

export default function UserApplyPage() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await listPendingUsers()
      setUsers(data)
    } catch (err) {
      toast.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    try {
      await approveUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('已通过审核，用户可正常登录')
    } catch {
      toast.error('操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    setActionLoading(userId)
    try {
      await rejectUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('已拒绝该申请')
    } catch {
      toast.error('操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="用户申请" subtitle="管理新用户注册申请" />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            待审核用户 ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无待审核用户
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-right">
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline-block" />
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500"
                            onClick={() => handleApprove(user.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleReject(user.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
