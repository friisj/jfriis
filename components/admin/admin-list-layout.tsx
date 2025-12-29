import Link from 'next/link'
import { ReactNode } from 'react'

interface AdminListLayoutProps {
  title: string
  description: string
  actionHref: string
  actionLabel: string
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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Link
            href={actionHref}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {actionLabel}
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
