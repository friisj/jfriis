import Link from 'next/link'
import { getTerms } from '@/lib/studio/verbivore/queries'
import { DeleteButton } from '@/components/studio/verbivore/delete-button'
import { deleteVerbivoreTerm } from '@/lib/studio/verbivore/actions'

export default async function TermsPage() {
  const terms = await getTerms()

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Terms</h1>
        <Link
          href="/studio/verbivore/terms/new"
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
        >
          New Term
        </Link>
      </div>

      {terms.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No terms yet.</p>
          <Link
            href="/studio/verbivore/terms/new"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Create your first term
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Term
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Definition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Entries
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/studio/verbivore/terms/${term.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {term.term}
                    </Link>
                    {term.tags && term.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {term.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-md truncate">
                    {term.definition}
                  </td>
                  <td className="px-6 py-4">
                    {term.difficulty_level && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[term.difficulty_level] || ''}`}
                      >
                        {term.difficulty_level}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {term.entry_count}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/studio/verbivore/terms/${term.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      onDelete={deleteVerbivoreTerm.bind(null, term.id)}
                      entityName="term"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
