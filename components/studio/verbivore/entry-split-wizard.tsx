'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeEntrySplit, executeEntrySplit } from '@/lib/studio/verbivore/actions'

interface Entry {
  id: string
  title: string
  excerpt?: string
  content?: string
  word_count?: number
  complexity_score?: number
  term_count: number
}

interface SplitGroup {
  title: string
  theme: string
  terms: string[]
  rationale: string
  complexity_level: number
  estimated_word_count: number
  suggested_excerpt: string
}

interface SplitAnalysis {
  strategy_type: string
  total_groups: number
  analysis_summary: string
  groups: SplitGroup[]
  sequence_rationale: string
  cross_reference_strategy: string
  original_entry_update: {
    new_role: string
    updated_excerpt: string
    retained_terms: string[]
  }
}

export function EntrySplitWizard({ entry }: { entry: Entry }) {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [analysis, setAnalysis] = useState<SplitAnalysis | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [editedGroups, setEditedGroups] = useState<SplitGroup[]>([])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const data = await analyzeEntrySplit(entry.id)
      setAnalysis(data.analysis)
      setEditedGroups(data.analysis.groups)
      setSessionId(data.sessionId)
    } catch (error) {
      console.error('Error analyzing entry:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze entry. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExecuteSplit = async () => {
    if (!sessionId || !editedGroups.length || !analysis) return

    setIsExecuting(true)
    try {
      const result = await executeEntrySplit(
        sessionId,
        editedGroups,
        analysis.original_entry_update
      )

      alert(`Successfully split entry into ${result.createdEntries.length} new entries!`)
      router.push('/apps/verbivore/entries')
      router.refresh()
    } catch (error) {
      console.error('Error executing split:', error)
      alert(error instanceof Error ? error.message : 'Failed to execute split. Please try again.')
    } finally {
      setIsExecuting(false)
    }
  }

  const updateGroup = (index: number, field: keyof SplitGroup, value: string | number | string[]) => {
    setEditedGroups((prev) =>
      prev.map((group, i) => (i === index ? { ...group, [field]: value } : group))
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Entry Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{entry.term_count}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Linked Terms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{entry.word_count || 0}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {entry.complexity_score || 5}/10
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Complexity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.ceil((entry.word_count || 0) / 200) || '?'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Est. Minutes</div>
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Ready to Analyze
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            AI will analyze your entry
            {entry.term_count > 0 ? `'s ${entry.term_count} linked terms` : ''} and propose an
            optimal splitting strategy.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing Entry...' : 'Analyze Entry'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
              Split Strategy:{' '}
              {analysis.strategy_type.charAt(0).toUpperCase() + analysis.strategy_type.slice(1)}
            </h2>
            <p className="text-green-800 dark:text-green-200 mb-4">
              {analysis.analysis_summary}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Proposed Groups:</strong> {analysis.total_groups}
              </div>
              <div>
                <strong>Reading Order:</strong> {analysis.sequence_rationale}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Proposed Entry Groups
            </h2>
            {editedGroups.map((group, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={group.title}
                      onChange={(e) => updateGroup(index, 'title', e.target.value)}
                      className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {group.theme}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {group.terms.length} terms - Complexity {group.complexity_level}/10
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Excerpt
                  </label>
                  <textarea
                    value={group.suggested_excerpt}
                    onChange={(e) => updateGroup(index, 'suggested_excerpt', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    rows={2}
                  />
                </div>

                <div className="mb-4">
                  <strong className="text-sm text-slate-700 dark:text-slate-300">Terms:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.terms.map((term, termIndex) => (
                      <span
                        key={termIndex}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <strong>Rationale:</strong> {group.rationale}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-4">
              Original Entry Will Become: {analysis.original_entry_update.new_role}
            </h3>
            <p className="text-orange-800 dark:text-orange-200 mb-4">
              {analysis.original_entry_update.updated_excerpt}
            </p>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              <strong>Retained Terms:</strong>{' '}
              {analysis.original_entry_update.retained_terms.join(', ')}
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <button
              onClick={handleExecuteSplit}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting
                ? 'Executing Split...'
                : `Execute Split into ${editedGroups.length} Entries`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
