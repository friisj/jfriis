import Link from 'next/link'
import { getSessions } from '@/lib/studio/arena/queries'
import { SessionCard } from '@/components/studio/arena/session-card'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function SessionsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const sessions = await getSessions({
    status: status || undefined,
  })

  const statuses = ['active', 'completed', 'abandoned'] as const

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sessions</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gym refinement sessions
          </p>
        </div>
        <Link
          href="/apps/arena/sessions/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          New Session
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Link
          href="/apps/arena/sessions"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !status
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/apps/arena/sessions?status=${s}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              status === s
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">No sessions found.</p>
          <Link
            href="/apps/arena/sessions/new"
            className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
          >
            Start a new session
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
