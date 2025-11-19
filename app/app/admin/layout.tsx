'use client'

/**
 * Admin Layout
 *
 * Layout wrapper for all admin pages with auth protection
 */

import { AdminRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'
import { ModeToggle } from '@/components/theme-switcher'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/admin/projects', label: 'Projects' },
    { href: '/admin/log', label: 'Log' },
    { href: '/admin/specimens', label: 'Specimens' },
    { href: '/admin/channels', label: 'Channels' },
    { href: '/admin/backlog', label: 'Backlog' },
  ]

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <a href="/admin" className="text-xl font-bold">
                  Admin
                </a>
                <nav className="hidden md:flex gap-6">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`text-sm transition-colors ${
                        isActive(item.href)
                          ? 'text-primary font-medium'
                          : 'hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View Site
                </a>
                <ModeToggle />
                {user && (
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <div className="font-medium">{user.email}</div>
                      {isAdmin && (
                        <div className="text-xs text-muted-foreground">Admin</div>
                      )}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </AdminRoute>
  )
}
