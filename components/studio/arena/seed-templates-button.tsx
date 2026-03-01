'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { seedBaseTemplates } from '@/lib/studio/arena/actions'

export function SeedTemplatesButton() {
  const router = useRouter()
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedBaseTemplates()
      router.refresh()
    } catch (err) {
      console.error('Failed to seed templates:', err)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-5 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">No templates yet</h3>
        <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
          Seed the base skill as 3 per-dimension templates to use as starting points.
        </p>
      </div>
      <button
        onClick={handleSeed}
        disabled={seeding}
        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
      >
        {seeding ? 'Seeding...' : 'Seed Base Templates'}
      </button>
    </div>
  )
}
