'use client'

import { AdminRoute } from '@/components/auth/protected-route'
import { ModeToggle } from '@/components/theme-switcher'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function DemoHeader() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const slug = segments.length > 1 ? segments[segments.length - 1] : null

  const formatSlug = (s: string) =>
    s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-10 px-3 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/demo" className="hover:text-foreground">
          Demos
        </Link>
        {slug && (
          <>
            <span>/</span>
            <span className="text-foreground">{formatSlug(slug)}</span>
          </>
        )}
      </nav>
      <ModeToggle />
    </header>
  )
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <DemoHeader />
        <main className="flex-1 flex flex-col pt-10">
          {children}
        </main>
      </div>
    </AdminRoute>
  )
}
