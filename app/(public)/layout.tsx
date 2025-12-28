 'use client'

import { UserMenu } from '@/components/user-menu'
import { PageHeaderProvider, usePageHeader } from '@/components/layout/page-header-context'

function PublicHeader() {
  const { title } = usePageHeader()

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
            Jon Friis
          </span>
          {title && <span className="text-lg font-semibold leading-tight">{title}</span>}
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageHeaderProvider>
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1">{children}</main>
      </div>
    </PageHeaderProvider>
  )
}


