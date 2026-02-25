'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'

/**
 * Training Loop Spike
 *
 * Part of the Arena studio project.
 * Validates H1: RL patterns (propose, feedback, accumulate) work for design system creation.
 *
 * Core loop: propose -> per-option feedback -> skill update -> adapted proposal
 * After training completes, an eval phase simulates an agent interpreting the
 * accumulated skill to build a component — closing the feedback loop.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dimension = 'color' | 'typography' | 'spacing'
type Phase = 'intro' | 'training' | 'review' | 'eval'

interface OptionFeedback {
  optionLabel: string
  optionValue: string
  action: 'approve' | 'reject' | 'skip'
  reason: string
}

interface RoundResult {
  round: number
  dimension: Dimension
  proposalTitle: string
  optionFeedbacks: OptionFeedback[]
  timestamp: number
}

interface SkillDecision {
  id: string
  label: string       // role: "Primary Color", "Type Scale Ratio"
  value: string       // concrete value: "#15803D", "1.25"
  rationale: string   // user's reason for approving
  confidence: 'low' | 'medium' | 'high'
  proposalTitle: string  // which proposal this came from
}

interface SkillRule {
  id: string
  statement: string
  type: 'must' | 'should' | 'must-not' | 'prefer'
  source: string      // which decision/feedback derived this
}

interface DimensionState {
  decisions: SkillDecision[]
  rejectedValues: string[] // track rejected values for proposal adaptation, not exported
  rules: SkillRule[]
}

interface SkillState {
  color: DimensionState
  typography: DimensionState
  spacing: DimensionState
}

interface Proposal {
  id: string
  dimension: Dimension
  title: string
  description: string
  options: ProposalOption[]
  rationale: string
}

interface ProposalOption {
  label: string
  value: string
}

// ---------------------------------------------------------------------------
// Simulated proposal banks
// ---------------------------------------------------------------------------

const COLOR_PROPOSALS: Omit<Proposal, 'id' | 'rationale'>[] = [
  {
    dimension: 'color',
    title: 'Primary Color',
    description: 'Choose the foundation color for your design system. React to each option.',
    options: [
      { label: 'Deep Indigo', value: '#4338CA' },
      { label: 'Ocean Blue', value: '#0369A1' },
      { label: 'Forest Green', value: '#15803D' },
      { label: 'Warm Coral', value: '#DC2626' },
    ],
  },
  {
    dimension: 'color',
    title: 'Neutral Palette',
    description: 'Neutral tones for backgrounds, borders, and text.',
    options: [
      { label: 'Cool Slate', value: 'slate' },
      { label: 'Warm Stone', value: 'stone' },
      { label: 'True Gray', value: 'gray' },
      { label: 'Zinc', value: 'zinc' },
    ],
  },
  {
    dimension: 'color',
    title: 'Accent Color',
    description: 'An accent to complement your primary.',
    options: [
      { label: 'Amber', value: '#F59E0B' },
      { label: 'Emerald', value: '#10B981' },
      { label: 'Rose', value: '#F43F5E' },
      { label: 'Violet', value: '#8B5CF6' },
    ],
  },
]

const TYPOGRAPHY_PROPOSALS: Omit<Proposal, 'id' | 'rationale'>[] = [
  {
    dimension: 'typography',
    title: 'Type Scale Ratio',
    description: 'The mathematical ratio between each step in your type scale.',
    options: [
      { label: 'Minor Third (1.2)', value: '1.2' },
      { label: 'Major Third (1.25)', value: '1.25' },
      { label: 'Perfect Fourth (1.333)', value: '1.333' },
      { label: 'Golden Ratio (1.618)', value: '1.618' },
    ],
  },
  {
    dimension: 'typography',
    title: 'Base Font Size',
    description: 'The root size that all other sizes derive from.',
    options: [
      { label: '14px (compact)', value: '14' },
      { label: '16px (standard)', value: '16' },
      { label: '18px (generous)', value: '18' },
      { label: '20px (large)', value: '20' },
    ],
  },
  {
    dimension: 'typography',
    title: 'Font Family',
    description: 'Primary typeface for your design system.',
    options: [
      { label: 'Inter (geometric sans)', value: 'Inter' },
      { label: 'Source Serif (humanist serif)', value: 'Source Serif 4' },
      { label: 'JetBrains Mono (mono)', value: 'JetBrains Mono' },
      { label: 'DM Sans (friendly sans)', value: 'DM Sans' },
    ],
  },
]

const SPACING_PROPOSALS: Omit<Proposal, 'id' | 'rationale'>[] = [
  {
    dimension: 'spacing',
    title: 'Spacing Base Unit',
    description: 'The atomic unit all spacing derives from.',
    options: [
      { label: '4px (tight)', value: '4' },
      { label: '8px (standard)', value: '8' },
      { label: '6px (balanced)', value: '6' },
      { label: '10px (loose)', value: '10' },
    ],
  },
  {
    dimension: 'spacing',
    title: 'Spacing Scale',
    description: 'How spacing values progress.',
    options: [
      { label: 'Linear (x1, x2, x3, x4)', value: 'linear' },
      { label: 'Fibonacci (1, 2, 3, 5, 8)', value: 'fibonacci' },
      { label: 'Power of 2 (1, 2, 4, 8, 16)', value: 'power-of-2' },
      { label: 'Tailwind (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8)', value: 'tailwind' },
    ],
  },
  {
    dimension: 'spacing',
    title: 'Component Padding',
    description: 'Default internal padding for interactive elements.',
    options: [
      { label: 'Compact (8px 12px)', value: 'compact' },
      { label: 'Default (12px 16px)', value: 'default' },
      { label: 'Comfortable (16px 24px)', value: 'comfortable' },
      { label: 'Spacious (20px 32px)', value: 'spacious' },
    ],
  },
]

const PROPOSAL_BANK: Record<Dimension, Omit<Proposal, 'id' | 'rationale'>[]> = {
  color: COLOR_PROPOSALS,
  typography: TYPOGRAPHY_PROPOSALS,
  spacing: SPACING_PROPOSALS,
}

// ---------------------------------------------------------------------------
// Neutral palette swatches
// ---------------------------------------------------------------------------

const NEUTRAL_SWATCHES: Record<string, string[]> = {
  slate: ['#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#1E293B'],
  stone: ['#FAFAF9', '#E7E5E4', '#A8A29E', '#57534E', '#292524'],
  gray: ['#F9FAFB', '#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937'],
  zinc: ['#FAFAFA', '#E4E4E7', '#A1A1AA', '#52525B', '#18181B'],
}

// ---------------------------------------------------------------------------
// Agent logic
// ---------------------------------------------------------------------------

function generateRationale(
  proposal: Omit<Proposal, 'id' | 'rationale'>,
  skillState: SkillState,
  round: number
): string {
  const dimState = skillState[proposal.dimension]
  if (round === 0 || (dimState.decisions.length === 0 && dimState.rejectedValues.length === 0)) {
    return 'Starting fresh. React to each option independently — approve what resonates, reject what doesn\'t, skip what you\'re neutral on.'
  }
  const parts: string[] = []
  if (dimState.decisions.length > 0) {
    parts.push(`Building on: ${dimState.decisions.map(d => d.label + ': ' + d.value).join(', ')}.`)
  }
  if (dimState.rejectedValues.length > 0) {
    parts.push(`Filtered out ${dimState.rejectedValues.length} rejected option(s).`)
  }
  const recentRules = dimState.rules.slice(-2)
  if (recentRules.length > 0) {
    parts.push(`Rules: ${recentRules.map(r => r.statement).join('; ')}.`)
  }
  return parts.join(' ') || 'Continuing exploration.'
}

function pickNextProposal(
  dimension: Dimension,
  skillState: SkillState,
  round: number
): Proposal {
  const bank = PROPOSAL_BANK[dimension]
  const proposalIndex = Math.min(round, bank.length - 1)
  const base = bank[proposalIndex]
  const dimState = skillState[dimension]

  // Filter out options whose values were already rejected in previous rounds
  const filteredOptions = base.options.filter(
    opt => !dimState.rejectedValues.includes(opt.value)
  )

  // Also filter out options whose values were already approved (no need to re-propose)
  const approvedValues = new Set(dimState.decisions.map(d => {
    // Extract raw value from "value (label)" format
    const match = d.value.match(/^([^ ]+)/)
    return match ? match[1] : d.value
  }))
  const availableOptions = filteredOptions.filter(
    opt => !approvedValues.has(opt.value)
  )

  // Use filtered options if any remain, otherwise fall back to original
  // (don't present an empty proposal)
  const options = availableOptions.length > 0 ? availableOptions : base.options

  // Adapt the description if options were filtered
  const filtered = base.options.length - options.length
  const description = filtered > 0
    ? `${base.description} (${filtered} option${filtered > 1 ? 's' : ''} filtered based on your previous feedback)`
    : base.description

  return {
    ...base,
    options,
    description,
    id: `${dimension}-${round}-${Date.now()}`,
    rationale: generateRationale(base, skillState, round),
  }
}

// ---------------------------------------------------------------------------
// Generate skill markdown for eval
// ---------------------------------------------------------------------------

function generateSkillMarkdown(skillState: SkillState): string {
  const lines: string[] = [
    '# Design System Skill',
    '',
    '> Trained through interactive feedback. Status: drafting.',
    '',
  ]

  const dims: { key: Dimension; label: string }[] = [
    { key: 'color', label: 'Color' },
    { key: 'typography', label: 'Typography' },
    { key: 'spacing', label: 'Spacing' },
  ]

  for (const dim of dims) {
    const state = skillState[dim.key]
    if (state.decisions.length === 0 && state.rules.length === 0) continue

    lines.push(`## ${dim.label}`, '')

    if (state.decisions.length > 0) {
      lines.push('### Decisions', '')
      for (const d of state.decisions) {
        lines.push(`- **${d.label}**: \`${d.value}\` [confidence: ${d.confidence}]`)
        if (d.rationale) {
          lines.push(`  Rationale: ${d.rationale}`)
        }
      }
      lines.push('')
    }

    if (state.rules.length > 0) {
      lines.push('### Rules', '')
      for (const rule of state.rules) {
        const prefix = rule.type.charAt(0).toUpperCase() + rule.type.slice(1)
        lines.push(`- **${prefix}**: ${rule.statement}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Export skill state as structured JSON matching the skill-authoring data model.
 * This is the artifact downstream spikes (agent-compliance, session-one-export) consume.
 */
