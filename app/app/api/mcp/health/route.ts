/**
 * MCP Health Check endpoint
 * Returns status of MCP dependencies
 */
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks: Record<string, boolean> = {
    database: false,
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

  const allHealthy = Object.values(checks).every(Boolean)

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  )
}
