import { ReactNode } from 'react'

interface SidebarCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SidebarCard({
  title,
  description,
  children,
  className = '',
}: SidebarCardProps) {
  return (
    <div className={`rounded-lg border bg-card p-4 space-y-4 ${className}`}>
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
