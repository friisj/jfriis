'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/user-menu'
import { PrivateHeaderProvider, usePrivateHeader } from '@/components/layout/private-header-context'
import { PrivacyModeProvider } from '@/lib/privacy-mode'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { IconMenu2 } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function PrivateHeader() {
  const { hidden, actions, hardNavigation, mobileNav } = usePrivateHeader()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)

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

  if (hidden) return null

  const lastSegment = segments.length > 0
    ? formatSegment(segments[segments.length - 1], segments.length - 1)
    : 'Home'

  const NavLink = hardNavigation ? 'a' : Link

  return (
    <>
      <header className="border-b bg-card flex items-center justify-between">
        {/* Desktop breadcrumbs */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground h-10 px-3">
            <NavLink href="/" className="hover:text-foreground">JF</NavLink>
            {segments.map((segment, index) => (
              <span key={index} className="flex items-center gap-1">
                <span>/</span>
                {index === segments.length - 1 ? (
                  <span className="text-foreground">
                    {formatSegment(segment, index)}
                  </span>
                ) : (
                  <NavLink href={buildHref(index)} className="hover:text-foreground">
                    {formatSegment(segment, index)}
                  </NavLink>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Mobile: hamburger + current page */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center justify-center h-10 w-10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <IconMenu2 size={18} />
          </button>
          <span className="text-xs font-medium truncate max-w-[160px]">
            {lastSegment}
          </span>
        </div>

        {/* Right side: actions + user menu (both viewports) */}
        <div className="flex items-center h-10 border-l border-border divide-x divide-border">
          {actions}
          <UserMenu />
        </div>
      </header>

      {/* Mobile navigation sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>

          {/* Breadcrumb trail */}
          <nav className="flex flex-col border-b">
            <NavLink
              href="/"
              onClick={() => setSheetOpen(false)}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Home
            </NavLink>
            {segments.map((segment, index) => (
              <NavLink
                key={buildHref(index)}
                href={buildHref(index)}
                onClick={() => setSheetOpen(false)}
                className={`px-4 py-2.5 text-sm transition-colors ${
                  index === segments.length - 1
                    ? 'font-medium text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                style={{ paddingLeft: `${(index + 2) * 12}px` }}
              >
                {formatSegment(segment, index)}
              </NavLink>
            ))}
          </nav>

          {/* Injected mobile nav (e.g., Luv sidebar) */}
          {mobileNav && (
            <div className="flex-1 overflow-y-auto" onClick={() => setSheetOpen(false)}>
              {mobileNav}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PrivacyModeProvider>
        <PrivateHeaderProvider>
          <div className="min-h-screen flex flex-col h-dvh">
            <PrivateHeader />
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {children}
            </main>
          </div>
        </PrivateHeaderProvider>
      </PrivacyModeProvider>
    </ProtectedRoute>
  )
}
