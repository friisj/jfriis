'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConsentFormProps {
  authorizationId: string
  userEmail?: string
}

export function ConsentForm({ authorizationId, userEmail }: ConsentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/oauth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization_id: authorizationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve authorization')
      }

      if (data.redirect_to) {
        // Redirect to the OAuth callback URL
        window.location.href = data.redirect_to
      } else {
        setError('No redirect URL received')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  async function handleDeny() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/oauth/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization_id: authorizationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deny authorization')
      }

      if (data.redirect_to) {
        window.location.href = data.redirect_to
      } else {
        // If no redirect, just go home
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
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
