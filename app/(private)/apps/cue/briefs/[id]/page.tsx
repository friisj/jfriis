import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrief } from '@/lib/studio/cue/queries'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BriefPage({ params }: Props) {
  const { id } = await params
  const brief = await getBrief(id)

  if (!brief) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/apps/cue/contacts/${brief.contact_id}`}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ← {brief.contact?.name ?? 'Contact'}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Brief
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {new Date(brief.generated_at).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {brief.model && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">· {brief.model}</span>
            )}
          </p>
        </div>
      </div>

      {brief.content.overlap_summary && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {brief.content.overlap_summary}
          </p>
        </div>
      )}

      {brief.content.talking_points?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Talking Points
          </h2>
          <ul className="space-y-3">
            {brief.content.talking_points.map((tp, i) => (
              <li
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {tp.topic}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          tp.confidence === 'high'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : tp.confidence === 'medium'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {tp.confidence}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{tp.point}</p>
                    {tp.source_url && (
                      <a
                        href={tp.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 mt-1 block truncate"
                      >
                        {tp.source_title ?? tp.source_url}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
