'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function UserMenu() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          {user ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {user.email?.[0].toUpperCase()}
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 rounded-lg border bg-card shadow-lg overflow-hidden">
            {user ? (
              <>
                <div className="px-3 py-2 border-b text-sm">
                  <div className="font-medium truncate">{user.email}</div>
                  {isAdmin && (
                    <div className="text-xs text-muted-foreground">Admin</div>
                  )}
                </div>
                <div className="py-1">
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </a>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="py-1">
                <a
                  href="/login"
                  className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Admin
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
