import { getProfile, getTopics, getSources } from '@/lib/studio/cue/queries'
import Link from 'next/link'

export default async function ProfilePage() {
  const [profile, topics, sources] = await Promise.all([
    getProfile(),
    getTopics(),
    getSources(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>

      {/* Interest profile */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Interest Topics
          </h2>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          {topics.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No topics seeded yet. Topics will be added in Phase 2.
            </p>
          ) : profile?.topics && profile.topics.length > 0 ? (
            <div className="space-y-2">
              {profile.topics.map((tw) => {
                const topic = topics.find((t) => t.id === tw.topic_id)
                return (
                  <div key={tw.topic_id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {topic?.name ?? tw.topic_id}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {Math.round(tw.weight * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Interest profile not configured. Profile editor coming in Phase 2.
            </p>
          )}
        </div>
      </section>

      {/* Sources */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            RSS Sources
          </h2>
          <Link
            href="/apps/cue/profile/sources"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Manage →
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          {sources.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No sources added yet. Source management coming in Phase 5.
            </p>
          ) : (
            <ul className="space-y-2">
              {sources.map((source) => (
                <li key={source.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {source.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">
                      {source.url}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      source.is_active
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {source.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
