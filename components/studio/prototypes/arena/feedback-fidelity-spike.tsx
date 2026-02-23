'use client'

/**
 * Feedback Fidelity Spike
 *
 * Part of the Arena studio project (H5: structured feedback produces
 * measurably richer skill refinements than binary approve/reject).
 *
 * Compares feedback quality across three input modes:
 * 1. Binary: simple approve/reject
 * 2. Binary + Reason: approve/reject with free-text explanation
 * 3. De Bono Hats: structured feedback using Six Thinking Hats
 *    - White: factual observation
 *    - Red: gut/aesthetic reaction
 *    - Black: problems/risks
 *    - Yellow: what works
 *    - Green: alternatives
 *    - Blue: process/meta
 *
 * Shows the same design proposal to the user, collects feedback in each mode,
 * then compares the resulting skill updates for information density and
 * actionability.
 */

import { useState, useCallback, useMemo } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type FeedbackMode = 'binary' | 'binary-reason' | 'debono'
type BinaryDecision = 'approve' | 'reject' | null

interface DebonoHat {
  key: string
  label: string
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  placeholder: string
  description: string
}

interface DebonoFeedback {
  white: string
  red: string
  black: string
  yellow: string
  green: string
  blue: string
}

interface FeedbackResult {
  mode: FeedbackMode
  decision: BinaryDecision
  reason: string
  debono: DebonoFeedback
  timestamp: number
}

interface SkillRule {
  id: string
  text: string
  confidence: 'low' | 'medium' | 'high'
  source: string
}

