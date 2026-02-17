import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { DeleteButton } from '@/components/studio/verbivore/delete-button'
import { deleteVerbivoreEntry } from '@/lib/studio/verbivore/actions'

export default async function EntriesPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('verbivore_entries')
    .select('id, title, slug, excerpt, status, featured, created_at, updated_at, verbivore_categories(name, color), verbivore_entry_terms(id)')
    .order('updated_at', { ascending: false })

  const formattedEntries = (entries ?? []).map((entry) => ({
    ...entry,
    category: Array.isArray(entry.verbivore_categories)
      ? entry.verbivore_categories[0]
      : entry.verbivore_categories,
    term_count: (entry.verbivore_entry_terms ?? []).length,
  }))

  const statusColors: Record<string, string> = {
    live: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    archived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Entries</h1>
        <Link
          href="/apps/verbivore/entries/new"
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
        >
          New Entry
        </Link>
      </div>

      {formattedEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No entries yet.</p>
          <Link
            href="/apps/verbivore/entries/new"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Create your first entry
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Terms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {formattedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/apps/verbivore/entries/${entry.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {entry.title}
                    </Link>
                    {entry.featured && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.status] || statusColors.draft}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {entry.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {entry.term_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {new Date(entry.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/apps/verbivore/entries/${entry.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                    {entry.term_count > 5 && (
                      <Link
                        href={`/apps/verbivore/entries/${entry.id}/split`}
                        className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700"
                      >
                        Split
                      </Link>
                    )}
                    <DeleteButton
                      onDelete={deleteVerbivoreEntry.bind(null, entry.id)}
                      entityName="entry"
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
