import Link from 'next/link'
import { getStyleGuides } from '@/lib/studio/verbivore/queries'
import { DeleteButton } from '@/components/studio/verbivore/delete-button'
import { deleteVerbivoreStyleGuide } from '@/lib/studio/verbivore/actions'

export default async function StyleGuidesPage() {
  const styleGuides = await getStyleGuides()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Style Guides</h1>
        <Link
          href="/studio/verbivore/style-guides/new"
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
        >
          New Style Guide
        </Link>
      </div>

      {styleGuides.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No style guides yet.</p>
          <Link
            href="/studio/verbivore/style-guides/new"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Create your first style guide
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Usage
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
              {styleGuides.map((guide) => (
                <tr key={guide.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/studio/verbivore/style-guides/${guide.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {guide.name}
                    </Link>
                    {guide.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-sm">
                        {guide.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {guide.is_default ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        Default
                      </span>
                    ) : guide.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {guide.usage_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {new Date(guide.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/studio/verbivore/style-guides/${guide.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      onDelete={deleteVerbivoreStyleGuide.bind(null, guide.id)}
                      entityName="style guide"
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
