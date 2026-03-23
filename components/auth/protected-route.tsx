'use client'

import Link from 'next/link'
import { useRequireAuth } from '@/lib/hooks/useAuth'
import { PageLoading } from '@/components/admin/loading-states'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useRequireAuth(redirectTo)
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [loading, user, redirectTo, router])

  if (loading || !user) {
    return <PageLoading />
  }

  return <>{children}</>
}

interface AdminRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AdminRoute({ children, redirectTo = '/' }: AdminRouteProps) {
  const { user, loading, isAdmin } = useRequireAuth('/login')

  if (loading) {
    return <PageLoading />
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