interface SkillUpdate {
  rulesAdded: SkillRule[]
  rulesModified: SkillRule[]
  totalSignals: number
  informationDensity: number
  actionableCount: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEBONO_HATS: DebonoHat[] = [
  {
    key: 'white',
    label: 'White Hat',
    emoji: '\u26AA',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    placeholder: 'e.g. "44px tall, 16px padding, 14px type, 4px radius"',
    description: 'Factual observations. What do you see? Measurements, specifications, data.',
  },
  {
    key: 'red',
    label: 'Red Hat',
    emoji: '\uD83D\uDD34',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    placeholder: 'e.g. "feels too clinical, not warm enough"',
    description: 'Gut feeling. Emotional/aesthetic reaction, no justification needed.',
  },
  {
    key: 'black',
    label: 'Black Hat',
    emoji: '\u26AB',
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500',
    placeholder: 'e.g. "won\'t scale below 320px, fails AA contrast"',
    description: 'Problems and risks. What could go wrong? What are the weaknesses?',
  },
  {
    key: 'yellow',
    label: 'Yellow Hat',
    emoji: '\uD83D\uDFE1',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    placeholder: 'e.g. "spacing rhythm is consistent with token scale"',
    description: 'Strengths and value. What works well? What are the benefits?',
  },
  {
    key: 'green',
    label: 'Green Hat',
    emoji: '\uD83D\uDFE2',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    placeholder: 'e.g. "what if we softened the radius to match brand warmth?"',
    description: 'Alternatives and creativity. New ideas, modifications, experiments.',
  },
  {
    key: 'blue',
    label: 'Blue Hat',
    emoji: '\uD83D\uDD35',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    placeholder: 'e.g. "we should harden color tokens before revisiting this"',
    description: 'Process and meta. What should we focus on next? What\'s the priority?',
  },
]

const SAMPLE_PALETTE = [
  { name: 'Primary', hex: '#2563EB', token: 'primary-600' },
  { name: 'Primary Light', hex: '#93C5FD', token: 'primary-300' },
  { name: 'Surface', hex: '#F8FAFC', token: 'surface-50' },
  { name: 'Surface Alt', hex: '#E2E8F0', token: 'surface-200' },
  { name: 'Text', hex: '#0F172A', token: 'text-900' },
  { name: 'Text Muted', hex: '#64748B', token: 'text-500' },
  { name: 'Success', hex: '#059669', token: 'success-600' },
  { name: 'Danger', hex: '#DC2626', token: 'danger-600' },
]

// ─── Skill Derivation Logic ─────────────────────────────────────────────────

function deriveSkillUpdate(result: FeedbackResult): SkillUpdate {
  const rules: SkillRule[] = []
  let totalSignals = 0

  if (result.mode === 'binary') {
    totalSignals = 1
    if (result.decision === 'approve') {
      rules.push({
        id: 'b1',
        text: 'Current color palette direction is acceptable',
        confidence: 'low',
        source: 'Binary approval (no reasoning captured)',
      })
    } else {
      rules.push({
        id: 'b2',
        text: 'Current color palette direction needs revision',
        confidence: 'low',
        source: 'Binary rejection (no reasoning captured)',
      })
    }
  }

  if (result.mode === 'binary-reason') {
    totalSignals = result.reason.trim() ? 2 : 1
    const decision = result.decision === 'approve' ? 'approved' : 'rejected'
    if (result.reason.trim()) {
      rules.push({
        id: 'br1',
        text: `Palette ${decision}: "${result.reason.trim()}"`,
        confidence: 'medium',
        source: `Binary ${decision} with user-provided rationale`,
      })
      // Try to extract actionable signals from free text
      const words = result.reason.toLowerCase()
      if (words.includes('contrast') || words.includes('readable')) {
        rules.push({
          id: 'br2',
          text: 'Contrast/readability is a concern for this palette',
          confidence: 'medium',
          source: 'Inferred from free-text feedback',
        })
        totalSignals++
      }
      if (words.includes('warm') || words.includes('cold') || words.includes('clinical')) {
        rules.push({
          id: 'br3',
          text: 'Temperature/emotional tone of palette needs attention',
          confidence: 'medium',
          source: 'Inferred from free-text feedback',
        })
        totalSignals++
      }
    } else {
      rules.push({
        id: 'br0',
        text: `Palette ${decision} without explanation`,
        confidence: 'low',
        source: `Binary ${decision} (reason left empty)`,
      })
    }
  }

  if (result.mode === 'debono') {
    const d = result.debono

    if (d.white.trim()) {
      totalSignals++
      rules.push({
        id: 'dw1',
        text: `Factual: ${d.white.trim()}`,
        confidence: 'high',
        source: 'White Hat (objective observation)',
      })
    }
    if (d.red.trim()) {
      totalSignals++
      rules.push({
        id: 'dr1',
        text: `Aesthetic impression: ${d.red.trim()}`,
        confidence: 'medium',
        source: 'Red Hat (emotional/gut reaction)',
      })
    }
    if (d.black.trim()) {
      totalSignals++
      rules.push({
        id: 'db1',
        text: `Risk/problem: ${d.black.trim()}`,
        confidence: 'high',
        source: 'Black Hat (critical analysis)',
      })
    }
    if (d.yellow.trim()) {
      totalSignals++
      rules.push({
        id: 'dy1',
        text: `Strength to preserve: ${d.yellow.trim()}`,
        confidence: 'high',
        source: 'Yellow Hat (value identification)',
      })
    }
    if (d.green.trim()) {
      totalSignals++
      rules.push({
        id: 'dg1',
        text: `Alternative to explore: ${d.green.trim()}`,
        confidence: 'medium',
        source: 'Green Hat (creative alternatives)',
      })
    }
    if (d.blue.trim()) {
      totalSignals++
      rules.push({
        id: 'db2',
        text: `Process note: ${d.blue.trim()}`,
        confidence: 'medium',
        source: 'Blue Hat (process/priority)',
      })
    }
  }

  const actionableCount = rules.filter(
    (r) => r.confidence === 'high' || r.confidence === 'medium'
  ).length
  const informationDensity = totalSignals === 0 ? 0 : rules.length / totalSignals

  return {
    rulesAdded: rules,
    rulesModified: [],
    totalSignals,
    informationDensity,
    actionableCount,
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DesignProposal() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Design Proposal: Color Palette
      </h3>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {SAMPLE_PALETTE.map((color) => (
          <div key={color.token} className="text-center">
            <div
              className="w-full aspect-square rounded-lg border border-gray-200 mb-1.5 shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
            <p className="text-xs font-medium text-gray-700">{color.name}</p>
            <p className="text-[10px] text-gray-400 font-mono">{color.hex}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <div className="flex gap-1">
          {SAMPLE_PALETTE.map((color) => (
            <div
              key={color.token}
              className="w-6 h-6 rounded-sm"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">Full strip preview</span>
      </div>
    </div>
  )
}

function ModeSelector({
  activeMode,
  completedModes,
  onSelect,
}: {
  activeMode: FeedbackMode
  completedModes: FeedbackMode[]
  onSelect: (mode: FeedbackMode) => void
}) {
  const modes: { key: FeedbackMode; label: string; description: string }[] = [
    { key: 'binary', label: 'Binary', description: 'Approve or reject' },
    { key: 'binary-reason', label: 'Binary + Reason', description: 'Approve/reject with explanation' },
    { key: 'debono', label: 'De Bono Hats', description: 'Six Thinking Hats structured feedback' },
  ]

  return (
    <div className="flex gap-2">
      {modes.map((mode) => {
        const isActive = activeMode === mode.key
        const isComplete = completedModes.includes(mode.key)
        return (
          <button
            key={mode.key}
            onClick={() => onSelect(mode.key)}
            className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
              isActive
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : isComplete
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isComplete && (
                <span className="text-green-600 text-sm">&#10003;</span>
              )}
              <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                {mode.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
          </button>
        )
      })}
    </div>
  )
}

function BinaryFeedbackPanel({
  decision,
  onDecision,
  onSubmit,
}: {
  decision: BinaryDecision
  onDecision: (d: BinaryDecision) => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Review the color palette above. Do you approve or reject this direction?
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onDecision('approve')}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            decision === 'approve'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Approve
        </button>
        <button
          onClick={() => onDecision('reject')}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            decision === 'reject'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Reject
        </button>
      </div>
      <button
        onClick={onSubmit}
        disabled={!decision}
        className="w-full py-2.5 rounded-lg bg-black text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
      >
        Submit Binary Feedback
      </button>
    </div>
  )
}

function BinaryReasonFeedbackPanel({
  decision,
  reason,
  onDecision,
  onReasonChange,
  onSubmit,
}: {
  decision: BinaryDecision
  reason: string
  onDecision: (d: BinaryDecision) => void
  onReasonChange: (r: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Review the color palette above. Approve or reject, and explain why.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onDecision('approve')}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            decision === 'approve'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Approve
        </button>
        <button
          onClick={() => onDecision('reject')}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            decision === 'reject'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Reject
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Why did you make this choice? What specifically works or doesn't?"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={!decision}
        className="w-full py-2.5 rounded-lg bg-black text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
      >
        Submit Feedback with Reason
      </button>
    </div>
  )
}

function DebonoFeedbackPanel({
  feedback,
  onFeedbackChange,
  onSubmit,
}: {
  feedback: DebonoFeedback
  onFeedbackChange: (key: string, value: string) => void
  onSubmit: () => void
}) {
  const filledCount = Object.values(feedback).filter((v) => v.trim().length > 0).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Review the palette using each thinking hat.
        </p>
        <span className="text-xs text-gray-400">
          {filledCount}/6 hats filled
        </span>
      </div>
      {DEBONO_HATS.map((hat) => (
        <div
          key={hat.key}
          className={`rounded-lg border ${hat.borderColor} ${hat.bgColor} p-3`}
        >
          <div className="flex items-start gap-2 mb-1.5">
            <span className="text-base leading-none mt-0.5">{hat.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${hat.color}`}>
                  {hat.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{hat.description}</p>
            </div>
          </div>
          <textarea
            value={feedback[hat.key as keyof DebonoFeedback]}
            onChange={(e) => onFeedbackChange(hat.key, e.target.value)}
            placeholder={hat.placeholder}
            className="w-full h-16 px-2.5 py-1.5 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80"
          />
        </div>
      ))}
      <button
        onClick={onSubmit}
        disabled={filledCount === 0}
        className="w-full py-2.5 rounded-lg bg-black text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
      >
        Submit De Bono Feedback ({filledCount} hat{filledCount !== 1 ? 's' : ''})
      </button>
    </div>
  )
}

function SkillUpdateCard({ mode, update }: { mode: FeedbackMode; update: SkillUpdate }) {
  const modeLabels: Record<FeedbackMode, string> = {
    binary: 'Binary',
    'binary-reason': 'Binary + Reason',
    debono: 'De Bono Hats',
  }

  const confidenceColor: Record<string, string> = {
    low: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-green-100 text-green-700',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">{modeLabels[mode]}</h4>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
            {update.totalSignals} signal{update.totalSignals !== 1 ? 's' : ''}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
            {update.actionableCount} actionable
          </span>
        </div>
      </div>

      {update.rulesAdded.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No rules derived yet</p>
      ) : (
        <ul className="space-y-2">
          {update.rulesAdded.map((rule) => (
            <li key={rule.id} className="text-sm">
              <div className="flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 mt-0.5 ${confidenceColor[rule.confidence]}`}
                >
                  {rule.confidence}
                </span>
                <div className="min-w-0">
                  <p className="text-gray-800">{rule.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{rule.source}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DensityComparison({ results }: { results: Map<FeedbackMode, FeedbackResult> }) {
  const updates = useMemo(() => {
    const map = new Map<FeedbackMode, SkillUpdate>()
    results.forEach((result, mode) => {
      map.set(mode, deriveSkillUpdate(result))
    })
    return map
  }, [results])

  if (updates.size === 0) return null

  const maxSignals = Math.max(...Array.from(updates.values()).map((u) => u.totalSignals), 1)
  const maxRules = Math.max(...Array.from(updates.values()).map((u) => u.rulesAdded.length), 1)
  const maxActionable = Math.max(...Array.from(updates.values()).map((u) => u.actionableCount), 1)

  const modeOrder: FeedbackMode[] = ['binary', 'binary-reason', 'debono']
  const modeLabels: Record<FeedbackMode, string> = {
    binary: 'Binary',
    'binary-reason': 'Binary + Reason',
    debono: 'De Bono Hats',
  }
  const modeColors: Record<FeedbackMode, string> = {
    binary: 'bg-gray-400',
    'binary-reason': 'bg-blue-500',
    debono: 'bg-green-500',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Information Density Comparison
      </h3>

      <div className="space-y-6">
        {/* Signals bar chart */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Raw Signals Captured</p>
          <div className="space-y-2">
            {modeOrder.map((mode) => {
              const update = updates.get(mode)
              if (!update) return null
              const pct = (update.totalSignals / maxSignals) * 100
              return (
                <div key={mode} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0">
                    {modeLabels[mode]}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${modeColors[mode]} rounded transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-6 text-right">
                    {update.totalSignals}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rules derived bar chart */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Skill Rules Derived</p>
          <div className="space-y-2">
            {modeOrder.map((mode) => {
              const update = updates.get(mode)
              if (!update) return null
              const pct = (update.rulesAdded.length / maxRules) * 100
              return (
                <div key={mode} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0">
                    {modeLabels[mode]}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${modeColors[mode]} rounded transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-6 text-right">
                    {update.rulesAdded.length}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actionable rules bar chart */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Actionable Rules (medium/high confidence)</p>
          <div className="space-y-2">
            {modeOrder.map((mode) => {
              const update = updates.get(mode)
              if (!update) return null
              const pct = (update.actionableCount / maxActionable) * 100
              return (
                <div key={mode} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0">
                    {modeLabels[mode]}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${modeColors[mode]} rounded transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-6 text-right">
                    {update.actionableCount}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {updates.size === 3 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Verdict
          </h4>
          {(() => {
            const binaryUpdate = updates.get('binary')!
            const reasonUpdate = updates.get('binary-reason')!
            const debonoUpdate = updates.get('debono')!
            const debonoWins =
              debonoUpdate.actionableCount > reasonUpdate.actionableCount &&
              debonoUpdate.actionableCount > binaryUpdate.actionableCount
            const reasonWins =
              reasonUpdate.actionableCount > binaryUpdate.actionableCount &&
              !debonoWins

            if (debonoWins) {
              return (
                <p className="text-sm text-green-700">
                  De Bono Hats produced{' '}
                  <strong>
                    {debonoUpdate.actionableCount - binaryUpdate.actionableCount}x more
                  </strong>{' '}
                  actionable rules than binary feedback alone
                  {reasonUpdate.actionableCount > binaryUpdate.actionableCount
                    ? ` and ${debonoUpdate.actionableCount - reasonUpdate.actionableCount} more than binary+reason`
                    : ''}
                  . Structured feedback captures richer signal for skill refinement.
                </p>
              )
            } else if (reasonWins) {
              return (
                <p className="text-sm text-blue-700">
                  Binary + Reason outperformed both other modes with{' '}
                  <strong>{reasonUpdate.actionableCount}</strong> actionable rules.
                  Free-text reasoning added significant value over bare binary.
                </p>
              )
            } else {
              return (
                <p className="text-sm text-gray-600">
                  Results are inconclusive. Try providing more detailed feedback in each
                  mode to see a clearer difference.
                </p>
              )
            }
          })()}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FeedbackFidelitySpike() {
  const [activeMode, setActiveMode] = useState<FeedbackMode>('binary')
  const [results, setResults] = useState<Map<FeedbackMode, FeedbackResult>>(new Map())

  // Binary state
  const [binaryDecision, setBinaryDecision] = useState<BinaryDecision>(null)

  // Binary + Reason state
  const [brDecision, setBrDecision] = useState<BinaryDecision>(null)
  const [brReason, setBrReason] = useState('')

  // De Bono state
  const [debonoFeedback, setDebonoFeedback] = useState<DebonoFeedback>({
    white: '',
    red: '',
    black: '',
    yellow: '',
    green: '',
    blue: '',
  })

  const completedModes = useMemo(() => Array.from(results.keys()), [results])

  const handleSubmitBinary = useCallback(() => {
    if (!binaryDecision) return
    const result: FeedbackResult = {
      mode: 'binary',
      decision: binaryDecision,
      reason: '',
      debono: { white: '', red: '', black: '', yellow: '', green: '', blue: '' },
      timestamp: Date.now(),
    }
    setResults((prev) => new Map(prev).set('binary', result))
    // Auto-advance to next incomplete mode
    if (!results.has('binary-reason')) setActiveMode('binary-reason')
    else if (!results.has('debono')) setActiveMode('debono')
  }, [binaryDecision, results])

  const handleSubmitBinaryReason = useCallback(() => {
    if (!brDecision) return
    const result: FeedbackResult = {
      mode: 'binary-reason',
      decision: brDecision,
      reason: brReason,
      debono: { white: '', red: '', black: '', yellow: '', green: '', blue: '' },
      timestamp: Date.now(),
    }
    setResults((prev) => new Map(prev).set('binary-reason', result))
    if (!results.has('debono')) setActiveMode('debono')
    else if (!results.has('binary')) setActiveMode('binary')
  }, [brDecision, brReason, results])

  const handleSubmitDebono = useCallback(() => {
    const result: FeedbackResult = {
      mode: 'debono',
      decision: null,
      reason: '',
      debono: { ...debonoFeedback },
      timestamp: Date.now(),
    }
    setResults((prev) => new Map(prev).set('debono', result))
    if (!results.has('binary')) setActiveMode('binary')
    else if (!results.has('binary-reason')) setActiveMode('binary-reason')
  }, [debonoFeedback, results])

  const handleDebonoChange = useCallback((key: string, value: string) => {
    setDebonoFeedback((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setResults(new Map())
    setBinaryDecision(null)
    setBrDecision(null)
    setBrReason('')
    setDebonoFeedback({ white: '', red: '', black: '', yellow: '', green: '', blue: '' })
    setActiveMode('binary')
  }, [])

  const skillUpdates = useMemo(() => {
    const map = new Map<FeedbackMode, SkillUpdate>()
    results.forEach((result, mode) => {
      map.set(mode, deriveSkillUpdate(result))
    })
    return map
  }, [results])

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Feedback Fidelity Spike
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                H5: Does structured feedback (De Bono hats) produce measurably richer
                skill refinements than binary approve/reject?
              </p>
            </div>
            {results.size > 0 && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Reset All
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
              Spike
            </span>
            <span className="text-xs text-gray-400">
              {completedModes.length}/3 modes completed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Proposal + Feedback Input */}
          <div className="space-y-4">
            <DesignProposal />

            <ModeSelector
              activeMode={activeMode}
              completedModes={completedModes}
              onSelect={setActiveMode}
            />

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              {activeMode === 'binary' && (
                <BinaryFeedbackPanel
                  decision={binaryDecision}
                  onDecision={setBinaryDecision}
                  onSubmit={handleSubmitBinary}
                />
              )}
              {activeMode === 'binary-reason' && (
                <BinaryReasonFeedbackPanel
                  decision={brDecision}
                  reason={brReason}
                  onDecision={setBrDecision}
                  onReasonChange={setBrReason}
                  onSubmit={handleSubmitBinaryReason}
                />
              )}
              {activeMode === 'debono' && (
                <DebonoFeedbackPanel
                  feedback={debonoFeedback}
                  onFeedbackChange={handleDebonoChange}
                  onSubmit={handleSubmitDebono}
                />
              )}
            </div>
          </div>

          {/* Right column: Skill Updates + Comparison */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Derived Skill Updates
            </h3>

            {skillUpdates.size === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">
                  Submit feedback in at least one mode to see derived skill updates.
                </p>
              </div>
            ) : (
              <>
                {(['binary', 'binary-reason', 'debono'] as FeedbackMode[]).map((mode) => {
                  const update = skillUpdates.get(mode)
                  if (!update) return null
                  return <SkillUpdateCard key={mode} mode={mode} update={update} />
                })}
              </>
            )}

            {results.size >= 2 && <DensityComparison results={results} />}
          </div>
        </div>
      </div>
    </div>
  )
}
