/**
 * OAuth Authorization Consent Page
 *
 * Shows the user what permissions are being requested and allows
 * them to approve or deny the authorization request.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuthorizeForm } from './authorize-form'

const OAUTH_COOKIE_NAME = 'oauth_request'

interface OAuthRequestData {
  client_id: string
  redirect_uri: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

export default async function AuthorizePage() {
  // Get OAuth request from cookie
  const cookieStore = await cookies()
  const oauthCookie = cookieStore.get(OAUTH_COOKIE_NAME)

  if (!oauthCookie?.value) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Request</h1>
          <p className="text-muted-foreground">No authorization request found. Please start over.</p>
        </div>
      </div>
    )
  }

  let oauthRequest: OAuthRequestData
  try {
    oauthRequest = JSON.parse(oauthCookie.value)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Request</h1>
          <p className="text-muted-foreground">Malformed authorization request.</p>
        </div>
      </div>
    )
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login, preserving the flow
    redirect('/login?redirect=/oauth/authorize')
  }

  // Get session for access token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?redirect=/oauth/authorize')
  }

  // Determine client name for display
  const clientName = getClientDisplayName(oauthRequest.client_id)

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Authorization Request</h1>
          <p className="text-muted-foreground">
            <strong>{clientName}</strong> wants to access your account
          </p>
        </div>

        <div className="border rounded-lg p-8 bg-card">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              By approving, you allow the application to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Access database tools on your behalf</li>
              <li>Read and write data based on your permissions</li>
              <li>View your email address</li>
            </ul>
          </div>

          <AuthorizeForm
            oauthRequest={oauthRequest}
            accessToken={session.access_token}
            refreshToken={session.refresh_token}
            expiresIn={session.expires_in || 3600}
            userId={user.id}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Logged in as {user.email}
        </p>
      </div>
    </div>
  )
}

function getClientDisplayName(clientId: string): string {
  // Map known client IDs to friendly names
  const knownClients: Record<string, string> = {
    'claude': 'Claude',
    'claude-desktop': 'Claude Desktop',
  }

  // Check if it looks like a UUID (Claude's client IDs)
  if (clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return 'Claude'
  }

  return knownClients[clientId.toLowerCase()] || clientId
}
