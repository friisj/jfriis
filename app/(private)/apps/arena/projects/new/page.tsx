import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createProjectAction } from '@/lib/studio/arena/actions'

export default function NewProjectPage() {
  async function handleCreate(formData: FormData) {
    'use server'
    const project = await createProjectAction(formData)
    redirect(`/apps/arena/projects/${project.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Project</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure a design system project with substrate and dimensions
        </p>
      </div>

      <form action={handleCreate} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            placeholder="My Design System"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
            placeholder="Brief description of the design system..."
          />
        </div>

        <div>
          <label htmlFor="substrate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Substrate
          </label>
          <select
            id="substrate"
            name="substrate"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="">None</option>
            <option value="minimal">Minimal</option>
            <option value="brutalist">Brutalist</option>
            <option value="maximalist">Maximalist</option>
            <option value="organic">Organic</option>
            <option value="corporate">Corporate</option>
          </select>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            The aesthetic foundation that shapes design principles and gap detection.
          </p>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Dimensions
          </legend>
          <div className="space-y-2">
            {['color', 'typography', 'spacing'].map((dim) => (
              <div key={dim} className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm flex-1">
                  <input
                    type="checkbox"
                    name="dimensions"
                    value={dim}
                    defaultChecked
                    className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-800 dark:text-slate-200 capitalize">{dim}</span>
                </label>
                <select
                  name={`scope_${dim}`}
                  defaultValue="basic"
                  className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Select which dimensions to include. Scope controls decision granularity.
          </p>
        </fieldset>

        <div>
          <label htmlFor="figma_file_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Figma File URL (optional)
          </label>
          <input
            id="figma_file_url"
            name="figma_file_url"
            type="url"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            placeholder="https://www.figma.com/design/..."
          />
        </div>

        <div>
          <label htmlFor="figma_file_key" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Figma File Key (optional)
          </label>
          <input
            id="figma_file_key"
            name="figma_file_key"
            type="text"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            placeholder="abc123..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Project
          </button>
          <Link
            href="/apps/arena/projects"
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
