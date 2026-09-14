'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Copy, RefreshCw, Loader2, Coins, Plus, ArrowLeft, QrCode } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast }from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { getTeam, grantTeamPoints, getTeamMembers, type Team, type TeamMember } from '@/lib/api/teams-api'

function getTeamIdFromPath(): string {
  const match = window.location.pathname.match(/\/admin\/teams\/(\d+)/)
  return match ? match[1] : '1'
}

export default function TeamDetailPage() {
  const [teamId] = useState(getTeamIdFromPath())
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [granting, setGranting] = useState(false)
  const [grantAmount, setGrantAmount] = useState('')
  const [grantDesc, setGrantDesc] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    try {
      const id = parseInt(teamId)
      const data = await getTeam(id)
      setTeam(data)
      const memberData = await getTeamMembers(id)
      setMembers(memberData || [])
    } catch (error: any) {
      toast.error(error.message || '获取团队信息失败')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const handleGrant = async () => {
    if (!grantAmount || parseInt(grantAmount) <= 0) {
      toast.error('请输入有效的积分数量')
      return
    }
    setGranting(true)
    try {
      await grantTeamPoints(parseInt(teamId), parseInt(grantAmount), grantDesc || undefined)
      toast.success('积分发放成功')
      setGrantAmount('')
      setGrantDesc('')
      fetchTeam()
    } catch (error: any) {
      toast.error(error.message || '发放失败')
    } finally {
      setGranting(false)
    }
  }

  const inviteCode = team ? `TEAM-${team.id.toString().padStart(6, '0')}` : ''
  const qrValue = team ? `nanoai://join-team?code=${inviteCode}` : ''

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    toast.success('邀请码已复制')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <AdminHeader
          title={team?.name || '团队详情'}
          subtitle="团队积分和成员管理"
          action={
            <Button variant="outline" size="sm" onClick={fetchTeam} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          }
        />
      </div>

      {/* 团队信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">团队积分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Coins className="w-5 h-5" />
              {(team?.balance ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">成员数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              {members.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">邀请码</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">{inviteCode}</code>
              <Button variant="ghost" size="icon-xs" onClick={handleCopyInviteCode}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setShowQRModal(true)}>
                <QrCode className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 积分发放 */}
      <Card>
        <CardHeader>
          <CardTitle>发放积分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm">积分数量</label>
              <Input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="输入数量"
                className="w-40"
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm">说明</label>
              <Input
                value={grantDesc}
                onChange={(e) => setGrantDesc(e.target.value)}
                placeholder="可选"
              />
            </div>
            <Button onClick={handleGrant} disabled={granting}>
              {granting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              发放
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 成员列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              成员列表 ({members.length})
            </CardTitle>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色</TableHead>
                <TableHead>用户ID</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role === 'owner' ? '团长' : member.role === 'admin' ? '管理员' : '成员'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.user_id}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joined_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'owner' && (
                      <Button variant="ghost" size="icon-xs">
                        移除
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    暂无成员
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 二维码弹窗 */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>团队邀请二维码</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={qrValue} size={200} />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">邀请码</p>
              <p className="text-lg font-mono font-bold">{inviteCode}</p>
            </div>
            <Button onClick={handleCopyInviteCode} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              复制邀请码
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}