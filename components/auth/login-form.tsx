'use client'

/**
 * Login Form Component
 *
 * Magic link (passwordless) login form with optional passkey authentication
 */

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signInWithMagicLink } from '@/lib/auth'
import { usePasskeyAuth } from '@/lib/hooks/usePasskey'

export function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passkey = usePasskeyAuth()

  const handlePasskeyLogin = async () => {
    setError('')
    const redirectTo = await passkey.authenticate()
    if (redirectTo) {
      router.push(redirect ?? redirectTo)
      router.refresh()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await signInWithMagicLink(email)
      setSuccess(true)
      setEmail('')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send magic link'
      setError(message)
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
            We&apos;ve sent you a magic link. Click the link in your email to sign in.
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
    <div className="space-y-6">
      {/* Passkey authentication */}
      {passkey.isAvailable && (
        <>
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={passkey.status === 'loading'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            {passkey.status === 'loading'
              ? 'Verifying...'
              : 'Sign in with Passkey'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}

      {/* Magic link form */}
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
            autoFocus={!passkey.isAvailable}
          />
        </div>

        {/* Combined error display */}
        {(error || passkey.error) && (
          <div
            className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
            role="alert"
          >
            {error || passkey.error}
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
          No password required. We&apos;ll email you a secure link to sign in.
        </p>
      </form>
    </div>
  )
}
