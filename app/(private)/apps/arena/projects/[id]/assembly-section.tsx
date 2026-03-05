'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ArenaProjectAssemblyWithSkill, ArenaSkill } from '@/lib/studio/arena/db-types'
import type { SkillDecision, SkillRule, DimensionState, ProjectTheme } from '@/lib/studio/arena/types'

// ---------------------------------------------------------------------------
// Dimension display config
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

// Legacy flat color map used by page.tsx grid (kept for backward compat if needed)
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
// Helpers
// ---------------------------------------------------------------------------

function getDimensionState(skill: ArenaSkill): DimensionState | null {
  if (typeof skill.state === 'object' && skill.state !== null && 'decisions' in skill.state) {
    return skill.state as DimensionState
  }
  return null
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(value.trim())
}

function isDimensionModified(
  skill: ArenaSkill,
  parentSkill: ArenaSkill | undefined
): boolean {
  if (!parentSkill) return false
  const current = getDimensionState(skill)
  const parent = getDimensionState(parentSkill)
  if (!current || !parent) return true

  if (current.decisions.length !== parent.decisions.length) return true
  if (current.rules.length !== parent.rules.length) return true

  for (const dec of current.decisions) {
    const parentDec = parent.decisions.find((d) => d.label === dec.label)
    if (!parentDec) return true
    if (dec.rationale !== parentDec.rationale || dec.confidence !== parentDec.confidence || dec.value !== parentDec.value) return true
  }
  for (const rule of current.rules) {
    const parentRule = parent.rules.find((r) => r.id === rule.id)
    if (!parentRule) return true
    if (rule.statement !== parentRule.statement || rule.type !== parentRule.type) return true
  }

  return false
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const RULE_TYPE_COLORS: Record<string, string> = {
  must: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'must-not': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  should: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  prefer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssemblySectionProps {
  projectId: string
  dimensions: string[]
  assemblyByDimension: Record<string, ArenaProjectAssemblyWithSkill | undefined>
  parentSkillMap: Record<string, ArenaSkill>
  projectThemes: ProjectTheme
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
}: AssemblySectionProps) {
  const [selectedDim, setSelectedDim] = useState(dimensions[0] ?? 'color')
  const [showDiff, setShowDiff] = useState(false)

  const entry = assemblyByDimension[selectedDim]
  const skill = entry?.skill ?? null
  const dimState = skill ? getDimensionState(skill) : null
  const parentSkill = skill?.parent_skill_id ? parentSkillMap[skill.parent_skill_id] : undefined
  const parentState = parentSkill ? getDimensionState(parentSkill) : null
  const tokens = projectThemes[selectedDim]?.tokens ?? {}
  const dimColors = DIMENSION_COLORS[selectedDim] ?? DEFAULT_DIM

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Skill Assembly</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          One active skill per dimension composes the project&apos;s design system.
        </p>
      </div>

      <div className="md:flex">
        {/* Sidebar */}
        <div className="md:w-48 md:shrink-0 md:border-r border-slate-200 dark:border-slate-700">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible px-3 md:px-0 pb-2 md:pb-3 gap-0.5">
            {dimensions.map((dim) => {
              const hasSkill = !!assemblyByDimension[dim]?.skill
              const isSelected = dim === selectedDim
              const parentId = assemblyByDimension[dim]?.skill?.parent_skill_id
              const isModified = hasSkill && parentId
                ? isDimensionModified(assemblyByDimension[dim]!.skill!, parentSkillMap[parentId])
                : false

              return (
                <button
                  key={dim}
                  onClick={() => setSelectedDim(dim)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    isSelected
                      ? `${dimColors.bg} ${dimColors.text} ${dimColors.accent} border`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${hasSkill ? 'bg-current' : 'border border-current opacity-40'}`} />
                  <span className="uppercase tracking-wide">
                    {DIMENSION_LABELS[dim] ?? dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </span>
                  {isModified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified from template" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Detail panel */}
        <div className="flex-1 p-5 pt-3 md:pt-5 min-w-0">
          {skill && dimState ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className={`text-base font-semibold ${dimColors.text}`}>
                    {DIMENSION_LABELS[selectedDim] ?? selectedDim}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {skill.name}
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      {skill.tier}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {parentSkill && (
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        showDiff
                          ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {showDiff ? 'Hide Changes' : 'Show Changes'}
                    </button>
                  )}
                  <Link
                    href={`/apps/arena/sessions/new?project=${projectId}&dimension=${selectedDim}&skill=${skill.id}`}
                    className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    Refine
                  </Link>
                </div>
              </div>

              {/* Decisions */}
              {dimState.decisions.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Decisions ({dimState.decisions.length})
                  </h4>
                  <div className="space-y-2">
                    {dimState.decisions.map((decision) => {
                      const parentDec = parentState?.decisions.find((d) => d.label === decision.label)
                      const isAdded = showDiff && parentState && !parentDec
                      const isChanged = showDiff && parentDec && (
                        decision.rationale !== parentDec.rationale ||
                        decision.confidence !== parentDec.confidence ||
                        decision.value !== parentDec.value
                      )

                      return (
                        <DecisionCard
                          key={decision.id}
                          decision={decision}
                          tokenValue={tokens[decision.label]}
                          parentDecision={showDiff ? parentDec : undefined}
                          diffStatus={isAdded ? 'added' : isChanged ? 'changed' : undefined}
                        />
                      )
                    })}
                    {/* Removed decisions (only in diff mode) */}
                    {showDiff && parentState && parentState.decisions
                      .filter((pd) => !dimState.decisions.find((d) => d.label === pd.label))
                      .map((removed) => (
                        <DecisionCard
                          key={removed.id}
                          decision={removed}
                          tokenValue={tokens[removed.label]}
                          diffStatus="removed"
                        />
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Rules */}
              {dimState.rules.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Rules ({dimState.rules.length})
                  </h4>
                  <div className="space-y-1.5">
                    {dimState.rules.map((rule) => (
                      <RuleRow key={rule.id} rule={rule} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400 dark:text-slate-500 italic">
              No skill assigned to {DIMENSION_LABELS[selectedDim] ?? selectedDim}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Decision Card
// ---------------------------------------------------------------------------

function DecisionCard({
  decision,
  tokenValue,
  parentDecision,
  diffStatus,
}: {
  decision: SkillDecision
  tokenValue?: string
  parentDecision?: SkillDecision
  diffStatus?: 'added' | 'changed' | 'removed'
}) {
  const borderClass =
    diffStatus === 'added' ? 'border-l-2 border-l-green-500' :
    diffStatus === 'removed' ? 'border-l-2 border-l-red-300 opacity-50' :
    diffStatus === 'changed' ? 'border-l-2 border-l-amber-500' :
    'border-l-2 border-l-transparent'

  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 p-3 ${borderClass} ${diffStatus === 'removed' ? 'line-through' : ''}`}>
      {/* Label + token + confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {decision.label}
        </span>
        {tokenValue && (
          <span className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
            {isHexColor(tokenValue) && (
              <span
                className="inline-block w-3 h-3 rounded-sm border border-slate-300 dark:border-slate-600 shrink-0"
                style={{ backgroundColor: tokenValue.trim() }}
              />
            )}
            {tokenValue}
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[decision.confidence] ?? ''}`}>
          {decision.confidence}
        </span>
      </div>

      {/* Rationale */}
      {decision.rationale && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
          {decision.rationale}
        </p>
      )}

      {/* Diff: show parent rationale when changed */}
      {diffStatus === 'changed' && parentDecision && (
        <div className="mt-2 text-xs space-y-1">
          {parentDecision.rationale !== decision.rationale && (
            <p className="text-red-500/70 dark:text-red-400/70 line-through">
              {parentDecision.rationale}
            </p>
          )}
          {parentDecision.confidence !== decision.confidence && (
            <p className="text-amber-600 dark:text-amber-400">
              confidence: {parentDecision.confidence} → {decision.confidence}
            </p>
          )}
        </div>
      )}

      {/* Intent (secondary) */}
      {decision.intent && !diffStatus?.startsWith('removed') && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">
          {decision.intent}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rule Row
// ---------------------------------------------------------------------------

function RuleRow({ rule }: { rule: SkillRule }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${RULE_TYPE_COLORS[rule.type] ?? 'bg-slate-100 text-slate-600'}`}>
        {rule.type}
      </span>
      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{rule.statement}</span>
    </div>
  )
}
