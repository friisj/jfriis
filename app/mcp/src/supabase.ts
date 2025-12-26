import { createClient } from '@supabase/supabase-js'

// Support both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

// Prefer service role key for admin access, fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ variants)'
  )
}

// Warn if using anon key instead of service role
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Warning: Using anon key. Some operations may fail due to RLS. Set SUPABASE_SERVICE_ROLE_KEY for full access.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
