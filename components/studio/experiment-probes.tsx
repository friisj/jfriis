'use client'

/**
 * ExperimentProbes — displays and responds to probes on the experiment page.
 *
 * Probes are structured questions attached to experiments. They render
 * as response widgets (text input, rating scale, choice pills, boolean toggle)
 * grouped by phase (pre / during / post).
 */

import { useState, useCallback, useTransition } from 'react'
import { supabase } from '@/lib/supabase'

interface Probe {
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

const PHASE_LABELS: Record<string, string> = {
  pre: 'Before Testing',
  during: 'During Testing',
  post: 'After Testing',
}

const PHASE_ORDER = ['pre', 'during', 'post'] as const

export function ExperimentProbes({
  probes: initialProbes,
  experimentId,
}: {
  probes: Probe[]
  experimentId: string
}) {
  const [probes, setProbes] = useState(initialProbes)
  const [isPending, startTransition] = useTransition()

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

  // Group probes by phase
  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    probes: probes
      .filter((p) => p.phase === phase)
      .sort((a, b) => a.sequence - b.sequence),
  })).filter((g) => g.probes.length > 0)

  if (probes.length === 0) {
    return (
      <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500">
        <p className="text-sm">No probes yet. Use <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/probe-experiment</code> to generate probes for this experiment.</p>
      </div>
    )
  }

  const answered = probes.filter((p) => p.response !== null).length
  const total = probes.length

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {answered}/{total}
        </span>
      </div>

      {/* Phase groups */}
      {grouped.map((group) => (
        <div key={group.phase}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            {group.label}
          </h3>
          <div className="space-y-4">
            {group.probes.map((probe) => (
              <ProbeCard
                key={probe.id}
                probe={probe}
                onRespond={(value) => {
                  startTransition(() => {
                    saveResponse(probe.id, value)
                  })
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProbeCard({
  probe,
  onRespond,
}: {
  probe: Probe
  onRespond: (value: string | number | boolean) => void
}) {
  const hasResponse = probe.response !== null

  return (
    <div
      className={`p-4 border-2 rounded-lg transition-colors ${
        hasResponse ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium leading-snug">{probe.question}</p>
        {probe.generated_by === 'auto' && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
            auto
          </span>
        )}
      </div>

      {probe.context && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{probe.context}</p>
      )}

      <ProbeResponseWidget probe={probe} onRespond={onRespond} />

      {hasResponse && probe.responded_at && (
        <p className="text-[10px] text-gray-400 mt-2">
          Answered {new Date(probe.responded_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function ProbeResponseWidget({
  probe,
  onRespond,
}: {
  probe: Probe
  onRespond: (value: string | number | boolean) => void
}) {
  const [textValue, setTextValue] = useState(
    typeof probe.response === 'string' ? probe.response : ''
  )

  switch (probe.response_type) {
    case 'text':
      return (
        <div className="flex gap-2">
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 resize-none bg-white"
            rows={2}
          />
          <button
            onClick={() => {
              if (textValue.trim()) onRespond(textValue.trim())
            }}
            disabled={!textValue.trim()}
            className="self-end px-3 py-2 text-xs bg-blue-500 text-white rounded disabled:opacity-30 hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      )

    case 'rating': {
      const min = probe.rating_min ?? 1
      const max = probe.rating_max ?? 5
      const labels = probe.rating_labels ?? {}
      const current = typeof probe.response === 'number' ? probe.response : null
      return (
        <div className="space-y-1">
          <div className="flex gap-1">
            {Array.from({ length: max - min + 1 }, (_, i) => {
              const val = min + i
              const isSelected = current === val
              return (
                <button
                  key={val}
                  onClick={() => onRespond(val)}
                  className={`flex-1 py-2 text-sm rounded transition-colors font-medium ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {val}
                </button>
              )
            })}
          </div>
          {(labels[String(min)] || labels[String(max)]) && (
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{labels[String(min)] ?? ''}</span>
              <span>{labels[String(max)] ?? ''}</span>
            </div>
          )}
        </div>
      )
    }

    case 'choice': {
      const choices = probe.choices ?? []
      const current = typeof probe.response === 'string' ? probe.response : null
      return (
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              onClick={() => onRespond(choice)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                current === choice
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      )
    }

    case 'boolean': {
      const current = typeof probe.response === 'boolean' ? probe.response : null
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(true)}
            className={`flex-1 py-2 text-sm rounded transition-colors font-medium ${
              current === true
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => onRespond(false)}
            className={`flex-1 py-2 text-sm rounded transition-colors font-medium ${
              current === false
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            No
          </button>
        </div>
      )
    }
  }
}
