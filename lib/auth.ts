/**
 * Authentication Utilities
 *
 * Helper functions for Supabase authentication
 */

import { supabase } from './supabase'

/**
 * Sign in with magic link (passwordless)
 * Supabase handles the redirect automatically after clicking the link
 */
export async function signInWithMagicLink(email: string, redirectTo: string = '/admin') {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Redirect to auth callback which exchanges code for session,
      // then redirects to the intended destination
      emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

