 'use client'

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


  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <AdminRoute>
      <div className="flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </AdminRoute>
  )
}


