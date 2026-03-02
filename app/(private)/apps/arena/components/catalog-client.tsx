'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArenaTestComponent } from '@/lib/studio/arena/db-types'
import { createTestComponent, deleteTestComponent } from '@/lib/studio/arena/actions'

interface Props {
  components: ArenaTestComponent[]
  registryKeys: string[]
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
}

export function ComponentCatalogClient({ components, registryKeys }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Group by category
  const grouped = components.reduce<Record<string, ArenaTestComponent[]>>((acc, c) => {
    const cat = c.category || 'uncategorized'
    ;(acc[cat] ??= []).push(c)
    return acc
  }, {})

  async function handleCreate(formData: FormData) {
    setSaving(true)
    try {
      const name = formData.get('name') as string
      await createTestComponent({
        name,
        slug: generateSlug(name),
        component_key: formData.get('component_key') as string,
        category: (formData.get('category') as string) || 'general',
        description: (formData.get('description') as string) || undefined,
        is_default: formData.get('is_default') === 'on',
      })
      setShowForm(false)
      router.refresh()
    } catch (err) {
      console.error('Failed to create component:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteTestComponent(id)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete component:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Component'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form action={handleCreate} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                placeholder="e.g. Canonical Card"
              />
            </div>
            <div>
              <label htmlFor="component_key" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Component Key
              </label>
              <select
                id="component_key"
                name="component_key"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {registryKeys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                id="category"
                name="category"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                placeholder="general"
                defaultValue="general"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                id="description"
                name="description"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                placeholder="Optional description..."
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" className="rounded border-slate-300 dark:border-slate-600 text-purple-600" />
            <span className="text-slate-700 dark:text-slate-300">Include by default in new sessions</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Component'}
          </button>
        </form>
      )}

      {/* Component list */}
      {components.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">No test components registered.</p>
          <p className="text-sm text-slate-400 mt-1">Add components to use them in gym sessions.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, comps]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {comps.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comp.name}</h3>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      disabled={deleting === comp.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:text-gray-400"
                    >
                      {deleting === comp.id ? '...' : 'Delete'}
                    </button>
                  </div>
                  {comp.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{comp.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">{comp.component_key}</code>
                    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">{comp.slug}</code>
                    {comp.is_default && (
                      <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
