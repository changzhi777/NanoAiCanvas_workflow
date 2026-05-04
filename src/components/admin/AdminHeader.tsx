'use client'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export default AdminHeader