'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { sendNotification, type NotificationCreate } from '@/lib/api/notifications-api'

export default function SendNotificationPage() {
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    type: 'user' as 'user' | 'team' | 'broadcast' | 'system',
    targetId: '',
    title: '',
    content: '',
  })

  const handleSend = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('请填写标题和内容')
      return
    }

    if ((form.type === 'user' || form.type === 'team') && !form.targetId.trim()) {
      toast.error('请填写目标ID')
      return
    }

    setSending(true)
    try {
      const data: NotificationCreate = {
        title: form.title.trim(),
        content: form.content.trim(),
        notification_type: form.type,
      }

      if (form.type === 'user' || form.type === 'system') {
        data.receiver_id = form.targetId.trim()
      } else if (form.type === 'team') {
        data.team_id = form.targetId.trim()
      }

      const result = await sendNotification(data)
      toast.success(`消息发送成功，已送达 ${result.recipients_count} 人`)
      setForm({ ...form, title: '', content: '' })
    } catch (error: any) {
      toast.error(error.message || '发送失败')
    } finally {
      setSending(false)
    }
  }, [form])

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
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">用户私信</SelectItem>
                  <SelectItem value="team">团队消息</SelectItem>
                  <SelectItem value="broadcast">全站广播</SelectItem>
                  <SelectItem value="system">系统通知</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>目标ID</Label>
              <Input
                value={form.targetId}
                onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                placeholder={
                  form.type === 'team'
                    ? '团队ID'
                    : form.type === 'broadcast'
                    ? '无需填写'
                    : '用户ID'
                }
                disabled={form.type === 'broadcast'}
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
