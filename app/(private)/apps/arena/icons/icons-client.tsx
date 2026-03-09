'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'

type Tab = 'tabler' | 'lucide' | 'phosphor'
type IconEntry = [string, React.ComponentType<{ size?: number; className?: string }>]

const TAB_LABELS: Record<Tab, string> = {
  tabler: 'Tabler',
  lucide: 'Lucide',
  phosphor: 'Phosphor',
}

export function IconsClient() {
  const [tab, setTab] = useState<Tab>('tabler')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [iconSets, setIconSets] = useState<Record<Tab, IconEntry[]>>({
    tabler: [],
    lucide: [],
    phosphor: [],
  })
  const [loading, setLoading] = useState(true)

  // Lazy-load Tabler on mount (default tab)
  useEffect(() => {
    import('@tabler/icons-react').then((mod) => {
      const entries = Object.entries(mod).filter(
        ([name, val]) => typeof val === 'function' && name.startsWith('Icon') && name !== 'IconContext'
      ) as IconEntry[]
      setIconSets((prev) => ({ ...prev, tabler: entries }))
      setLoading(false)
    })
  }, [])

  // Lazy-load other sets on tab switch
  useEffect(() => {
    if (tab === 'tabler') return
    if (iconSets[tab].length > 0) return
    setLoading(true)

    if (tab === 'lucide') {
      import('lucide-react').then((mod) => {
        const entries = Object.entries(mod.icons) as IconEntry[]
        setIconSets((prev) => ({ ...prev, lucide: entries }))
        setLoading(false)
      })
    } else if (tab === 'phosphor') {
      import('@phosphor-icons/react').then((mod) => {
        const entries = Object.entries(mod).filter(
          ([name, val]) => typeof val === 'function' && /^[A-Z]/.test(name) && name !== 'IconContext'
        ) as IconEntry[]
        setIconSets((prev) => ({ ...prev, phosphor: entries }))
        setLoading(false)
      })
    }
  }, [tab, iconSets])

  const allEntries = iconSets[tab]

  const filtered = useMemo(() => {
    if (!search) return allEntries
    const q = search.toLowerCase()
    return allEntries.filter(([name]) => name.toLowerCase().includes(q))
  }, [search, allEntries])

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
          {(['tabler', 'lucide', 'phosphor'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch('') }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${TAB_LABELS[tab]} icons...`}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {filtered.length} / {allEntries.length}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
          Loading icons...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
          No icons match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {filtered.map(([name, Icon]) => (
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
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
}
