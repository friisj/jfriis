import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession, getSessionIterations, getSessionFeedback, getSessionAnnotations, getProjectAssembly, getSessionComponents } from '@/lib/studio/arena/queries'
import { SessionActiveClient } from './session-active-client'
import { SessionReviewClient } from './session-review-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession(id)
  if (!session) notFound()

  // Active session → show gym UI
  if (session.status === 'active') {
    // Load project assembly and session components in parallel
    const [assembly, sessionComponents] = await Promise.all([
      session.project_id ? getProjectAssembly(session.project_id) : Promise.resolve([]),
      getSessionComponents(id),
    ])
    return <SessionActiveClient session={session} assembly={assembly} sessionComponents={sessionComponents} />
  }

  // Completed/abandoned → show round-by-round review
  const [iterations, feedback, annotations] = await Promise.all([
    getSessionIterations(id),
    getSessionFeedback(id),
    getSessionAnnotations(id),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          {session.project_id ? (
            <>
              <Link href={`/apps/arena/projects/${session.project_id}`} className="hover:text-slate-700 dark:hover:text-slate-200">
                {session.project?.name ?? 'Project'}
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link href="/apps/arena" className="hover:text-slate-700 dark:hover:text-slate-200">
                Projects
              </Link>
              <span>/</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {session.input_skill?.name ?? 'Session'} — {session.status}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{session.round_count} round{session.round_count !== 1 ? 's' : ''}</span>
          <span>Started {new Date(session.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Input Skill</h2>
          {session.input_skill ? (
            <Link
              href={`/apps/arena/skills/${session.input_skill.id}`}
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              {session.input_skill.name}
            </Link>
          ) : (
            <span className="text-sm text-slate-400">Unknown</span>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Output Skill</h2>
          {session.output_skill ? (
            <Link
              href={`/apps/arena/skills/${session.output_skill.id}`}
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              {session.output_skill.name}
            </Link>
          ) : (
            <span className="text-sm text-slate-400">
              {session.status === 'abandoned' ? 'Abandoned' : 'None'}
            </span>
          )}
        </div>
      </div>

      {session.notes && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{session.notes}</p>
        </div>
      )}

      {/* Round-by-round review */}
      <SessionReviewClient
        iterations={iterations}
        feedback={feedback}
        annotations={annotations}
      />
    </div>
  )
}
