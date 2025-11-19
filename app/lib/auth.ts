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
export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
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

