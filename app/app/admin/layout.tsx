'use client'

/**
 * Admin Layout
 *
 * Layout wrapper for all admin pages with auth protection
 */

import { AdminRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ModeToggle } from '@/components/theme-switcher'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

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
                  <a
                    href="/admin/projects"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Projects
                  </a>
                  <a
                    href="/admin/log"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Log
                  </a>
                  <a
                    href="/admin/specimens"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Specimens
                  </a>
                  <a
                    href="/admin/channels"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Channels
                  </a>
                  <a
                    href="/admin/backlog"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    Backlog
                  </a>
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
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <div className="font-medium">{user?.email}</div>
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
