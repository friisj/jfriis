'use client'

import { AdminRoute } from '@/components/auth/protected-route'
import { usePathname } from 'next/navigation'

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Editor routes bypass this layout's chrome (they have their own auth check)
  if (pathname?.includes('/editor/')) {
    return children
  }

  return <AdminRoute>{children}</AdminRoute>
}
