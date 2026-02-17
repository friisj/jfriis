import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export default async function VerbivoreDashboard() {
  const supabase = await createClient()

  const [entriesResult, termsResult, guidesResult] = await Promise.all([
    supabase.from('verbivore_entries').select('id, status', { count: 'exact' }),
    supabase.from('verbivore_terms').select('id', { count: 'exact' }),
    supabase.from('verbivore_style_guides').select('id', { count: 'exact' }),
  ])

  const entryCount = entriesResult.count ?? 0
  const liveCount = (entriesResult.data ?? []).filter((e) => e.status === 'live').length
  const termCount = termsResult.count ?? 0
  const guideCount = guidesResult.count ?? 0

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Verbivore</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          AI-assisted glossary publishing platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-blue-600">{entryCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Entries</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-green-600">{liveCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Live Entries</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-purple-600">{termCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Terms</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <div className="text-2xl font-bold text-orange-600">{guideCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Style Guides</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/apps/verbivore/entries/new"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Entry</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create a new glossary entry with AI-assisted content
          </p>
        </Link>
        <Link
          href="/apps/verbivore/terms/new"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Term</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Add a term with AI-generated definition and metadata
          </p>
        </Link>
        <Link
          href="/apps/verbivore/style-guides/new"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            New Style Guide
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create an AI writing style for content generation
          </p>
        </Link>
      </div>
    </div>
  )
}
