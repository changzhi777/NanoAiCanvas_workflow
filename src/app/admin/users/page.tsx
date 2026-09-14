'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, RefreshCw, Edit, Ban, Check, Trash2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getUsers, updateUser, disableUser, enableUser, deleteUser, type UserInfo } from '@/lib/api/users-api'

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [deletingUser, setDeletingUser] = useState<UserInfo | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getUsers(page, 20, search || undefined)
      setUsers(response.users)
      setTotal(response.total)
    } catch (error: any) {
      toast.error(error.message || '获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleEdit = (user: UserInfo) => {
    setEditingUser(user)
    setEditUsername(user.username)
  }

  const handleEditSave = async () => {
    if (!editingUser) return
    try {
      await updateUser(editingUser.user_id, { username: editUsername })
      toast.success('用户更新成功')
      setEditingUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || '更新失败')
    }
  }

  const handleDisable = async (user: UserInfo) => {
    try {
      await disableUser(user.user_id)
      toast.success('用户已禁用')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const handleEnable = async (user: UserInfo) => {
    try {
      await enableUser(user.user_id)
      toast.success('用户已启用')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteUser(deletingUser.user_id)
      toast.success('用户已删除')
      setDeletingUser(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="用户管理"
        subtitle="管理系统用户和权限"
      />

      {/* 搜索和筛选 */}
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
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.is_active ? (
                        <Badge variant="default">启用</Badge>
                      ) : (
                        <Badge variant="secondary">禁用</Badge>
                      )}
                      {user.is_verified && (
                        <Badge variant="outline">已验证</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{user.balance.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(user)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      {user.is_active ? (
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDisable(user)}>
                          <Ban className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEnable(user)}>
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeletingUser(user)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {loading ? '加载中...' : '暂无用户'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户弹窗 */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm">用户名</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="输入用户名"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button onClick={handleEditSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>确定要删除用户 <strong>{deletingUser?.username}</strong> 吗？此操作不可撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}