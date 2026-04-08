'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ModeToggle } from '@/components/theme-switcher'
import { usePrivacyMode } from '@/lib/privacy-mode'
import { IconChevronDown, IconMenu2 } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 h-10 hover:bg-accent transition-colors outline-none">
          {user ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {user.email?.[0].toUpperCase()}
              </div>
              <IconChevronDown size={16} strokeWidth={1.5} />
            </>
          ) : (
            <IconMenu2 size={20} />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {user ? (
          <>
            <div className="px-2 py-1.5 text-sm">
              <div className="font-medium truncate">{user.email}</div>
              {isAdmin && (
                <div className="text-xs text-muted-foreground">Admin</div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">Preview</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin Dashboard</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleSignOut}>
              Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Theme</span>
              <ModeToggle />
            </div>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Privacy Mode</span>
                  <button
                    onClick={togglePrivacyMode}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
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
              </>
            )}
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login">Admin</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Theme</span>
              <ModeToggle />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
