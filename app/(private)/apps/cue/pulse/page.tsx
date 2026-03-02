import Link from 'next/link'
import { getPulseItems, getLatestPulseRun } from '@/lib/studio/cue/queries'

export default async function PulsePage() {
  const [items, latestRun] = await Promise.all([
    getPulseItems({ limit: 100 }),
    getLatestPulseRun(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pulse</h1>
          {latestRun && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Last fetched{' '}
              {new Date(latestRun.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {latestRun.items_scored} items
            </p>
          )}
        </div>
        <button
          disabled
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md opacity-50 cursor-not-allowed"
          title="Pulse fetch coming in Phase 3"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">No items yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            <Link href="/apps/cue/profile" className="underline">
              Add RSS sources
            </Link>{' '}
            and run a Pulse fetch to populate the feed.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 ${
                item.is_read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {item.source && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {item.source.name}
                      </span>
                    )}
                    {item.published_at && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(item.published_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {item.topics.length > 0 && (
                      <div className="flex gap-1">
                        {item.topics.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {item.relevance_score !== null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {Math.round(item.relevance_score * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
