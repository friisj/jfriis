import Link from 'next/link'
import { ReactNode } from 'react'

interface AdminDetailLayoutProps {
  title: string
  description?: string
  backHref: string
  backLabel: string
  editHref?: string
  children: ReactNode
}

export function AdminDetailLayout({
  title,
  description,
  backHref,
  backLabel,
  editHref,
  children,
}: AdminDetailLayoutProps) {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back navigation */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {editHref && (
            <Link
              href={editHref}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
