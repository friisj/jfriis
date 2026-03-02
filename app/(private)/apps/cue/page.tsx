import Link from 'next/link'
import { getLatestPulseRun, getPulseItems, getRecentBriefs, getContacts } from '@/lib/studio/cue/queries'

export default async function CueDashboard() {
  const [latestRun, topItems, recentBriefs, contacts] = await Promise.all([
    getLatestPulseRun(),
    getPulseItems({ limit: 5, unreadOnly: true }),
    getRecentBriefs(3),
    getContacts(),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cue</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Personal social intelligence — Pulse &amp; Brief
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pulse section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pulse</h2>
            <Link
              href="/apps/cue/pulse"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              View all →
            </Link>
          </div>

          {latestRun ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Last run:{' '}
              {new Date(latestRun.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {latestRun.items_scored} items scored
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">No runs yet</p>
          )}

          {topItems.length > 0 ? (
            <ul className="space-y-2">
              {topItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 line-clamp-2"
                  >
                    {item.title}
                  </a>
                  {item.relevance_score !== null && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                      {Math.round(item.relevance_score * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No unread items.{' '}
              <Link href="/apps/cue/profile" className="underline">
                Add sources
              </Link>{' '}
              and run a Pulse fetch.
            </p>
          )}
        </div>

        {/* Brief section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Brief</h2>
            <Link
              href="/apps/cue/contacts"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              All contacts →
            </Link>
          </div>

          {recentBriefs.length > 0 ? (
            <ul className="space-y-3">
              {recentBriefs.map((brief) => (
                <li key={brief.id}>
                  <Link
                    href={`/apps/cue/briefs/${brief.id}`}
                    className="block hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded -mx-1 px-1 py-1"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {brief.contact?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(brief.generated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {brief.content.talking_points?.length ?? 0} talking points
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No briefs yet.{' '}
              {contacts.length > 0 ? (
                <Link href="/apps/cue/contacts" className="underline">
                  Generate one for a contact
                </Link>
              ) : (
                <Link href="/apps/cue/contacts/new" className="underline">
                  Add a contact to get started
                </Link>
              )}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
