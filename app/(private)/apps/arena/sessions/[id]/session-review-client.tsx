'use client'

import { useState } from 'react'
import type { ArenaSessionIteration, ArenaSessionFeedback, ArenaSessionAnnotation } from '@/lib/studio/arena/db-types'
import { DEBONO_HATS } from '@/lib/studio/arena/debono-hats'

interface SessionReviewClientProps {
  iterations: ArenaSessionIteration[]
  feedback: ArenaSessionFeedback[]
  annotations: ArenaSessionAnnotation[]
}

export function SessionReviewClient({ iterations, feedback, annotations }: SessionReviewClientProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  if (iterations.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <p className="text-slate-500 dark:text-slate-400">No rounds recorded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Rounds ({iterations.length})
      </h2>

      {iterations.map((iteration) => {
        const roundFeedback = feedback.filter((f) => f.round === iteration.round)
        const roundAnnotations = annotations.filter((a) => a.round === iteration.round)
        const isExpanded = expandedRound === iteration.round

        return (
          <div key={iteration.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <button
              onClick={() => setExpandedRound(isExpanded ? null : iteration.round)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Round {iteration.round}
                </span>
                <span className="text-xs text-slate-400">
                  {roundFeedback.length} feedback, {roundAnnotations.length} annotations
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                {/* AI Summary */}
                {iteration.ai_summary && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">AI Summary</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">{iteration.ai_summary}</p>
                  </div>
                )}

                {/* Feedback */}
                {roundFeedback.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Feedback</h4>
                    <div className="space-y-1">
                      {roundFeedback.map((fb) => (
                        <div key={fb.id} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${
                            fb.action === 'approve' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : fb.action === 'adjust' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {fb.action}
                          </span>
                          <span className="text-slate-500 capitalize">{fb.dimension}</span>
                          <span className="font-medium text-slate-600 dark:text-slate-400">{fb.decision_label}</span>
                          {fb.new_value && (
                            <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 px-1 rounded text-purple-700 dark:text-purple-400">
                              {fb.new_value}
                            </code>
                          )}
                          {fb.reason && (
                            <span className="text-slate-400 truncate">&mdash; {fb.reason}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annotations */}
                {roundAnnotations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Annotations</h4>
                    <div className="space-y-2">
                      {roundAnnotations.map((ann) => {
                        const hat = DEBONO_HATS.find(h => h.key === ann.hat_key)
                        return (
                          <div key={ann.id} className="flex items-start gap-2 text-xs">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: hat?.color ?? '#888' }}
                            />
                            <div className="text-slate-600 dark:text-slate-400">
                              {ann.segments.map((seg, i) => (
                                <span key={i}>
                                  {seg.type === 'text' ? seg.value : (
                                    <code className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                                      {seg.displayName}
                                    </code>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
