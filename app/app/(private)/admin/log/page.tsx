import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface LogEntry {
  id: string
  title: string
  slug: string
  entry_date: string
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const typeColors = {
  experiment: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  idea: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  research: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  update: 'bg-green-500/10 text-green-700 dark:text-green-400',
}

export default async function AdminLogPage() {
  const supabase = await createClient()

  const { data: logEntries, error } = await supabase
    .from('log_entries')
    .select(`
      id,
      title,
      slug,
      entry_date,
      type,
      published,
      created_at,
      updated_at,
      log_entry_specimens (count),
      log_entry_projects (count)
    `)
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('Error fetching log entries:', error)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Log</h1>
            <p className="text-muted-foreground">
              Chronological entries, ideas, and experiments
            </p>
          </div>
          <Link
            href="/admin/log/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </Link>
        </div>

        {logEntries && logEntries.length > 0 ? (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Links</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Published</th>
                    <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logEntries.map((entry: LogEntry) => (
                    <tr key={entry.id} className="hover:bg-accent transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.title}</span>
                          <span className="text-sm text-muted-foreground">/{entry.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="px-6 py-4">
                        {entry.type ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[entry.type as keyof typeof typeColors] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'}`}>
                            {entry.type}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>{(entry as any).log_entry_specimens?.[0]?.count || 0} specimens</span>
                          <span>{(entry as any).log_entry_projects?.[0]?.count || 0} projects</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.published ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/log/${entry.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No log entries yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start documenting your journey with your first log entry
              </p>
              <Link
                href="/admin/log/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Entry
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
