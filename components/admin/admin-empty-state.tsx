import Link from 'next/link'
import { ReactNode } from 'react'

interface AdminEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionHref: string
  actionLabel: string
}

export function AdminEmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Link>
      </div>
    </div>
  )
}
