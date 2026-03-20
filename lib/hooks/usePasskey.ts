'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'

// --- Authentication Hook (login page) ---

type AuthStatus = 'idle' | 'loading' | 'error' | 'success'

export interface PasskeyError {
  message: string
  step: 'options' | 'ceremony' | 'verify' | 'unknown'
  detail?: string
}

export function usePasskeyAuth() {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<PasskeyError | null>(null)
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
      // Step 1: Get authentication options
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options')
      const optionsJSON = await optionsRes.json()

      if (optionsJSON.error) {
        setError({ message: 'Failed to get passkey options', step: 'options', detail: optionsJSON.error })
        setStatus('error')
        return null
      }

      // Step 2: Browser ceremony
      let authResponse
      try {
        authResponse = await startAuthentication({ optionsJSON })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('cancelled') || msg.includes('abort')) {
          setStatus('idle')
          return null
        }
        setError({ message: 'Passkey ceremony failed', step: 'ceremony', detail: msg })
        setStatus('error')
        return null
      }

      // Step 3: Verify on server
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse }),
      })

      const result = await verifyRes.json()

      if (!verifyRes.ok || !result.success) {
        setError({
          message: result.error || 'Authentication failed',
          step: 'verify',
          detail: result.step ? `step=${result.step}${result.code ? ` code=${result.code}` : ''}` : undefined,
        })
        setStatus('error')
        return null
      }

      setStatus('success')
      return result.redirectTo ?? '/admin'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError({ message: msg, step: 'unknown' })
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
