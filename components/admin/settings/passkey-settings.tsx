'use client'

import { useState } from 'react'
import {
  usePasskeyManagement,
  type PasskeyCredential,
} from '@/lib/hooks/usePasskey'

export function PasskeySettings() {
  const {
    credentials,
    loading,
    error,
    registering,
    register,
    remove,
    rename,
  } = usePasskeyManagement()

  const [registerName, setRegisterName] = useState('')
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  const handleRegister = async () => {
    const success = await register(registerName.trim() || undefined)
    if (success) {
      setRegisterName('')
      setShowRegisterForm(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Passkeys Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Passkeys</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with biometrics instead of email magic links
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading passkeys...
          </div>
        ) : (
          <>
            {credentials.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {credentials.map((credential) => (
                  <PasskeyRow
                    key={credential.id}
                    credential={credential}
                    onRemove={() => remove(credential.id)}
                    onRename={(name) => rename(credential.id, name)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border rounded-lg border-dashed">
                <p className="text-muted-foreground mb-1">
                  No passkeys registered
                </p>
                <p className="text-sm text-muted-foreground">
                  Add a passkey to sign in with Touch ID, Face ID, or a
                  security key
                </p>
              </div>
            )}

            {/* Register New Passkey */}
            <div className="mt-4">
              {showRegisterForm ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Passkey name (e.g., MacBook Pro)"
                    className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={registering}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRegister()
                      if (e.key === 'Escape') setShowRegisterForm(false)
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </button>
                  <button
                    onClick={() => setShowRegisterForm(false)}
                    disabled={registering}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Register New Passkey
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* Magic Link Section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Magic Link</h2>
        <p className="text-sm text-muted-foreground">
          Email-based login is always available as a fallback method.
        </p>
      </section>
    </div>
  )
}

// --- Passkey Row Component ---

function PasskeyRow({
  credential,
  onRemove,
  onRename,
}: {
  credential: PasskeyCredential
  onRemove: () => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(credential.name ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayName = credential.name || 'Unnamed passkey'
  const deviceLabel =
    credential.device_type === 'multiDevice' ? 'Synced' : 'Device-bound'
  const createdAt = new Date(credential.created_at).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
  const lastUsed = credential.last_used_at
    ? formatRelativeTime(new Date(credential.last_used_at))
    : 'Never used'

  const handleRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== credential.name) {
      onRename(trimmed)
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="px-2 py-1 border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {deviceLabel}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Registered {createdAt} · {lastUsed}
        </p>
      </div>

      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={() => {
            setEditName(credential.name ?? '')
            setEditing(true)
          }}
          className="px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
        >
          Rename
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onRemove}
              className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-2 py-1 text-xs rounded text-destructive hover:bg-destructive/10 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
