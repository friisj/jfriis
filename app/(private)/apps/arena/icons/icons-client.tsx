'use client'

import { useState, useMemo, useCallback } from 'react'
import { icons as lucideIcons } from 'lucide-react'
import * as PhosphorIcons from '@phosphor-icons/react'

type Tab = 'lucide' | 'phosphor'

// Build Phosphor icon entries — filter to actual icon components (PascalCase, function)
const phosphorEntries = Object.entries(PhosphorIcons).filter(
  ([name, val]) => typeof val === 'function' && /^[A-Z]/.test(name) && name !== 'IconContext'
) as [string, React.ComponentType<{ size?: number; className?: string }>][]

const lucideEntries = Object.entries(lucideIcons) as [
  string,
  React.ComponentType<{ size?: number; className?: string }>,
][]

export function IconsClient() {
  const [tab, setTab] = useState<Tab>('lucide')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const filteredLucide = useMemo(() => {
    if (!search) return lucideEntries
    const q = search.toLowerCase()
    return lucideEntries.filter(([name]) => name.toLowerCase().includes(q))
  }, [search])

  const filteredPhosphor = useMemo(() => {
    if (!search) return phosphorEntries
    const q = search.toLowerCase()
    return phosphorEntries.filter(([name]) => name.toLowerCase().includes(q))
  }, [search])

  const entries = tab === 'lucide' ? filteredLucide : filteredPhosphor
  const totalCount = tab === 'lucide' ? lucideEntries.length : phosphorEntries.length

  const handleCopy = useCallback((name: string) => {
    navigator.clipboard.writeText(name)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {(['lucide', 'phosphor'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch('') }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t === 'lucide' ? 'Lucide' : 'Phosphor'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab === 'lucide' ? 'Lucide' : 'Phosphor'} icons...`}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {entries.length} / {totalCount}
        </span>
      </div>

      {/* Grid */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
          No icons match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {entries.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => handleCopy(name)}
              title={name}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group relative"
            >
              <Icon size={24} className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" />
              <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate w-full text-center leading-tight">
                {formatIconName(name)}
              </span>
              {copied === name && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] rounded whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatIconName(name: string): string {
  // Convert PascalCase to kebab-like display: ArrowRight -> Arrow Right
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
}
