import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types/database'

// Lazy initialize the Supabase client to avoid errors during build-time prerender
let _supabase: ReturnType<typeof createBrowserClient<Database>> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock that throws on actual method calls
        // This allows the module to load during prerender without crashing
        throw new Error('Supabase client not available - missing env vars')
      }

      _supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    }
    return (_supabase as unknown as Record<string, unknown>)[prop as string]
  }
})
