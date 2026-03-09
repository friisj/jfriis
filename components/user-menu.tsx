'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { ModeToggle } from '@/components/theme-switcher'
import { usePrivacyMode } from '@/lib/privacy-mode'
import { IconChevronDown, IconMenu2 } from '@tabler/icons-react'

export function UserMenu() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 h-10 bg-card hover:bg-accent transition-colors"
        >
          {user ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {user.email?.[0].toUpperCase()}
              </div>
              <IconChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </>
          ) : (
            <>
              <IconMenu2 size={20} />
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg overflow-hidden">
            {user ? (
              <>
                <div className="px-3 py-2 border-b text-sm">
                  <div className="font-medium truncate">{user.email}</div>
                  {isAdmin && (
                    <div className="text-xs text-muted-foreground">Admin</div>
                  )}
                </div>
                <div className="py-1">
                  <Link
                    href="/"
                    className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Preview
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    Log out
                  </button>
                </div>

                <div className="border-t px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Theme</span>
                  <ModeToggle />
                </div>

                {isAdmin && (
                  <div className="border-t px-3 py-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Privacy Mode</span>
                    <button
                      onClick={togglePrivacyMode}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isPrivacyMode ? 'bg-primary' : 'bg-muted'
                      }`}
                      aria-label="Toggle privacy mode"
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          isPrivacyMode ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="py-1">
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                </div>

                <div className="border-t px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Theme</span>
                  <ModeToggle />
                </div>
              </>
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
