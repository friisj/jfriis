import { createClient } from '@/lib/supabase-server'

interface StatCardProps {
  title: string
  count: number
  description: string
  href: string
}

function StatCard({ title, count, description, href }: StatCardProps) {
  return (
    <a
      href={href}
      className="block p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <div className="text-3xl font-bold mb-1">{count}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </a>
  )
}

export async function DashboardStats() {
  const supabase = await createClient()

  // Fetch counts from database
  const [
    { count: projectsCount },
    { count: logEntriesCount },
    { count: specimensCount },
    { count: backlogCount },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('log_entries').select('*', { count: 'exact', head: true }),
    supabase.from('specimens').select('*', { count: 'exact', head: true }),
    supabase.from('backlog_items').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Projects"
        count={projectsCount || 0}
        description="Portfolio projects"
        href="/admin/projects"
      />
      <StatCard
        title="Log Entries"
        count={logEntriesCount || 0}
        description="Chronological entries"
        href="/admin/log"
      />
      <StatCard
        title="Specimens"
        count={specimensCount || 0}
        description="Reusable components"
        href="/admin/specimens"
      />
      <StatCard
        title="Backlog"
        count={backlogCount || 0}
        description="Ideas & drafts"
        href="/admin/backlog"
      />
    </div>
  )
}
