'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/user-menu'
import { PrivateHeaderProvider, usePrivateHeader } from '@/components/layout/private-header-context'
import { PrivacyModeProvider } from '@/lib/privacy-mode'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function PrivateHeader() {
  const { hidden } = usePrivateHeader()
  const pathname = usePathname()

  const segments = pathname
    .split('/')
    .filter(Boolean)

  const buildHref = (index: number) => {
    const parts = segments.slice(0, index + 1)
    return `/${parts.join('/')}`
  }

  const formatSegment = (segment: string, index: number) => {
    if (index === 0) {
      if (segment === 'admin') return 'Admin'
      if (segment === 'studio') return 'Studio'
    }
    return segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const { actions, hardNavigation } = usePrivateHeader()

  if (hidden) return null

  return (
    <header className="border-b bg-card flex items-center justify-between">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground h-10 px-3">
          {hardNavigation ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional hard navigation for WebGL pages
            <a href="/" className="hover:text-foreground">JF</a>
          ) : (
            <Link href="/" className="hover:text-foreground">JF</Link>
          )}
          {segments.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              <span>/</span>
              {index === segments.length - 1 ? (
                <span className="text-foreground">
                  {formatSegment(segment, index)}
                </span>
              ) : hardNavigation ? (
                <a href={buildHref(index)} className="hover:text-foreground">
                  {formatSegment(segment, index)}
                </a>
              ) : (
                <Link href={buildHref(index)} className="hover:text-foreground">
                  {formatSegment(segment, index)}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center h-10 border-l border-border divide-x divide-border">
        {actions}
        <UserMenu />
      </div>
    </header>
  )
}

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PrivacyModeProvider>
        <PrivateHeaderProvider>
          <div className="min-h-screen flex flex-col">
            <PrivateHeader />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </div>
        </PrivateHeaderProvider>
      </PrivacyModeProvider>
    </ProtectedRoute>
  )
}



