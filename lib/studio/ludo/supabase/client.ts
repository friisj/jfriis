/**
 * Supabase Client for Ludo - re-exports jfriis browser client
 *
 * Adapts the jfriis Supabase client for use by Ludo components.
 * The jfriis project uses @supabase/ssr with createBrowserClient.
 */

import { supabase as jfriisSupabase } from '@/lib/supabase'

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return jfriisSupabase
}

/**
 * Default export - the jfriis browser client
 */
export const supabase = jfriisSupabase

/**
 * Reset client instance (no-op in jfriis; kept for API compatibility)
 */
export function resetSupabaseClient(): void {
  // No-op: jfriis client is a lazy-initialized proxy
}
