'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ArenaProjectAssemblyWithSkill, ArenaSkill } from '@/lib/studio/arena/db-types'
import type { DimensionState, ProjectTheme, TokenMap } from '@/lib/studio/arena/types'

// ---------------------------------------------------------------------------
// Dimension display config (exported for page.tsx)
// ---------------------------------------------------------------------------

export const DIMENSION_LABELS: Record<string, string> = {
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

export const DIMENSION_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  color:        { bg: 'bg-rose-50 dark:bg-rose-950/20',    accent: 'border-rose-300 dark:border-rose-700',    text: 'text-rose-700 dark:text-rose-300' },
  typography:   { bg: 'bg-blue-50 dark:bg-blue-950/20',    accent: 'border-blue-300 dark:border-blue-700',    text: 'text-blue-700 dark:text-blue-300' },
  spacing:      { bg: 'bg-amber-50 dark:bg-amber-950/20',  accent: 'border-amber-300 dark:border-amber-700',  text: 'text-amber-700 dark:text-amber-300' },
  elevation:    { bg: 'bg-violet-50 dark:bg-violet-950/20', accent: 'border-violet-300 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-300' },
  radius:       { bg: 'bg-emerald-50 dark:bg-emerald-950/20', accent: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300' },
  density:      { bg: 'bg-cyan-50 dark:bg-cyan-950/20',    accent: 'border-cyan-300 dark:border-cyan-700',    text: 'text-cyan-700 dark:text-cyan-300' },
  motion:       { bg: 'bg-orange-50 dark:bg-orange-950/20', accent: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300' },
  iconography:  { bg: 'bg-indigo-50 dark:bg-indigo-950/20', accent: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300' },
  voice:        { bg: 'bg-pink-50 dark:bg-pink-950/20',    accent: 'border-pink-300 dark:border-pink-700',    text: 'text-pink-700 dark:text-pink-300' },
  presentation: { bg: 'bg-teal-50 dark:bg-teal-950/20',    accent: 'border-teal-300 dark:border-teal-700',    text: 'text-teal-700 dark:text-teal-300' },
}

const DEFAULT_DIM = { bg: 'bg-slate-50 dark:bg-slate-950/20', accent: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300' }

export const DIMENSION_COLORS_FLAT: Record<string, string> = {
  color: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
  typography: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  spacing: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  elevation: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800',
  radius: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
  density: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800',
  motion: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  iconography: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800',
  voice: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800',
  presentation: 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800',
}

export const DEFAULT_DIM_COLOR = 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800'

// ---------------------------------------------------------------------------
// Text renderers — plain text, no markdown
// ---------------------------------------------------------------------------

function getDimensionState(skill: ArenaSkill): DimensionState | null {
  if (typeof skill.state === 'object' && skill.state !== null && 'decisions' in skill.state) {
    return skill.state as DimensionState
  }
  return null
}

function skillToText(dim: string, skill: ArenaSkill, dimState: DimensionState): string {
  const label = DIMENSION_LABELS[dim] ?? dim
  const lines: string[] = []

  lines.push(label)
  lines.push(`${skill.name} · ${skill.tier}`)
  lines.push('')

  if (dimState.decisions.length > 0) {
    lines.push(`Decisions (${dimState.decisions.length})`)
    lines.push('')
    for (const d of dimState.decisions) {
      lines.push(`  ${d.label} [${d.confidence}]`)
      if (d.rationale) lines.push(`  ${d.rationale}`)
      if (d.intent) lines.push(`  > ${d.intent}`)
      lines.push('')
    }
  }

  if (dimState.rules.length > 0) {
    lines.push(`Rules (${dimState.rules.length})`)
    lines.push('')
    for (const r of dimState.rules) {
      lines.push(`  [${r.type}] ${r.statement}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function themeToText(dim: string, tokens: TokenMap, source: string): string {
  const label = DIMENSION_LABELS[dim] ?? dim
  const lines: string[] = []

  lines.push(label)
  lines.push(`source: ${source}`)
  lines.push('')

  const entries = Object.entries(tokens)
  if (entries.length === 0) {
    lines.push('(no tokens)')
  } else {
    const maxLen = Math.max(...entries.map(([k]) => k.length))
    for (const [key, value] of entries) {
      lines.push(`  ${key.padEnd(maxLen)}  ${value}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Tab = 'skills' | 'theme'

interface AssemblySectionProps {
  projectId: string
  dimensions: string[]
  assemblyByDimension: Record<string, ArenaProjectAssemblyWithSkill | undefined>
  parentSkillMap: Record<string, ArenaSkill>
  projectThemes: ProjectTheme
  templateThemes: ProjectTheme
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssemblySection({
  projectId,
  dimensions,
  assemblyByDimension,
  parentSkillMap,
  projectThemes,
  templateThemes,
}: AssemblySectionProps) {
  const [tab, setTab] = useState<Tab>('skills')
  const [selectedDim, setSelectedDim] = useState(dimensions[0] ?? 'color')
  const [showCurrent, setShowCurrent] = useState(true)
  const [showInitial, setShowInitial] = useState(false)

  const entry = assemblyByDimension[selectedDim]
  const skill = entry?.skill ?? null
  const dimState = skill ? getDimensionState(skill) : null
  const parentSkill = skill?.parent_skill_id ? parentSkillMap[skill.parent_skill_id] : undefined
  const parentState = parentSkill ? getDimensionState(parentSkill) : null
  const dimColors = DIMENSION_COLORS[selectedDim] ?? DEFAULT_DIM

  const currentText = useMemo(() => {
    if (tab === 'skills') {
      if (!skill || !dimState) return null
      return skillToText(selectedDim, skill, dimState)
    }
    const t = projectThemes[selectedDim]
    if (!t?.tokens || Object.keys(t.tokens).length === 0) return null
    return themeToText(selectedDim, t.tokens, t.source)
  }, [tab, selectedDim, skill, dimState, projectThemes])

  const initialText = useMemo(() => {
    if (tab === 'skills') {
      if (!parentSkill || !parentState) return null
      return skillToText(selectedDim, parentSkill, parentState)
    }
    const t = templateThemes[selectedDim]
    if (!t?.tokens || Object.keys(t.tokens).length === 0) return null
    return themeToText(selectedDim, t.tokens, t.source)
  }, [tab, selectedDim, parentSkill, parentState, templateThemes])

  const hasInitial = !!initialText
  const visibleCols = [
    showCurrent ? 'current' as const : null,
    showInitial && hasInitial ? 'initial' as const : null,
  ].filter(Boolean)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-3">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setTab('skills')}
              className={`px-3 py-1 text-xs font-medium rounded-l border transition-colors ${
                tab === 'skills'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200'
                  : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setTab('theme')}
              className={`px-3 py-1 text-xs font-medium rounded-r border-y border-r transition-colors ${
                tab === 'theme'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200'
                  : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Theme
            </button>
          </div>
          {tab === 'skills' && skill && (
            <Link
              href={`/apps/arena/sessions/new?project=${projectId}&dimension=${selectedDim}&skill=${skill.id}`}
              className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Refine
            </Link>
          )}
        </div>

        {/* Column toggles */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurrent}
              onChange={(e) => setShowCurrent(e.target.checked)}
              className="rounded border-slate-300 text-slate-600 w-3 h-3"
            />
            Current
          </label>
          {hasInitial && (
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showInitial}
                onChange={(e) => setShowInitial(e.target.checked)}
                className="rounded border-slate-300 text-slate-600 w-3 h-3"
              />
              Initial
            </label>
          )}
        </div>
      </div>

      <div className="flex min-h-[300px] border-t border-slate-200 dark:border-slate-700">
        {/* Sidebar */}
        <div className="w-40 shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
          <nav className="flex flex-col py-1">
            {dimensions.map((dim) => {
              const hasData = tab === 'skills'
                ? !!assemblyByDimension[dim]?.skill
                : !!projectThemes[dim]?.tokens && Object.keys(projectThemes[dim].tokens).length > 0
              const isSelected = dim === selectedDim

              return (
                <button
                  key={dim}
                  onClick={() => setSelectedDim(dim)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? `${dimColors.bg} ${dimColors.text} font-medium`
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasData ? 'bg-current' : 'border border-current opacity-40'}`} />
                  {DIMENSION_LABELS[dim] ?? dim}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content columns */}
        <div className="flex-1 flex min-w-0">
          {visibleCols.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">
              Select a column to display
            </div>
          ) : (
            visibleCols.map((col) => {
              const text = col === 'current' ? currentText : initialText
              const colLabel = col === 'current' ? 'Current' : 'Initial'
              return (
                <div
                  key={col}
                  className={`flex-1 min-w-0 overflow-auto ${
                    visibleCols.length > 1 ? 'border-r last:border-r-0 border-slate-200 dark:border-slate-700' : ''
                  }`}
                >
                  {visibleCols.length > 1 && (
                    <div className="sticky top-0 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                      {colLabel}
                    </div>
                  )}
                  {text ? (
                    <pre className="p-4 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {text}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">
                      {tab === 'skills' ? 'No skill' : 'No tokens'}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
