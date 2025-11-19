/**
 * Authentication Utilities
 *
 * Helper functions for Supabase authentication
 */

import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  isAdmin?: boolean
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
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

/**
 * Get current user session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

/**
 * Get current user
 */
export async function getUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return null
  }

  // Also fetch profile to check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single()

  return {
    id: data.user.id,
    email: data.user.email || '',
    isAdmin: profile?.is_admin || false,
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser()
  return user?.isAdmin || false
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    throw error
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw error
  }
}
