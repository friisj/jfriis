'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/user-menu'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function PrivateHeader() {
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

  return (
    <header className="border-b bg-card flex items-center justify-between">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground h-10 px-3">
          <Link href="/admin" className="hover:text-foreground">
            JF
          </Link>
          {segments.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              <span>/</span>
              {index === segments.length - 1 ? (
                <span className="text-foreground">
                  {formatSegment(segment, index)}
                </span>
              ) : (
                <Link
                  href={buildHref(index)}
                  className="hover:text-foreground"
                >
                  {formatSegment(segment, index)}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  )
}

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <PrivateHeader />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}



