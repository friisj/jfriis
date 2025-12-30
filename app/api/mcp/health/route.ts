/**
 * MCP Health Check endpoint
 * Returns status of MCP dependencies
 */
import { createClient } from '@supabase/supabase-js'
import { kv } from '@vercel/kv'

export async function GET() {
  const checks: Record<string, boolean | null> = {
    database: false,
    cache: null, // null means not configured
  }

  // Check database connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { error } = await supabase.from('profiles').select('count').limit(1)
      checks.database = !error
    }
  } catch {
    checks.database = false
  }

  // Check KV (rate limiting) connectivity
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.ping()
      checks.cache = true
    } catch {
      checks.cache = false
    }
  }
  // If KV not configured, cache stays null (acceptable - rate limiting disabled)

  // Database is required, cache is optional
  const isHealthy = checks.database === true
  const isDegraded = checks.cache === false // KV configured but failing

  return Response.json(
    {
      status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  )
}
