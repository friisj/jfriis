import Link from 'next/link'
import { ReactNode } from 'react'
import { IconChevronLeft, IconPencil } from '@tabler/icons-react'

interface AdminDetailLayoutProps {
  title: string
  description?: string
  backHref: string
  backLabel: string
  editHref?: string
  /** Custom actions to display in the header (replaces default Edit button if provided) */
  actions?: ReactNode
  children: ReactNode
}

export function AdminDetailLayout({
  title,
  description,
  backHref,
  backLabel,
  editHref,
  actions,
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
          <IconChevronLeft size={16} />
          {backLabel}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions ? (
            actions
          ) : editHref ? (
            <Link
              href={editHref}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <IconPencil size={20} />
              Edit
            </Link>
          ) : null}
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
