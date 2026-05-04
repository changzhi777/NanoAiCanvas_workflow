'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Zap, Loader2, Search, RefreshCw, Plus, Trash2, Edit, QrCode, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import { adminApi, type UserPointsInfo, type BillingRule, type TransactionRecord, type RechargeRecord } from '@/lib/api/admin-api'
import { useAuthStore } from '@/stores/remoteStore'

// 用户积分列表页
function PointsUsersTab() {
  const [users, setUsers] = useState<UserPointsInfo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPointsInfo | null>(null)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [rechargeDesc, setRechargeDesc] = useState('')
  const [recharging, setRecharging] = useState(false)

  const token = useAuthStore((s) => s.token)

  const fetchUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminApi.getUsersWithPoints(page, 20, search || undefined)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err: any) {
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search, token])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRecharge = async () => {
    if (!selectedUser || !rechargeAmount) return
    setRecharging(true)
    try {
      const result = await adminApi.rechargeUserPoints({
        user_id: selectedUser.user_id,
        amount: parseInt(rechargeAmount),
        description: rechargeDesc || '管理员充值'
      })
      toast.success(`成功为 ${selectedUser.username} 充值 ${result.amount} 积分`)
      setRechargeOpen(false)
      setRechargeAmount('')
      setRechargeDesc('')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || '充值失败')
    } finally {
      setRecharging(false)
    }
  }

  const openRecharge = (user: UserPointsInfo) => {
    setSelectedUser(user)
    setRechargeOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            用户积分管理
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead className="text-right">余额</TableHead>
                <TableHead className="text-right">累计发放</TableHead>
                <TableHead className="text-right">累计消耗</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{user.balance.toLocaleString()}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {user.total_granted.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {user.total_used.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openRecharge(user)}>
                      <Zap className="w-4 h-4 mr-1" />
                      充值
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {total} 条记录，第 {page} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(p => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 充值对话框 */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>为用户充值积分</DialogTitle>
            <DialogDescription>
              向 {selectedUser?.username} ({selectedUser?.email}) 充值积分
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>充值积分数量</Label>
              <Input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="输入积分数量"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Input
                value={rechargeDesc}
                onChange={(e) => setRechargeDesc(e.target.value)}
                placeholder="输入备注说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>取消</Button>
            <Button onClick={handleRecharge} disabled={!rechargeAmount || recharging}>
              {recharging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              确认充值
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 扣费规则页
function BillingRulesTab() {
  const [rules, setRules] = useState<BillingRule[]>([])
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<BillingRule | null>(null)
  const [editForm, setEditForm] = useState({ name: '', points_per_unit: '' })
  const [addForm, setAddForm] = useState({ name: '', model_type: 'image', points_per_unit: '', unit: 'per_call' })
  const [saving, setSaving] = useState(false)

  const token = useAuthStore((s) => s.token)

  const fetchRules = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminApi.getBillingRules()
      setRules(data)
    } catch (err: any) {
      toast.error('获取扣费规则失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const openEdit = (rule: BillingRule) => {
    setSelectedRule(rule)
    setEditForm({ name: rule.name, points_per_unit: String(rule.points_per_unit) })
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedRule) return
    setSaving(true)
    try {
      await adminApi.updateBillingRule(selectedRule.id, {
        name: editForm.name,
        points_per_unit: parseFloat(editForm.points_per_unit)
      })
      toast.success('规则更新成功')
      setEditOpen(false)
      fetchRules()
    } catch (err: any) {
      toast.error(err.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.name || !addForm.points_per_unit) {
      toast.error('请填写完整信息')
      return
    }
    setSaving(true)
    try {
      await adminApi.createBillingRule({
        name: addForm.name,
        model_type: addForm.model_type,
        points_per_unit: parseFloat(addForm.points_per_unit),
        unit: addForm.unit
      })
      toast.success('规则创建成功')
      setAddOpen(false)
      setAddForm({ name: '', model_type: 'image', points_per_unit: '', unit: 'per_call' })
      fetchRules()
    } catch (err: any) {
      toast.error(err.message || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rule: BillingRule) => {
    if (!confirm(`确定删除规则 "${rule.name}" 吗？`)) return
    try {
      await adminApi.deleteBillingRule(rule.id)
      toast.success('规则已删除')
      fetchRules()
    } catch (err: any) {
      toast.error(err.message || '删除失败')
    }
  }

  const handleToggle = async (rule: BillingRule) => {
    try {
      await adminApi.updateBillingRule(rule.id, { is_active: !rule.is_active })
      toast.success(rule.is_active ? '规则已禁用' : '规则已启用')
      fetchRules()
    } catch (err: any) {
      toast.error(err.message || '操作失败')
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            扣费规则设置
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加规则
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">单价</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rule.model_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rule.points_per_unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.unit === 'per_call' ? '每次调用' : rule.unit === 'per_token' ? '每Token' : '每秒'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                      {rule.is_active ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(rule)}>
                        {rule.is_active ? '禁用' : '启用'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    暂无扣费规则
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑规则对话框 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑扣费规则</DialogTitle>
            <DialogDescription>
              修改规则 "{selectedRule?.name}" 的设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>每单位积分</Label>
              <Input
                type="number"
                value={editForm.points_per_unit}
                onChange={(e) => setEditForm({ ...editForm, points_per_unit: e.target.value })}
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加规则对话框 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加扣费规则</DialogTitle>
            <DialogDescription>创建新的扣费规则</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="如：文生图扣费"
              />
            </div>
            <div className="space-y-2">
              <Label>模型类型</Label>
              <Select value={addForm.model_type} onValueChange={(v) => setAddForm({ ...addForm, model_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">图像</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                  <SelectItem value="audio">音频</SelectItem>
                  <SelectItem value="text">文本</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>每单位积分</Label>
              <Input
                type="number"
                value={addForm.points_per_unit}
                onChange={(e) => setAddForm({ ...addForm, points_per_unit: e.target.value })}
                placeholder="如：10"
                step="0.1"
                min="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>计费单位</Label>
              <Select value={addForm.unit} onValueChange={(v) => setAddForm({ ...addForm, unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_call">每次调用</SelectItem>
                  <SelectItem value="per_token">每Token</SelectItem>
                  <SelectItem value="per_second">每秒</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              创建规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 交易记录页
function TransactionHistoryTab() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const token = useAuthStore((s) => s.token)

  const fetchTransactions = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminApi.getTransactionRecords(
        1, 100,
        userId || undefined,
        typeFilter === 'all' ? undefined : typeFilter
      )
      setTransactions(data)
    } catch (err: any) {
      toast.error('获取交易记录失败')
    } finally {
      setLoading(false)
    }
  }, [userId, typeFilter, token])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          交易记录
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="用户ID筛选..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="交易类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="deduct">扣费</SelectItem>
              <SelectItem value="grant">发放</SelectItem>
              <SelectItem value="transfer_in">转入</SelectItem>
              <SelectItem value="transfer_out">转出</SelectItem>
              <SelectItem value="refund">退款</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead className="text-right">余额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>说明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{tx.username}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tx.transaction_type}</Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {tx.balance_after}
                </TableCell>
                <TableCell>
                  <Badge variant={tx.status === 'success' ? 'default' : 'secondary'}>
                    {tx.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">
                  {tx.description || '-'}
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  暂无交易记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// 扫码充值页（预留扩展）
function QrCodeRechargeTab() {
  const [amount, setAmount] = useState('100')
  const [selected, setSelected] = useState<'wechat' | 'alipay'>('wechat')
  const [qrLoading, setQrLoading] = useState(false)

  const token = useAuthStore((s) => s.token)
  const presetAmounts = [50, 100, 200, 500, 1000]

  const handleGenerateQR = async () => {
    if (!token) return
    if (!amount || parseInt(amount) <= 0) {
      toast.error('请输入有效的充值金额')
      return
    }

    setQrLoading(true)
    try {
      // 这里应该先选择用户再生成，实际扩展时对接支付接口
      toast.info('扫码充值功能预留，请使用"用户积分"标签页进行充值')
    } catch (err: any) {
      toast.error(err.message || '生成失败')
    } finally {
      setQrLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-yellow-500" />
          扫码充值（预留扩展）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧：金额选择 */}
          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">选择充值金额</Label>
              <div className="grid grid-cols-3 gap-3">
                {presetAmounts.map((a) => (
                  <Button
                    key={a}
                    variant={amount === String(a) ? 'default' : 'outline'}
                    onClick={() => setAmount(String(a))}
                  >
                    {a} 积分
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>自定义金额</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="输入积分数量"
                min="1"
              />
            </div>

            <div>
              <Label className="mb-3 block">支付方式</Label>
              <div className="flex gap-4">
                <Button
                  variant={selected === 'wechat' ? 'default' : 'outline'}
                  onClick={() => setSelected('wechat')}
                  className="flex-1"
                >
                  <span className="text-lg mr-2">微</span>
                  微信支付
                </Button>
                <Button
                  variant={selected === 'alipay' ? 'default' : 'outline'}
                  onClick={() => setSelected('alipay')}
                  className="flex-1"
                >
                  <span className="text-lg mr-2">支</span>
                  支付宝
                </Button>
              </div>
            </div>

            <Button size="lg" onClick={handleGenerateQR} disabled={!amount || qrLoading}>
              {qrLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <QrCode className="w-5 h-5 mr-2" />
              )}
              生成付款码
            </Button>

            <p className="text-sm text-muted-foreground">
              * 扫码充值功能需要对接第三方支付接口，当前为预留实现
            </p>
          </div>

          {/* 右侧：二维码展示 */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 min-h-[300px]">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">正在生成付款码...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">请使用 {selected === 'wechat' ? '微信' : '支付宝'} 扫码支付</p>
                <p className="text-2xl font-bold text-primary">{amount || '0'} 积分</p>
                <p className="text-sm text-muted-foreground">支付完成后积分将自动到账</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 充值记录页
function RechargeRecordsTab() {
  const [records, setRecords] = useState<RechargeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const token = useAuthStore((s) => s.token)

  const fetchRecords = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminApi.getRechargeRecords(1, 50, undefined, statusFilter === 'all' ? undefined : statusFilter)
      setRecords(data)
    } catch (err: any) {
      toast.error('获取充值记录失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, token])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-yellow-500" />
          充值记录
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="支付状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="paid">已支付</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
              <SelectItem value="refunded">已退款</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>支付方式</TableHead>
              <TableHead>订单号</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{r.username}</TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  +{r.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {r.payment_method === 'wechat' ? '微信' : r.payment_method === 'alipay' ? '支付宝' : '-'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {r.order_id || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    r.payment_status === 'paid' ? 'default' :
                    r.payment_status === 'pending' ? 'secondary' :
                    r.payment_status === 'cancelled' ? 'destructive' :
                    'outline'
                  }>
                    {r.payment_status === 'paid' ? '已完成' :
                     r.payment_status === 'pending' ? '待支付' :
                     r.payment_status === 'cancelled' ? '已取消' :
                     r.payment_status === 'refunded' ? '已退款' : r.payment_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无充值记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// 主页面
export default function GrantPointsPage() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="space-y-6">
      <AdminHeader
        title="积分管理"
        subtitle="管理用户积分、扣费规则和充值"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">用户积分</TabsTrigger>
          <TabsTrigger value="rules">扣费规则</TabsTrigger>
          <TabsTrigger value="history">交易记录</TabsTrigger>
          <TabsTrigger value="recharge">扫码充值</TabsTrigger>
          <TabsTrigger value="records">充值记录</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <PointsUsersTab />
        </TabsContent>

        <TabsContent value="rules">
          <BillingRulesTab />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistoryTab />
        </TabsContent>

        <TabsContent value="recharge">
          <QrCodeRechargeTab />
        </TabsContent>

        <TabsContent value="records">
          <RechargeRecordsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}