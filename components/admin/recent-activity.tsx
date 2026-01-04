import { createClient } from '@/lib/supabase-server'

interface ActivityItem {
  id: string
  title: string
  type: 'venture' | 'log' | 'specimen'
  updated_at: string
  href: string
}

const typeLabels = {
  venture: 'Venture',
  log: 'Log Entry',
  specimen: 'Specimen',
}

const typeColors = {
  venture: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  log: 'bg-green-500/10 text-green-700 dark:text-green-400',
  specimen: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

export async function RecentActivity() {
  const supabase = await createClient()

  // Fetch recent items from all tables
  const [
    { data: ventures },
    { data: logEntries },
    { data: specimens },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('log_entries')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('specimens')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  // Combine and sort by updated_at
  const allItems: ActivityItem[] = [
    ...(ventures?.map((v) => ({
      id: v.id,
      title: v.title,
      type: 'venture' as const,
      updated_at: v.updated_at,
      href: `/admin/ventures/${v.id}/edit`,
    })) || []),
    ...(logEntries?.map((l) => ({
      id: l.id,
      title: l.title,
      type: 'log' as const,
      updated_at: l.updated_at,
      href: `/admin/log/${l.id}/edit`,
    })) || []),
    ...(specimens?.map((s) => ({
      id: s.id,
      title: s.title,
      type: 'specimen' as const,
      updated_at: s.updated_at,
      href: `/admin/specimens/${s.id}/edit`,
    })) || []),
  ]

  const recentItems = allItems
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8)

  if (recentItems.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">No activity yet. Start creating content!</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-2">
        {recentItems.map((item) => (
          <a
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.type]}`}>
                {typeLabels[item.type]}
              </span>
              <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {item.title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
              {formatDate(item.updated_at)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
