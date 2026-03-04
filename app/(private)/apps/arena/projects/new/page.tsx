import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createProjectAction } from '@/lib/studio/arena/actions'
import { getTemplateThemes } from '@/lib/studio/arena/queries'
import { CORE_DIMENSIONS, ALL_DIMENSIONS } from '@/lib/studio/arena/types'

const DIMENSION_LABELS: Record<string, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
  elevation: 'Elevation',
  radius: 'Radius',
  density: 'Density',
  motion: 'Motion',
  iconography: 'Iconography',
  voice: 'Voice & Tone',
  presentation: 'Presentation',
}

const CORE_SET = new Set(CORE_DIMENSIONS)

export default async function NewProjectPage() {
  const templateThemes = await getTemplateThemes()
  const themeNames = [...new Set(templateThemes.map((t) => t.name))]

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
          Configure a design system project
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

        {themeNames.length > 0 && (
          <div>
            <label htmlFor="theme_template" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Theme Template
            </label>
            <select
              id="theme_template"
              name="theme_template"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">None</option>
              {themeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Token values to clone into the project as a starting point.
            </p>
          </div>
        )}

        <fieldset>
          <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Skills
          </legend>
          <div className="space-y-2">
            {ALL_DIMENSIONS.map((dim) => (
              <label key={dim} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="dimensions"
                  value={dim}
                  defaultChecked={CORE_SET.has(dim)}
                  className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-slate-800 dark:text-slate-200">
                  {DIMENSION_LABELS[dim] ?? dim.charAt(0).toUpperCase() + dim.slice(1)}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Select which skill dimensions to include.
          </p>
        </fieldset>

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
