'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'

// --- Authentication Hook (login page) ---

type AuthStatus = 'idle' | 'loading' | 'error' | 'success'

export function usePasskeyAuth() {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return

    // Check if there are any registered passkeys by fetching options
    fetch('/api/auth/passkey/authenticate/options')
      .then((res) => res.json())
      .then((data) => {
        if (data.allowCredentials && data.allowCredentials.length > 0) {
          setIsAvailable(true)
          setHasCredentials(true)
        } else if (!data.error) {
          // WebAuthn supported but no credentials registered
          setIsAvailable(false)
          setHasCredentials(false)
        }
      })
      .catch(() => {
        // Silently fail — passkey button just won't appear
      })
  }, [])

  const authenticate = useCallback(async (): Promise<string | null> => {
    setStatus('loading')
    setError(null)

    try {
      // Get authentication options
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options')
      const optionsJSON = await optionsRes.json()

      if (optionsJSON.error) {
        throw new Error(optionsJSON.error)
      }

      // Start the browser ceremony
      const authResponse = await startAuthentication({ optionsJSON })

      // Verify on server
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse }),
      })

      const result = await verifyRes.json()

      if (!verifyRes.ok || !result.success) {
        throw new Error(result.error || 'Authentication failed')
      }

      setStatus('success')
      return result.redirectTo ?? '/admin'
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed'
      // Don't show error for user-cancelled ceremonies
      if (message.includes('cancelled') || message.includes('abort')) {
        setStatus('idle')
        return null
      }
      setError(message)
      setStatus('error')
      return null
    }
  }, [])

  return {
    status,
    error,
    isAvailable: isAvailable && hasCredentials,
    authenticate,
  }
}

// --- Registration Hook (admin settings) ---

export interface PasskeyCredential {
  id: string
  name: string | null
  device_type: string
  backed_up: boolean
  transports: string[]
  created_at: string
  last_used_at: string | null
}

export function usePasskeyManagement() {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/passkey/credentials')
      const data = await res.json()
      if (data.credentials) {
        setCredentials(data.credentials)
      }
    } catch {
      // Silently fail on refresh
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const register = useCallback(
    async (name?: string) => {
      setRegistering(true)
      setError(null)

      try {
        // Get registration options
        const optionsRes = await fetch('/api/auth/passkey/register/options')
        const optionsJSON = await optionsRes.json()

        if (optionsJSON.error) {
          throw new Error(optionsJSON.error)
        }

        // Start the browser ceremony
        const regResponse = await startRegistration({ optionsJSON })

        // Verify on server
        const verifyRes = await fetch('/api/auth/passkey/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: regResponse, name }),
        })

        const result = await verifyRes.json()

        if (!verifyRes.ok || !result.success) {
          throw new Error(result.error || 'Registration failed')
        }

        await refresh()
        return true
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Registration failed'
        if (!message.includes('cancelled') && !message.includes('abort')) {
          setError(message)
        }
        return false
      } finally {
        setRegistering(false)
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (credentialId: string) => {
      setError(null)
      try {
        const res = await fetch(
          `/api/auth/passkey/credentials/${encodeURIComponent(credentialId)}`,
          { method: 'DELETE' }
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to remove passkey')
        }
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove passkey'
        setError(message)
      }
    },
    [refresh]
  )

  const rename = useCallback(
    async (credentialId: string, newName: string) => {
      setError(null)
      try {
        const res = await fetch(
          `/api/auth/passkey/credentials/${encodeURIComponent(credentialId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          }
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to rename passkey')
        }
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to rename passkey'
        setError(message)
      }
    },
    [refresh]
  )

  return {
    credentials,
    loading,
    error,
    registering,
    register,
    remove,
    rename,
    refresh,
  }
}
