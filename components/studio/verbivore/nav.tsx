'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/apps/verbivore', label: 'Dashboard', exact: true },
  { href: '/apps/verbivore/entries', label: 'Entries' },
  { href: '/apps/verbivore/terms', label: 'Terms' },
  { href: '/apps/verbivore/style-guides', label: 'Style Guides' },
]

export function VerbivoreNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-1">
            <Link
              href="/studio"
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mr-2"
            >
              Studio
            </Link>
            <span className="text-slate-300 dark:text-slate-600 mr-2">/</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mr-6">
              Verbivore
            </span>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
