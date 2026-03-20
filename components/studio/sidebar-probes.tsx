'use client'

/**
 * SidebarProbes — compact probe response widget for the experiment prototype sidebar.
 * Shows unanswered probes inline so they can be answered while testing a spike.
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface ProbeData {
  id: string
  question: string
  context: string | null
  response_type: 'text' | 'rating' | 'choice' | 'boolean'
  choices: string[] | null
  rating_min: number | null
  rating_max: number | null
  rating_labels: Record<string, string> | null
  response: string | number | boolean | null
  responded_at: string | null
  sequence: number
  phase: 'pre' | 'during' | 'post'
  generated_by: 'auto' | 'manual'
}

export function SidebarProbes({ probes: initialProbes }: { probes: ProbeData[] }) {
  const [probes, setProbes] = useState(initialProbes)
  const [collapsed, setCollapsed] = useState(false)

  const unanswered = probes.filter((p) => p.response === null)
  const answered = probes.filter((p) => p.response !== null)

  const saveResponse = useCallback(
    async (probeId: string, response: string | number | boolean) => {
      const { error } = await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from('studio_experiment_probes')
        .update({ response: JSON.stringify(response), responded_at: new Date().toISOString() })
        .eq('id', probeId)

      if (!error) {
        setProbes((prev) =>
          prev.map((p) =>
            p.id === probeId
              ? { ...p, response, responded_at: new Date().toISOString() }
              : p
          )
        )
      }
    },
    []
  )

  if (unanswered.length === 0 && answered.length > 0) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-700 font-medium">
          All {answered.length} probes answered
        </p>
      </div>
    )
  }

  if (probes.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-xs uppercase text-gray-500 font-medium mb-2 hover:text-gray-700 transition-colors"
      >
        <span>Probes ({unanswered.length} remaining)</span>
        <span className="text-[10px]">{collapsed ? '+ Show' : '- Hide'}</span>
      </button>

      {!collapsed && (
        <div className="space-y-3">
          {unanswered.map((probe) => (
            <CompactProbe key={probe.id} probe={probe} onRespond={saveResponse} />
          ))}
          {answered.length > 0 && (
            <p className="text-[10px] text-gray-400">
              {answered.length} answered
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CompactProbe({
  probe,
  onRespond,
}: {
  probe: ProbeData
  onRespond: (id: string, value: string | number | boolean) => void
}) {
  const [textValue, setTextValue] = useState('')

  return (
    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
      <p className="text-xs font-medium leading-snug">{probe.question}</p>

      {probe.response_type === 'text' && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textValue.trim()) {
                onRespond(probe.id, textValue.trim())
              }
            }}
            placeholder="Answer..."
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
          />
          <button
            onClick={() => {
              if (textValue.trim()) onRespond(probe.id, textValue.trim())
            }}
            disabled={!textValue.trim()}
            className="px-2 py-1.5 text-[10px] bg-blue-500 text-white rounded disabled:opacity-30"
          >
            OK
          </button>
        </div>
      )}

      {probe.response_type === 'rating' && (
        <div className="flex gap-1">
          {Array.from(
            { length: (probe.rating_max ?? 5) - (probe.rating_min ?? 1) + 1 },
            (_, i) => {
              const val = (probe.rating_min ?? 1) + i
              return (
                <button
                  key={val}
                  onClick={() => onRespond(probe.id, val)}
                  className="flex-1 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                >
                  {val}
                </button>
              )
            }
          )}
        </div>
      )}

      {probe.response_type === 'choice' && (
        <div className="flex flex-wrap gap-1">
          {(probe.choices ?? []).map((choice) => (
            <button
              key={choice}
              onClick={() => onRespond(probe.id, choice)}
              className="px-2 py-1 text-[11px] rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {probe.response_type === 'boolean' && (
        <div className="flex gap-1">
          <button
            onClick={() => onRespond(probe.id, true)}
            className="flex-1 py-1 text-xs rounded bg-gray-100 hover:bg-green-100 hover:text-green-700 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => onRespond(probe.id, false)}
            className="flex-1 py-1 text-xs rounded bg-gray-100 hover:bg-red-100 hover:text-red-700 transition-colors"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}
