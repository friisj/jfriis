/**
 * AI API Authentication
 *
 * Simple authentication helper for AI generation endpoints.
 * Uses Supabase session cookies for authentication.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/supabase'

export interface AuthUser {
  id: string
  email?: string
}

export interface AuthResult {
  user: AuthUser | null
  error: string | null
}

/**
 * Validate the current user from cookies.
 * Returns user if authenticated, error otherwise.
 */
export async function validateAuth(): Promise<AuthResult> {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        user: null,
        error: error?.message || 'Not authenticated',
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    }
  } catch (error) {
    console.error('[ai:auth] Authentication error:', error)
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

/**
 * Check if user is authenticated and return 401 response if not.
 * Returns null if authenticated, NextResponse if not authenticated.
 */
export async function requireAuth() {
  const { user, error } = await validateAuth()

  if (!user) {
    return {
      user: null,
      error,
    }
  }

  return {
    user,
    error: null,
  }
}
