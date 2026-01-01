import Link from 'next/link'
import { ReactNode } from 'react'

interface AdminFormLayoutProps {
  title: string
  description?: string
  backHref: string
  backLabel: string
  children: ReactNode
  sidebar?: ReactNode
}

export function AdminFormLayout({
  title,
  description,
  backHref,
  backLabel,
  children,
  sidebar,
}: AdminFormLayoutProps) {
  const hasSidebar = !!sidebar

  return (
    <div className="p-8">
      <div className={hasSidebar ? 'max-w-7xl mx-auto' : 'max-w-4xl mx-auto'}>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>

        {/* Content with optional sidebar */}
        {hasSidebar ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {children}
            </div>
            <div className="space-y-6">
              {sidebar}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