function exportSkillJSON(skillState: SkillState) {
  const dims: Dimension[] = ['color', 'typography', 'spacing']
  return {
    name: 'design-system',
    status: 'drafting',
    dimensions: dims
      .filter(d => skillState[d].decisions.length > 0)
      .map(d => ({
        dimension: d,
        decisions: skillState[d].decisions.map(dec => ({
          label: dec.label,
          value: dec.value,
          rationale: dec.rationale,
          confidence: dec.confidence,
        })),
        rules: skillState[d].rules.map(r => ({
          statement: r.statement,
          type: r.type,
        })),
      })),
    metadata: {
      version: 1,
      trainedAt: new Date().toISOString(),
    },
  }
}

// ---------------------------------------------------------------------------
// Agent eval types
// ---------------------------------------------------------------------------

interface AgentEvalResult {
  challenge: string
  interpretation: string
  decisions: { area: string; choice: string; reason: string }[]
  compliance: { token: string; expectedValue: string; usedValue: string; compliant: boolean; note: string }[]
  html: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorSwatch({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <div
      className="rounded-md border border-gray-200 dark:border-gray-700"
      style={{ backgroundColor: color, width: size, height: size }}
      title={color}
    />
  )
}

function NeutralPalettePreview({ palette }: { palette: string }) {
  const swatches = NEUTRAL_SWATCHES[palette]
  if (!swatches) return null
  return (
    <div className="flex gap-1">
      {swatches.map((c) => (
        <ColorSwatch key={c} color={c} size={24} />
      ))}
    </div>
  )
}

function TypeScalePreview({ ratio, base }: { ratio: number; base?: number }) {
  const b = base ?? 16
  const sizes = Array.from({ length: 4 }, (_, i) => Math.round(b * Math.pow(ratio, i)))
  return (
    <div className="flex items-end gap-2">
      {sizes.map((s, i) => (
        <span key={i} style={{ fontSize: s, lineHeight: 1.1 }} className="font-medium text-gray-800 dark:text-gray-200">
          Aa
        </span>
      ))}
    </div>
  )
}

function SpacingPreview({ values }: { values: number[] }) {
  return (
    <div className="flex items-end gap-1">
      {values.slice(0, 5).map((v, i) => (
        <div
          key={i}
          className="bg-blue-400 dark:bg-blue-500 rounded-sm"
          style={{ width: Math.max(v, 2), height: Math.max(v, 2), maxWidth: 48, maxHeight: 48 }}
          title={`${v}px`}
        />
      ))}
    </div>
  )
}

function OptionPreview({ option, proposal }: { option: ProposalOption; proposal: Proposal }) {
  if (proposal.dimension === 'color') {
    if (proposal.title === 'Neutral Palette') return <NeutralPalettePreview palette={option.value} />
    return <ColorSwatch color={option.value} />
  }
  if (proposal.dimension === 'typography') {
    if (proposal.title === 'Type Scale Ratio') return <TypeScalePreview ratio={parseFloat(option.value)} />
    if (proposal.title === 'Base Font Size') return <TypeScalePreview ratio={1.25} base={parseInt(option.value)} />
    return (
      <span style={{ fontFamily: option.value }} className="text-lg text-gray-800 dark:text-gray-200">
        The quick brown fox
      </span>
    )
  }
  if (proposal.dimension === 'spacing') {
    if (proposal.title === 'Spacing Base Unit') {
      const base = parseInt(option.value)
      return <SpacingPreview values={[base, base * 2, base * 3, base * 4, base * 6]} />
    }
    if (proposal.title === 'Spacing Scale') {
      const scales: Record<string, number[]> = {
        linear: [8, 16, 24, 32, 40],
        fibonacci: [8, 16, 24, 40, 64],
        'power-of-2': [8, 16, 32, 64, 128],
        tailwind: [4, 8, 12, 16, 20, 24, 32, 40],
      }
      return <SpacingPreview values={scales[option.value] ?? [8, 16, 24, 32]} />
    }
    const paddings: Record<string, number[]> = {
      compact: [8, 12],
      default: [12, 16],
      comfortable: [16, 24],
      spacious: [20, 32],
    }
    const [py, px] = paddings[option.value] ?? [12, 16]
    return (
      <div
        className="border border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-600 dark:text-gray-400 inline-block"
        style={{ padding: `${py}px ${px}px` }}
      >
        Button
      </div>
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Per-option feedback card
// ---------------------------------------------------------------------------

function PerOptionProposalCard({
  proposal,
  onRoundComplete,
}: {
  proposal: Proposal
  onRoundComplete: (feedbacks: OptionFeedback[]) => void
}) {
  const [feedbacks, setFeedbacks] = useState<Record<string, { action: 'approve' | 'reject' | 'skip'; reason: string }>>({})

  const setOptionFeedback = (label: string, action: 'approve' | 'reject' | 'skip') => {
    setFeedbacks(prev => ({
      ...prev,
      [label]: { action, reason: prev[label]?.reason ?? '' },
    }))
  }

  const setOptionReason = (label: string, reason: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [label]: { action: prev[label]?.action ?? 'skip', reason },
    }))
  }

  const reviewedCount = Object.values(feedbacks).filter(f => f.action !== 'skip' || f.reason).length
  const allReviewed = proposal.options.every(opt => feedbacks[opt.label]?.action && feedbacks[opt.label]?.action !== 'skip')

  const handleSubmit = () => {
    const result: OptionFeedback[] = proposal.options.map(opt => ({
      optionLabel: opt.label,
      optionValue: opt.value,
      action: feedbacks[opt.label]?.action ?? 'skip',
      reason: feedbacks[opt.label]?.reason ?? '',
    }))
    onRoundComplete(result)
    setFeedbacks({})
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
          {proposal.dimension}
        </span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{proposal.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{proposal.description}</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Agent Rationale</p>
        <p className="text-sm text-blue-800 dark:text-blue-300">{proposal.rationale}</p>
      </div>

      {/* Per-option feedback */}
      <div className="space-y-3">
        {proposal.options.map((opt) => {
          const fb = feedbacks[opt.label]
          const action = fb?.action
          return (
            <div
              key={opt.label}
              className={`rounded-lg border-2 p-4 transition-all ${
                action === 'approve'
                  ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10'
                  : action === 'reject'
                    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/10'
                    : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="flex-shrink-0 pt-1">
                  <OptionPreview option={opt} proposal={proposal} />
                </div>

                {/* Label + controls */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                      <span className="ml-2 text-xs text-gray-400 font-mono">{opt.value}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setOptionFeedback(opt.label, 'approve')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          action === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-400'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setOptionFeedback(opt.label, 'reject')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          action === 'reject'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400'
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {(action === 'approve' || action === 'reject') && (
                    <input
                      type="text"
                      value={fb?.reason ?? ''}
                      onChange={(e) => setOptionReason(opt.label, e.target.value)}
                      placeholder={action === 'approve' ? 'Why does this work?' : 'What\'s wrong with it?'}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit round */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400">
          {reviewedCount}/{proposal.options.length} options reviewed
        </span>
        <button
          onClick={handleSubmit}
          disabled={reviewedCount === 0}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            allReviewed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : reviewedCount > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {allReviewed ? 'Submit All Feedback' : reviewedCount > 0 ? 'Submit (skip unreviewed)' : 'Review at least one option'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill state sidebar
// ---------------------------------------------------------------------------

function SkillStatePanel({ skillState }: { skillState: SkillState }) {
  const dims: Dimension[] = ['color', 'typography', 'spacing']
  const hasAny = dims.some(d => skillState[d].decisions.length > 0)
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Skill State
      </h3>
      {dims.map((dim) => {
        const state = skillState[dim]
        if (state.decisions.length === 0 && state.rules.length === 0) return null
        return (
          <div key={dim} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">{dim}</h4>
            {state.decisions.length > 0 && (
              <div className="space-y-1">
                {state.decisions.map((d) => (
                  <div key={d.id} className="flex items-start gap-1.5">
                    <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">+</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{d.label}:</span>{' '}
                      <code className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1 rounded">{d.value}</code>
                      {d.rationale && <span className="text-gray-400"> — {d.rationale}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {state.rules.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                {state.rules.map((rule) => (
                  <div key={rule.id} className="flex items-start gap-1.5">
                    <span className={`text-xs mt-0.5 flex-shrink-0 ${
                      rule.type === 'must-not' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {rule.type === 'must-not' ? '!' : '*'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium capitalize">{rule.type}:</span> {rule.statement}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {!hasAny && (
        <p className="text-xs text-gray-400 italic">No decisions yet. Start the session to begin training.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent eval component
// ---------------------------------------------------------------------------

function AgentEvalPanel({ skillState }: { skillState: SkillState }) {
  const skillMarkdown = useMemo(() => generateSkillMarkdown(skillState), [skillState])

  // Build expected tokens list and a dynamic challenge from trained decisions
  const { expectedTokens, challenge } = useMemo(() => {
    const dims: Dimension[] = ['color', 'typography', 'spacing']
    const tokens: { label: string; value: string; dimension: string }[] = []
    for (const dim of dims) {
      for (const d of skillState[dim].decisions) {
        tokens.push({ label: d.label, value: d.value, dimension: dim })
      }
    }

    // Generate a challenge that exercises the trained tokens
    const hasColor = skillState.color.decisions.length > 0
    const hasTypography = skillState.typography.decisions.length > 0
    const hasSpacing = skillState.spacing.decisions.length > 0

    const parts: string[] = []
    if (hasColor) parts.push('using the trained color palette')
    if (hasTypography) parts.push('with the specified typography')
    if (hasSpacing) parts.push('applying the defined spacing tokens')

    const ch = tokens.length > 0
      ? `Build a notification card with a heading, body text, timestamp, and a primary action button — ${parts.join(', ')}. Every trained token must be visible in the result.`
      : 'Build a notification card with a heading, body text, timestamp, and a primary action button.'

    return { expectedTokens: tokens, challenge: ch }
  }, [skillState])

  const [evaluation, setEvaluation] = useState<AgentEvalResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [showSkill, setShowSkill] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fireEval = useCallback((controller: AbortController) => {
    async function run() {
      setLoading(true)
      setError(null)
      setEvaluation(null)
      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'arena-eval-skill',
            input: { skillMarkdown, challenge, expectedTokens },
          }),
          signal: controller.signal,
        })
        const result = await res.json()
        if (!result.success) {
          setError(result.error?.message ?? 'Evaluation failed')
        } else {
          setEvaluation(result.data)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Network error')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [skillMarkdown, challenge, expectedTokens])

  // Fire the eval call on mount
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    fireEval(controller)
    return () => { controller.abort() }
  }, [fireEval])

  const handleRetry = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fireEval(controller)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(skillMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 animate-pulse">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Agent is reading your skill...</h3>
            <p className="text-xs text-gray-400 mt-1">Claude is interpreting your trained decisions and building a component.</p>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>

        {/* Show skill file while loading */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skill Sent to Agent</h3>
            <button
              onClick={() => setShowSkill(!showSkill)}
              className="text-xs px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {showSkill ? 'Hide' : 'Show'}
            </button>
          </div>
          {showSkill && (
            <pre className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {skillMarkdown}
            </pre>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-5 text-center space-y-3">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Evaluation Failed</h3>
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">No evaluation result</h3>
        <p className="text-xs text-gray-400">The agent call may have been interrupted. Try again.</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Run Evaluation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Challenge */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Agent Challenge</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">{evaluation.challenge}</p>
      </div>

      {/* Agent interpretation */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Agent Interpretation</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">{evaluation.interpretation}</p>
      </div>

      {/* Decision trace */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Decision Trace</h3>
        <p className="text-xs text-gray-400 mb-3">How the agent applied your trained skill to each design decision:</p>
        <div className="space-y-2">
          {evaluation.decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <span className="font-medium text-gray-600 dark:text-gray-400 w-28 flex-shrink-0">{d.area}</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{d.choice}</span>
              <span className="text-gray-400 flex-1 text-right">{d.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance report */}
      {evaluation.compliance && evaluation.compliance.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Token Compliance</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              evaluation.compliance.every(c => c.compliant)
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {evaluation.compliance.filter(c => c.compliant).length}/{evaluation.compliance.length} compliant
            </span>
          </div>
          <div className="space-y-1.5">
            {evaluation.compliance.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 flex-shrink-0 ${c.compliant ? 'text-green-500' : 'text-red-500'}`}>
                  {c.compliant ? '\u2713' : '\u2717'}
                </span>
                <span className="font-medium text-gray-600 dark:text-gray-400 w-32 flex-shrink-0">{c.token}</span>
                <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{c.expectedValue}</code>
                {!c.compliant && (
                  <>
                    <span className="text-gray-400">{'\u2192'}</span>
                    <code className="text-[10px] bg-red-100 dark:bg-red-900/30 px-1 rounded text-red-600 dark:text-red-400">{c.usedValue}</code>
                  </>
                )}
                {c.note && <span className="text-gray-400 flex-1 text-right">{c.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live preview */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Agent Output</h3>
        <p className="text-xs text-gray-400 mb-4">The component the agent built using your trained skill:</p>
        <div className="flex justify-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div dangerouslySetInnerHTML={{ __html: evaluation.html }} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showCode ? 'Hide code' : 'Show code'}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={handleRetry}
            className="text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            Re-evaluate
          </button>
        </div>
        {showCode && (
          <pre className="mt-2 p-3 bg-gray-900 text-gray-300 rounded-lg text-xs overflow-x-auto">
            {evaluation.html}
          </pre>
        )}
      </div>

      {/* Skill file */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trained Skill File</h3>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setShowSkill(!showSkill)}
              className="text-xs px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {showSkill ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {showSkill && (
          <pre className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {skillMarkdown}
          </pre>
        )}
      </div>

      {/* Evaluation prompt */}
      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">Your Verdict</h3>
        <p className="text-sm text-purple-700 dark:text-purple-400">
          Does the agent&apos;s component reflect your design intent? Did the skill file capture what you meant?
          What&apos;s missing, wrong, or misinterpreted?
        </p>
        <p className="text-xs text-purple-500 dark:text-purple-500 mt-2">
          In a real Arena session, your verdict here would feed back into the skill — closing the training loop.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'color', label: 'Color' },
  { key: 'typography', label: 'Typography' },
  { key: 'spacing', label: 'Spacing' },
]

function initialSkillState(): SkillState {
  return {
    color: { decisions: [], rejectedValues: [], rules: [] },
    typography: { decisions: [], rejectedValues: [], rules: [] },
    spacing: { decisions: [], rejectedValues: [], rules: [] },
  }
}

export default function TrainingLoopSpike() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [activeDimension, setActiveDimension] = useState<Dimension>('color')
  const [roundByDimension, setRoundByDimension] = useState<Record<Dimension, number>>({
    color: 0,
    typography: 0,
    spacing: 0,
  })
  const [skillState, setSkillState] = useState<SkillState>(initialSkillState)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])

  const currentRound = roundByDimension[activeDimension]
  const maxRounds = PROPOSAL_BANK[activeDimension].length

  const currentProposal = useMemo(() => {
    if (phase !== 'training') return null
    if (currentRound >= maxRounds) return null
    return pickNextProposal(activeDimension, skillState, currentRound)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeDimension, currentRound, maxRounds])

  const handleRoundComplete = useCallback(
    (feedbacks: OptionFeedback[]) => {
      if (!currentProposal) return

      // Update skill state from per-option feedback
      setSkillState((prev) => {
        const dimState = { ...prev[activeDimension] }
        const newDecisions = [...dimState.decisions]
        const newRejectedValues = [...dimState.rejectedValues]
        const newRules = [...dimState.rules]
        let ruleCounter = newRules.length

        for (const fb of feedbacks) {
          if (fb.action === 'approve') {
            // Create a structured decision with role from proposal title
            const decision: SkillDecision = {
              id: `${activeDimension}-d${newDecisions.length + 1}`,
              label: currentProposal.title,  // "Primary Color", "Type Scale Ratio"
              value: `${fb.optionValue} (${fb.optionLabel})`,  // "#15803D (Forest Green)"
              rationale: fb.reason.trim() || `Selected from ${currentProposal.title} options`,
              confidence: fb.reason.trim() ? 'medium' : 'low',
              proposalTitle: currentProposal.title,
            }
            newDecisions.push(decision)

            // Derive a "should" rule from approval reason
            if (fb.reason.trim()) {
              ruleCounter++
              newRules.push({
                id: `${activeDimension}-r${ruleCounter}`,
                statement: fb.reason.trim(),
                type: 'prefer',
                source: `${fb.optionLabel} approval`,
              })
            }
          } else if (fb.action === 'reject') {
            // Track for proposal adaptation, but don't export
            newRejectedValues.push(fb.optionValue)

            // Derive a "must-not" or "should" avoidance rule from rejection reason
            if (fb.reason.trim()) {
              ruleCounter++
              newRules.push({
                id: `${activeDimension}-r${ruleCounter}`,
                statement: `Avoid: ${fb.reason.trim()}`,
                type: 'must-not',
                source: `${fb.optionLabel} rejection`,
              })
            }
          }
        }

        return {
          ...prev,
          [activeDimension]: { decisions: newDecisions, rejectedValues: newRejectedValues, rules: newRules },
        }
      })

      // Record round result
      setRoundResults((prev) => [
        ...prev,
        {
          round: currentRound,
          dimension: activeDimension,
          proposalTitle: currentProposal.title,
          optionFeedbacks: feedbacks,
          timestamp: Date.now(),
        },
      ])

      // Advance
      setRoundByDimension((prev) => ({
        ...prev,
        [activeDimension]: prev[activeDimension] + 1,
      }))
    },
    [activeDimension, currentProposal, currentRound]
  )

  const handleReset = () => {
    setPhase('intro')
    setActiveDimension('color')
    setRoundByDimension({ color: 0, typography: 0, spacing: 0 })
    setSkillState(initialSkillState())
    setRoundResults([])
  }

  const totalRounds = Object.values(roundByDimension).reduce((a, b) => a + b, 0)
  const totalPossible = Object.keys(PROPOSAL_BANK).reduce(
    (sum, k) => sum + PROPOSAL_BANK[k as Dimension].length,
    0
  )
  const trainingComplete = totalRounds >= totalPossible

  const totalDecisions = Object.values(skillState).reduce((sum, d) => sum + d.decisions.length, 0)
  const totalRejected = Object.values(skillState).reduce((sum, d) => sum + d.rejectedValues.length, 0)
  const totalRules = Object.values(skillState).reduce((sum, d) => sum + d.rules.length, 0)

  // Auto-transition to review when training completes
  if (phase === 'training' && trainingComplete) {
    setPhase('review')
  }

  // ---------------------------------------------------------------------------
  // Intro
  // ---------------------------------------------------------------------------

  if (phase === 'intro') {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Training Session</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Train your design system through per-option feedback. For each proposal,
              react to <em>every</em> option — approve what resonates, reject what doesn&apos;t.
              After training, an agent will interpret your skill and build a component.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-left">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.label}</p>
                <p className="text-xs text-gray-400">{PROPOSAL_BANK[d.key].length} proposals, {PROPOSAL_BANK[d.key].reduce((n, p) => n + p.options.length, 0)} options</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase('training')}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            Start Training Session
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Review (post-training, pre-eval)
  // ---------------------------------------------------------------------------

  if (phase === 'review') {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-2">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Training Complete</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDecisions} decisions, {totalRules} rules derived.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <SkillStatePanel skillState={skillState} />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setPhase('eval')}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors text-sm"
          >
            Evaluate with Agent
          </button>
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Eval phase
  // ---------------------------------------------------------------------------

  if (phase === 'eval') {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agent Evaluation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The agent reads your trained skill and attempts a component challenge.
            Does its output match your design intent?
          </p>
        </div>

        <AgentEvalPanel skillState={skillState} />

        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={() => setPhase('review')}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Back to Review
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            New Session
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Active training
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-full">
      {/* Left: Proposal area */}
      <div className="flex-1 space-y-4">
        {/* Dimension tabs */}
        <div className="flex gap-2">
          {DIMENSIONS.map((d) => {
            const dimRound = roundByDimension[d.key]
            const dimMax = PROPOSAL_BANK[d.key].length
            const isComplete = dimRound >= dimMax
            return (
              <button
                key={d.key}
                onClick={() => setActiveDimension(d.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeDimension === d.key
                    ? 'bg-blue-600 text-white'
                    : isComplete
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {d.label}
                <span className="text-xs opacity-70">{dimRound}/{dimMax}</span>
                {isComplete && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${(totalRounds / totalPossible) * 100}%` }}
          />
        </div>

        {/* Current proposal */}
        {currentProposal ? (
          <PerOptionProposalCard
            key={currentProposal.id}
            proposal={currentProposal}
            onRoundComplete={handleRoundComplete}
          />
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              All proposals in <span className="font-medium capitalize">{activeDimension}</span> reviewed.
              {!trainingComplete && ' Switch to another dimension.'}
            </p>
          </div>
        )}
      </div>

      {/* Right: Sidebar */}
      <div className="lg:w-80 space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalDecisions}</p>
              <p className="text-xs text-gray-400">Decisions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRules}</p>
              <p className="text-xs text-gray-400">Rules</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{totalRejected}</p>
              <p className="text-xs text-gray-400">Filtered</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <SkillStatePanel skillState={skillState} />
        </div>

        <button
          onClick={handleReset}
          className="w-full py-2 px-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Reset Session
        </button>
      </div>
    </div>
  )
}
