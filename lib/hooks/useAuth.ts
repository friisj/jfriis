'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Check admin status via DB function (consistent with RLS policies)
        supabase
          .rpc('is_admin')
          .then(({ data, error }) => {
            if (error) {
              setLoading(false)
              return
            }
            setIsAdmin(data ?? false)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        supabase
          .rpc('is_admin')
          .then(({ data }) => {
            setIsAdmin(data ?? false)
            setLoading(false)
          })
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
  }
}

export function useRequireAuth(redirectTo: string = '/login') {
  const auth = useAuth()

  return auth
}
