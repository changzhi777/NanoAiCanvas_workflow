'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SendNotificationPage() {
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    type: 'team',
    targetId: '',
    title: '',
    content: '',
  })

  const handleSend = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('请填写标题和内容')
      return
    }
    setSending(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('消息发送成功')
    setSending(false)
    setForm({ ...form, title: '', content: '' })
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="发送消息"
        subtitle="向用户或团队发送通知消息"
      />

      <Card>
        <CardHeader>
          <CardTitle>发送通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>发送类型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">团队</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="all">全部用户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>目标ID</Label>
              <Input
                value={form.targetId}
                onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                placeholder={form.type === 'team' ? '团队ID' : '用户ID'}
                disabled={form.type === 'all'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>消息标题</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="输入消息标题"
            />
          </div>

          <div className="space-y-2">
            <Label>消息内容</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="输入消息内容"
              rows={5}
            />
          </div>

          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            发送消息
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}