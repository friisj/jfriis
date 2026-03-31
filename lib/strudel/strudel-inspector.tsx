'use client'

import { useEffect, useState } from 'react'

type Hap = {
  whole?: { begin: { valueOf: () => number }; end: { valueOf: () => number } }
  part: { begin: { valueOf: () => number }; end: { valueOf: () => number } }
  value: Record<string, unknown>
  hasOnset: () => boolean
}

type HapRow = {
  onset: string
  duration: string
  note: string
  extra: string
}

type PatternStats = {
  eventCount: number
  onsetCount: number
  pitchRange: string
  haps: HapRow[]
}

type Props = {
  pattern: { queryArc: (begin: number, end: number) => unknown[]; firstCycle: () => unknown[] } | null
}

function extractNote(value: Record<string, unknown>): string {
  if (value.note) return String(value.note)
  if (value.n !== undefined && value.scale) return `${value.n}:${value.scale}`
  if (value.n !== undefined) return `n${value.n}`
  if (value.s) return String(value.s)
  if (value.freq) return `${Number(value.freq).toFixed(0)}Hz`
  return JSON.stringify(value).slice(0, 30)
}

function extractExtra(value: Record<string, unknown>): string {
  const skip = new Set(['note', 'n', 's', 'freq', 'scale'])
  const parts = Object.entries(value)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `${k}:${typeof v === 'number' ? Number(v).toFixed(2) : v}`)
  return parts.slice(0, 3).join(' ')
}

function analyzePattern(pattern: Props['pattern']): PatternStats | null {
  if (!pattern) return null
  try {
    const haps = pattern.firstCycle() as Hap[]
    const onsets = haps.filter((h) => h.hasOnset())
    const notes = haps
      .map((h) => {
        const v = h.value
        if (typeof v?.note === 'string') return v.note
        if (typeof v?.freq === 'number') return v.freq
        return null
      })
      .filter(Boolean)

    const pitchRange = notes.length > 0
      ? `${notes[0]} — ${notes[notes.length - 1]}`
      : '-'

    return {
      eventCount: haps.length,
      onsetCount: onsets.length,
      pitchRange,
      haps: onsets.slice(0, 32).map((h) => ({
        onset: Number(h.whole?.begin.valueOf() ?? h.part.begin.valueOf()).toFixed(3),
        duration: h.whole
          ? (Number(h.whole.end.valueOf()) - Number(h.whole.begin.valueOf())).toFixed(3)
          : '-',
        note: extractNote(h.value as Record<string, unknown>),
        extra: extractExtra(h.value as Record<string, unknown>),
      })),
    }
  } catch {
    return null
  }
}

export function StrudelInspector({ pattern }: Props) {
  const [stats, setStats] = useState<PatternStats | null>(null)

  useEffect(() => {
    setStats(analyzePattern(pattern))
  }, [pattern])

  if (!stats) {
    return (
      <div className="text-zinc-500 text-xs font-mono p-2">
        Evaluate a pattern to inspect it
      </div>
    )
  }

  return (
    <div className="text-xs font-mono overflow-y-auto p-2 space-y-2">
      {/* Stats row */}
      <div className="flex gap-3 text-zinc-400">
        <span>events: <span className="text-zinc-200">{stats.eventCount}</span></span>
        <span>onsets: <span className="text-zinc-200">{stats.onsetCount}</span></span>
        <span>range: <span className="text-zinc-200">{stats.pitchRange}</span></span>
      </div>

      {/* Hap table */}
      <table className="w-full text-left">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="pr-3 py-0.5 font-normal">onset</th>
            <th className="pr-3 py-0.5 font-normal">dur</th>
            <th className="pr-3 py-0.5 font-normal">note</th>
            <th className="py-0.5 font-normal">params</th>
          </tr>
        </thead>
        <tbody>
          {stats.haps.map((h, i) => (
            <tr key={i} className="text-zinc-300 border-b border-zinc-800/50 hover:bg-white/5">
              <td className="pr-3 py-0.5 text-purple-400">{h.onset}</td>
              <td className="pr-3 py-0.5">{h.duration}</td>
              <td className="pr-3 py-0.5 text-zinc-100">{h.note}</td>
              <td className="py-0.5 text-zinc-500 truncate max-w-[150px]">{h.extra}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {stats.onsetCount > 32 && (
        <div className="text-zinc-600">...and {stats.onsetCount - 32} more</div>
      )}
    </div>
  )
}
