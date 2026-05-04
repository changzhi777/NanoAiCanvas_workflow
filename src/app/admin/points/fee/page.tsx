'use client'

import { AdminHeader } from '@/components/admin/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function FeeSettingsPage() {
  const handleSave = async () => {
    toast.success('扣费设置已保存')
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="扣费设置"
        subtitle="配置积分扣费规则"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            扣费规则设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">文本模型扣费</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>MiniMax-M2.7 (积分/请求)</Label>
                  <Input type="number" defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label>GLM-5 (积分/1M Token)</Label>
                  <Input type="number" defaultValue="100" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">图像模型扣费</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>image-01 (积分/次)</Label>
                  <Input type="number" defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label>NanoBanana-2 (积分/次)</Label>
                  <Input type="number" defaultValue="8" />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}