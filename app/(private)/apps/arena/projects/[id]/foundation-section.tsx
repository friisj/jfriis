'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ArenaProject } from '@/lib/studio/arena/db-types'
import { generateFoundation } from '@/lib/studio/arena/actions'

interface FoundationSectionProps {
  project: ArenaProject
}

export function FoundationSection({ project }: FoundationSectionProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      await generateFoundation(project.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foundation generation failed')
    } finally {
      setGenerating(false)
    }
  }, [project.id, router])

  const foundation = project.foundation

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Foundation</h2>
        {foundation ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium disabled:text-slate-400"
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {foundation ? (
        <div className="space-y-3">
          {foundation.summary && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Summary</span>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{foundation.summary}</p>
            </div>
          )}

          {foundation.gaps && foundation.gaps.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Gaps</span>
              <div className="mt-1 space-y-1">
                {foundation.gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`flex-shrink-0 mt-0.5 ${
                      gap.severity === 'high' ? 'text-red-500' : gap.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {gap.severity === 'high' ? '!' : gap.severity === 'medium' ? '~' : '-'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      <span className="font-medium capitalize">{gap.dimension}:</span> {gap.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {foundation.generated_at && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Generated {new Date(foundation.generated_at).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            No foundation generated yet. Analyze inputs and refine skills with project-specific context.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate Foundation'}
          </button>
        </div>
      )}
    </div>
  )
}
