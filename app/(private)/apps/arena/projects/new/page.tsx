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
          Add a design system or Figma file as an import source
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
