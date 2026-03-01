import Link from 'next/link'
import type { ArenaSessionWithSkills } from '@/lib/studio/arena/db-types'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  abandoned: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

interface SessionCardProps {
  session: ArenaSessionWithSkills
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link
      href={`/apps/arena/sessions/${session.id}`}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow block"
    >
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {session.input_skill?.name ?? 'Unknown Skill'}
      </h3>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className={`px-2 py-0.5 rounded ${statusColors[session.status] ?? statusColors.abandoned}`}>
          {session.status}
        </span>
        <span>{session.round_count} round{session.round_count !== 1 ? 's' : ''}</span>
        <span>{new Date(session.updated_at).toLocaleDateString()}</span>
      </div>
      {session.notes && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-1">
          {session.notes}
        </p>
      )}
    </Link>
  )
}
