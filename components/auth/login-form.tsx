'use client'

/**
 * Login Form Component
 *
 * Magic link (passwordless) login form
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithMagicLink } from '@/lib/auth'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await signInWithMagicLink(email)
      setSuccess(true)
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
            Check your email!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-500">
            We've sent you a magic link. Click the link in your email to sign in.
          </p>
        </div>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="you@example.com"
          disabled={loading}
          autoFocus
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Sending magic link...' : 'Send Magic Link'}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        No password required. We'll email you a secure link to sign in.
      </p>
    </form>
  )
}
