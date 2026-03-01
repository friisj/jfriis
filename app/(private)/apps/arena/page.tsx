import Link from 'next/link'
import { getArenaCounts } from '@/lib/studio/arena/queries'

export default async function ArenaDashboard() {
  const counts = await getArenaCounts()

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Arena</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Design skill extraction, refinement, and training
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-blue-600">{counts.projects}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Projects</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-purple-600">{counts.skills}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Skills</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-green-600">{counts.sessions}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Sessions</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-orange-600">{counts.activeSessions}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active Sessions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/apps/arena/projects/new"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Project</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Add a Figma file or design system as an import source
          </p>
        </Link>
        <Link
          href="/apps/arena/skills"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Browse Skills</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            View all extracted and refined design skills
          </p>
        </Link>
        <Link
          href="/apps/arena/sessions/new"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Session</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Start a gym session to refine a skill with AI feedback
          </p>
        </Link>
      </div>
    </div>
  )
}
