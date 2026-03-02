import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContact, getBriefs } from '@/lib/studio/cue/queries'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContactPage({ params }: Props) {
  const { id } = await params
  const [contact, briefs] = await Promise.all([
    getContact(id),
    getBriefs(id),
  ])

  if (!contact) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {contact.name}
          </h1>
          {contact.relationship && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {contact.relationship}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/apps/cue/contacts/${id}/edit`}
            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Edit
          </Link>
          <button
            disabled
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md opacity-50 cursor-not-allowed"
            title="Brief generation coming in Phase 4"
          >
            Generate Brief
          </button>
        </div>
      </div>

      {contact.notes && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {contact.notes}
          </p>
        </div>
      )}

      {contact.topics && contact.topics.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {contact.topics.map((t) => (
              <span
                key={t.id}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 rounded"
              >
                {t.topic}{' '}
                <span className="text-slate-400 dark:text-slate-500">
                  {Math.round(t.weight * 100)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Briefs
        </h2>
        {briefs.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No briefs yet. Generate a brief before your next conversation.
          </p>
        ) : (
          <ul className="space-y-2">
            {briefs.map((brief) => (
              <li key={brief.id}>
                <Link
                  href={`/apps/cue/briefs/${brief.id}`}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(brief.generated_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {brief.content.talking_points?.length ?? 0} talking points →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
