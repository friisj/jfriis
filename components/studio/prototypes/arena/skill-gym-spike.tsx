'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SkillState } from '@/lib/studio/arena/types'
import { SkillGym } from './shared/skill-gym'

/**
 * Skill Gym Spike — Standalone Entry Point
 *
 * Part of the Arena studio project.
 * Provides a JSON import phase for standalone skill refinement.
 * The gym itself is the shared SkillGym component (also used inline by figma-import-spike).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIMENSIONS = ['color', 'typography', 'spacing'] as const

function validateSkillState(obj: unknown): obj is SkillState {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  for (const dim of DIMENSIONS) {
    const d = s[dim]
    if (!d || typeof d !== 'object') return false
    const dd = d as Record<string, unknown>
    if (!Array.isArray(dd.decisions)) return false
  }
  return true
}

function countDecisions(skill: SkillState): number {
  return DIMENSIONS.reduce((sum, d) => sum + skill[d].decisions.length, 0)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SkillGymSpike() {
  const [phase, setPhase] = useState<'import' | 'gym'>('import')
  const [jsonInput, setJsonInput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [currentSkill, setCurrentSkill] = useState<SkillState | null>(null)

  const handleImport = useCallback(() => {
    setParseError(null)
    try {
      const parsed = JSON.parse(jsonInput)
      if (!validateSkillState(parsed)) {
        setParseError('Invalid SkillState: must have color, typography, and spacing with decisions arrays.')
        return
      }
      setCurrentSkill(parsed)
      setPhase('gym')
    } catch {
      setParseError('Invalid JSON. Paste a valid SkillState object.')
    }
  }, [jsonInput])

  // Preview stats
  const previewStats = useMemo(() => {
    if (!jsonInput) return null
    try {
      const p = JSON.parse(jsonInput)
      if (validateSkillState(p)) {
        const dims = DIMENSIONS.filter(d => p[d].decisions.length > 0).length
        return `Valid: ${countDecisions(p)} decisions across ${dims} dimensions`
      }
    } catch { /* ignore */ }
    return null
  }, [jsonInput])

  // ---------------------------------------------------------------------------
  // Import Phase
  // ---------------------------------------------------------------------------

  if (phase === 'import') {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Skill Gym</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Import a SkillState from Figma Import or another spike, then refine it through structured feedback rounds.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paste SkillState JSON</h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"color":{"decisions":[...],"rules":[...]},"typography":{...},"spacing":{...}}'
            rows={10}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
          />

          {parseError && (
            <p className="text-xs text-red-600 dark:text-red-400">{parseError}</p>
          )}

          {previewStats && (
            <p className="text-xs text-green-600 dark:text-green-400">{previewStats}</p>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleImport}
            disabled={!jsonInput.trim()}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Enter Gym
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Gym Phase (delegated to shared component)
  // ---------------------------------------------------------------------------

  if (!currentSkill) return null

  return (
    <SkillGym
      skill={currentSkill}
      onSkillUpdate={(refined) => setCurrentSkill(refined)}
      onBack={() => setPhase('import')}
    />
  )
}
