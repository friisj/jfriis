'use client'

/**
 * useAuth Hook
 *
 * React hook for managing authentication state
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import type { AuthUser } from '../auth'
import { getUser } from '../auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    getUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = await getUser()
        setUser(userData)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
  }
}

/**
 * Hook that redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return { user, loading }
}

/**
 * Hook that requires admin access
 */
export function useRequireAdmin(redirectTo: string = '/') {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push(redirectTo)
    }
  }, [user, loading, isAdmin, router, redirectTo])

  return { user, loading, isAdmin }
}
