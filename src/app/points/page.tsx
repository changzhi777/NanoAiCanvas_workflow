'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Zap, ArrowLeft, RefreshCw, Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { usePoints } from '@/hooks/usePoints'
import { useAuthStore } from '@/stores/remoteStore'
import { useToast } from '@/hooks/useToast'

export default function PointsPage() {
  const { toast } = useToast()
  const token = useAuthStore((s) => s.token)
  const { balance, totalGranted, totalUsed, loading, getHistory, refreshBalance } = usePoints()
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    refreshBalance()
    loadHistory()
  }, [token])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const records = await getHistory(50, 0)
      setHistory(records)
    } catch {
      toast.error('加载交易记录失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    )
  }

  const typeLabel: Record<string, { text: string; color: string }> = {
    deduct: { text: '扣费', color: 'text-red-500' },
    grant: { text: '发放', color: 'text-green-500' },
    transfer_in: { text: '转入', color: 'text-green-500' },
    transfer_out: { text: '转出', color: 'text-red-500' },
    refund: { text: '退款', color: 'text-blue-500' },
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">积分中心</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refreshBalance(); loadHistory() }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 余额卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Wallet className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">当前余额</p>
                <p className="text-2xl font-bold">{balance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累计获得</p>
                <p className="text-2xl font-bold text-green-500">+{totalGranted.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累计消耗</p>
                <p className="text-2xl font-bold text-red-500">-{totalUsed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 交易记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-yellow-500" />
            交易记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无交易记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead className="text-right">余额</TableHead>
                  <TableHead>说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((tx) => {
                  const info = typeLabel[tx.transaction_type] || { text: tx.transaction_type, color: 'text-muted-foreground' }
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={info.color}>{info.text}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {tx.balance_after}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
