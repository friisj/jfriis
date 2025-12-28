/**
 * OAuth Denial Endpoint
 *
 * Denies an OAuth authorization request via Supabase OAuth Server.
 */
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { authorization_id } = await request.json()

    if (!authorization_id) {
      return Response.json(
        { error: 'Missing authorization_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call Supabase OAuth Server to deny the authorization
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return Response.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    const denyResponse = await fetch(
      `${supabaseUrl}/auth/v1/oauth/deny`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ authorization_id }),
      }
    )

    if (!denyResponse.ok) {
      const errorData = await denyResponse.json().catch(() => ({}))
      console.error('OAuth deny error:', errorData)
      return Response.json(
        { error: errorData.message || 'Failed to deny authorization' },
        { status: denyResponse.status }
      )
    }

    const data = await denyResponse.json()

    return Response.json({
      redirect_to: data.redirect_to,
    })
  } catch (error) {
    console.error('OAuth deny error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
