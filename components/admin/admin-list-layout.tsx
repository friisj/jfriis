import Link from 'next/link'
import { ReactNode } from 'react'
import { IconPlus } from '@tabler/icons-react'

interface AdminListLayoutProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
}

export function AdminListLayout({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: AdminListLayoutProps) {
  return (
    <div className="p-8 border border-green-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <IconPlus size={20} />
              {actionLabel}
            </Link>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
