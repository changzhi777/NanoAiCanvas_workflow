'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Users, Copy, QrCode, Trash2, Edit, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getTeams, createTeam, type Team } from '@/lib/api/teams-api'

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getTeams()
      setTeams(response?.teams || [])
    } catch (error: any) {
      toast.error(error.message || '获取团队列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('请输入团队名称')
      return
    }
    setCreating(true)
    try {
      await createTeam(newTeamName.trim())
      toast.success('团队创建成功')
      setNewTeamName('')
      setShowCreateDialog(false)
      fetchTeams()
    } catch (error: any) {
      toast.error(error.message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const filteredTeams = teams.filter((t) =>
    search ? t.name.includes(search) : true
  )

  return (
    <div className="space-y-6">
      <AdminHeader
        title="团队列表"
        subtitle="管理团队成员和积分分配"
        action={
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建团队
          </Button>
        }
      />

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索团队名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchTeams} disabled={loading}>
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 创建团队对话框 */}
      {showCreateDialog && (
        <Card>
          <CardHeader>
            <CardTitle>创建新团队</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">团队名称</label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="输入团队名称"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTeam} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                创建
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 团队列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            团队列表 ({filteredTeams.length})
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
              {filteredTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.owner_id ? '...' : '-'}</TableCell>
                  <TableCell>{team.member_count ?? 0} 人</TableCell>
                  <TableCell>{(team.balance ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        TEAM-{team.id.toString().padStart(6, '0')}
                      </code>
                      <Button variant="ghost" size="icon-xs">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">启用</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" asChild>
                        <a href={`/admin/teams/${team.id}`}>
                          <QrCode className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon-xs" asChild>
                        <a href={`/admin/teams/${team.id}`}>
                          <Edit className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon-xs">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTeams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {loading ? '加载中...' : '暂无团队'}
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