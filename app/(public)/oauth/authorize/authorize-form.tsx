'use client'

import { useState } from 'react'

interface OAuthRequestData {
  client_id: string
  redirect_uri: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

interface AuthorizeFormProps {
  oauthRequest: OAuthRequestData
  accessToken: string
  refreshToken?: string
  expiresIn: number
  userId: string
}

export function AuthorizeForm({
  oauthRequest,
  accessToken,
  refreshToken,
  expiresIn,
  userId,
}: AuthorizeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setIsLoading(true)
    setError(null)

    try {
      // Call our approval endpoint to generate the auth code
      const response = await fetch('/api/oauth/authorize/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oauth_request: oauthRequest,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Failed to approve authorization')
      }

      if (data.redirect_url) {
        // Redirect to the client's callback with the auth code
        window.location.href = data.redirect_url
      } else {
        setError('No redirect URL received')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  function handleDeny() {
    // Redirect to client with error
    const redirectUrl = new URL(oauthRequest.redirect_uri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied the authorization request')
    if (oauthRequest.state) {
      redirectUrl.searchParams.set('state', oauthRequest.state)
    }
    window.location.href = redirectUrl.toString()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDeny}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          Deny
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Approve'}
        </button>
      </div>
    </div>
  )
}
