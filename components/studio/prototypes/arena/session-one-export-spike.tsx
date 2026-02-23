'use client'

/**
 * Session-One Export Spike
 *
 * Part of the Arena studio project.
 * Hypothesis H3: a single Arena session can produce a usable, exportable artifact.
 *
 * Tests whether one training session produces something you can actually install
 * and use. The pipeline: training -> skill state -> Tailwind CSS config export ->
 * preview with sample components -> copy/download.
 */

import { useState, useCallback, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColorToken {
  name: string
  value: string
  role: string
}

interface TrainingProposal {
  id: string
  tokens: ColorToken[]
  rationale: string
}

type FeedbackAction = 'approve' | 'reject' | 'modify'

interface FeedbackEntry {
  proposalId: string
  action: FeedbackAction
  reason: string
  hat?: 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue'
}

interface SkillState {
  name: string
  dimension: string
  status: 'drafting' | 'reinforcing' | 'hardened'
  tokens: ColorToken[]
  feedback: FeedbackEntry[]
  sessionCount: number
}

type SpikePhase = 'intro' | 'training' | 'review' | 'export' | 'preview'

// ---------------------------------------------------------------------------
// Seed data: proposals the "agent" presents during the mini session
// ---------------------------------------------------------------------------

const SEED_PROPOSALS: TrainingProposal[] = [
  {
    id: 'p1',
    rationale: 'Starting with a warm neutral foundation. These primitives establish the value scale for surfaces and text.',
    tokens: [
      { name: 'base-50', value: '#faf9f7', role: 'Lightest surface' },
      { name: 'base-100', value: '#f5f3f0', role: 'Default background' },
      { name: 'base-200', value: '#e8e4df', role: 'Subtle border / divider' },
      { name: 'base-700', value: '#4a4540', role: 'Secondary text' },
      { name: 'base-900', value: '#1c1917', role: 'Primary text' },
    ],
  },
  {
    id: 'p2',
    rationale: 'Introducing the accent hue. A muted teal for interactive elements, maintaining warmth through desaturation.',
    tokens: [
      { name: 'accent-400', value: '#5ba3a0', role: 'Hover state' },
      { name: 'accent-500', value: '#4a908d', role: 'Primary action' },
      { name: 'accent-600', value: '#3b7a77', role: 'Active / pressed state' },
      { name: 'accent-50', value: '#f0f7f7', role: 'Accent surface tint' },
      { name: 'accent-900', value: '#1a3533', role: 'Accent text on light' },
    ],
  },
  {
    id: 'p3',
    rationale: 'Semantic tokens derived from the primitives. These map intention to color rather than specific values.',
    tokens: [
      { name: 'surface', value: '#f5f3f0', role: 'Default page background' },
      { name: 'surface-raised', value: '#faf9f7', role: 'Cards, overlays' },
      { name: 'text-primary', value: '#1c1917', role: 'Body copy' },
      { name: 'text-muted', value: '#4a4540', role: 'Secondary, captions' },
      { name: 'interactive', value: '#4a908d', role: 'Links, buttons' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Utility: generate Tailwind config from skill state
// ---------------------------------------------------------------------------

function generateTailwindConfig(skill: SkillState): string {
  const primitives: Record<string, string> = {}
  const semantic: Record<string, string> = {}

  for (const token of skill.tokens) {
    if (token.name.includes('-') && /\d/.test(token.name)) {
      // Primitive token (e.g. base-100, accent-500)
      const [group, shade] = token.name.split('-')
      if (!primitives[group]) primitives[group] = ''
      primitives[group] += `        '${shade}': '${token.value}',\n`
    } else {
      // Semantic token
      semantic[token.name] = token.value
    }
  }

  let colors = ''
  for (const [group, shades] of Object.entries(primitives)) {
    colors += `      '${group}': {\n${shades}      },\n`
  }
  for (const [name, value] of Object.entries(semantic)) {
    colors += `      '${name}': '${value}',\n`
  }

  return `// Arena-trained color tokens
// Skill: ${skill.name}
// Status: ${skill.status}
// Sessions: ${skill.sessionCount}
// Feedback entries: ${skill.feedback.length}

import type { Config } from 'tailwindcss'

const config: Partial<Config> = {
  theme: {
    extend: {
      colors: {
${colors}      },
    },
  },
}

export default config`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorSwatch({ token }: { token: ColorToken }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="w-8 h-8 rounded border border-gray-200 shrink-0"
        style={{ backgroundColor: token.value }}
      />
      <div className="min-w-0">
        <div className="text-sm font-mono font-medium">{token.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {token.value} &middot; {token.role}
        </div>
      </div>
    </div>
  )
}

function HatBadge({ hat }: { hat: FeedbackEntry['hat'] }) {
  if (!hat) return null
  const hatConfig: Record<string, { label: string; color: string }> = {
    white: { label: 'White', color: 'bg-gray-100 text-gray-700' },
    red: { label: 'Red', color: 'bg-red-100 text-red-700' },
    black: { label: 'Black', color: 'bg-gray-800 text-white' },
    yellow: { label: 'Yellow', color: 'bg-yellow-100 text-yellow-700' },
    green: { label: 'Green', color: 'bg-green-100 text-green-700' },
    blue: { label: 'Blue', color: 'bg-blue-100 text-blue-700' },
  }
  const cfg = hatConfig[hat]
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Phase: Intro
// ---------------------------------------------------------------------------

function IntroPhase({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 mb-6" />
      <h2 className="text-xl font-bold mb-3">Session-One Export Spike</h2>
      <p className="text-gray-500 text-sm mb-2">
        Can a single training session produce a usable design artifact?
      </p>
      <p className="text-gray-400 text-xs mb-8 max-w-sm">
        You will review 3 color proposals from the agent, give feedback on each,
        then export the accumulated skill as a Tailwind CSS config you can install
        in a real project.
      </p>
      <button
        onClick={onStart}
        className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Start Training Session
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase: Training
// ---------------------------------------------------------------------------

function TrainingPhase({
  proposal,
  proposalIndex,
  totalProposals,
  onFeedback,
}: {
  proposal: TrainingProposal
  proposalIndex: number
  totalProposals: number
  onFeedback: (action: FeedbackAction, reason: string, hat?: FeedbackEntry['hat']) => void
}) {
  const [reason, setReason] = useState('')
  const [selectedHat, setSelectedHat] = useState<FeedbackEntry['hat']>(undefined)

  const hats: { key: FeedbackEntry['hat']; label: string; emoji: string }[] = [
    { key: 'red', label: 'Red (Gut)', emoji: '~' },
    { key: 'black', label: 'Black (Risk)', emoji: '!' },
    { key: 'yellow', label: 'Yellow (Value)', emoji: '+' },
    { key: 'green', label: 'Green (Ideas)', emoji: '*' },
  ]

  const handleAction = (action: FeedbackAction) => {
    onFeedback(action, reason, selectedHat)
    setReason('')
    setSelectedHat(undefined)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Proposal {proposalIndex + 1} of {totalProposals}
          </span>
          <span className="text-xs text-gray-400">Color Tokens</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-500"
            style={{ width: `${((proposalIndex + 1) / totalProposals) * 100}%` }}
          />
        </div>
      </div>

      {/* Proposal content */}
      <div className="flex-1 overflow-auto px-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 italic mb-4">&ldquo;{proposal.rationale}&rdquo;</p>
          <div className="space-y-1">
            {proposal.tokens.map((token) => (
              <ColorSwatch key={token.name} token={token} />
            ))}
          </div>
        </div>

        {/* Feedback input */}
        <div className="space-y-3 pb-6">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              De Bono hat (optional)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {hats.map((h) => (
                <button
                  key={h.key}
                  onClick={() => setSelectedHat(selectedHat === h.key ? undefined : h.key)}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                    selectedHat === h.key
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {h.emoji} {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you approving, rejecting, or modifying?"
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleAction('approve')}
              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction('modify')}
              className="flex-1 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              Modify
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase: Review (see accumulated skill)
// ---------------------------------------------------------------------------

function ReviewPhase({
  skill,
  onExport,
}: {
  skill: SkillState
  onExport: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold mb-1">Session Complete</h2>
        <p className="text-sm text-gray-500">
          Reviewed {skill.feedback.length} proposals.{' '}
          {skill.tokens.length} tokens accumulated in the skill.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {/* Skill summary */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Skill: {skill.name}</h3>
          <div className="flex gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium">
              {skill.dimension}
            </span>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
              {skill.status}
            </span>
          </div>
        </div>

        {/* Accumulated tokens */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Accumulated Tokens</h3>
          <div className="border border-gray-200 rounded-lg p-3 space-y-1">
            {skill.tokens.map((token) => (
              <ColorSwatch key={token.name} token={token} />
            ))}
          </div>
        </div>

        {/* Feedback log */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Feedback Log</h3>
          <div className="space-y-2">
            {skill.feedback.map((f, i) => (
              <div key={i} className="text-xs border border-gray-100 rounded p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-medium ${
                      f.action === 'approve'
                        ? 'text-green-600'
                        : f.action === 'reject'
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {f.action.toUpperCase()}
                  </span>
                  <HatBadge hat={f.hat} />
                </div>
                {f.reason && <p className="text-gray-600">{f.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100">
        <button
          onClick={onExport}
          className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Export as Tailwind Config
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase: Export (generated config + copy/download)
// ---------------------------------------------------------------------------

function ExportPhase({
  configCode,
  onPreview,
}: {
  configCode: string
  onPreview: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(configCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [configCode])

  const handleDownload = useCallback(() => {
    const blob = new Blob([configCode], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'arena-colors.config.ts'
    a.click()
    URL.revokeObjectURL(url)
  }, [configCode])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold mb-1">Tailwind Config Export</h2>
        <p className="text-sm text-gray-500">
          Generated from your training session. Copy or download to use in a real project.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <pre className="text-xs bg-gray-950 text-gray-100 rounded-lg p-4 overflow-auto font-mono leading-relaxed">
          {configCode}
        </pre>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Download .ts
          </button>
        </div>
        <button
          onClick={onPreview}
          className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Preview with Sample Components
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase: Preview (sample components styled with exported tokens)
// ---------------------------------------------------------------------------

function PreviewPhase({
  skill,
  onRestart,
}: {
  skill: SkillState
  onRestart: () => void
}) {
  // Build a CSS variable map from the skill tokens for inline preview
  const tokenMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of skill.tokens) {
      map[t.name] = t.value
    }
    return map
  }, [skill.tokens])

  const surface = tokenMap['surface'] || tokenMap['base-100'] || '#f5f3f0'
  const surfaceRaised = tokenMap['surface-raised'] || tokenMap['base-50'] || '#faf9f7'
  const textPrimary = tokenMap['text-primary'] || tokenMap['base-900'] || '#1c1917'
  const textMuted = tokenMap['text-muted'] || tokenMap['base-700'] || '#4a4540'
  const interactive = tokenMap['interactive'] || tokenMap['accent-500'] || '#4a908d'
  const interactiveHover = tokenMap['accent-400'] || '#5ba3a0'
  const border = tokenMap['base-200'] || '#e8e4df'
  const accentTint = tokenMap['accent-50'] || '#f0f7f7'

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold mb-1">Live Preview</h2>
        <p className="text-sm text-gray-500">
          Sample components rendered with your trained tokens. Does this look intentional?
        </p>
      </div>

      <div
        className="flex-1 overflow-auto p-6"
        style={{ backgroundColor: surface }}
      >
        <div className="max-w-md mx-auto space-y-4">
          {/* Card component */}
          <div
            className="rounded-xl p-5 shadow-sm"
            style={{ backgroundColor: surfaceRaised, border: `1px solid ${border}` }}
          >
            <h3 className="text-base font-semibold mb-1" style={{ color: textPrimary }}>
              Project Update
            </h3>
            <p className="text-sm mb-4" style={{ color: textMuted }}>
              The design system training session is complete. All color tokens have been
              reviewed and reinforced through structured feedback.
            </p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: interactive }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = interactiveHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = interactive)}
              >
                View Details
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: interactive, border: `1px solid ${border}` }}
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Input component */}
          <div
            className="rounded-xl p-5 shadow-sm"
            style={{ backgroundColor: surfaceRaised, border: `1px solid ${border}` }}
          >
            <label className="block text-sm font-medium mb-1.5" style={{ color: textPrimary }}>
              Project Name
            </label>
            <input
              type="text"
              placeholder="Enter project name..."
              className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: surface,
                border: `1px solid ${border}`,
                color: textPrimary,
              }}
              readOnly
            />
            <p className="text-xs mt-1.5" style={{ color: textMuted }}>
              Choose a descriptive name for your new project.
            </p>
          </div>

          {/* Alert / notice component */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: accentTint, border: `1px solid ${interactive}30` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: interactive }}
              >
                i
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: textPrimary }}>
                  Tokens exported successfully
                </p>
                <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                  Your Tailwind config is ready to install. Run{' '}
                  <code
                    className="px-1 py-0.5 rounded text-[11px]"
                    style={{ backgroundColor: `${interactive}15`, color: interactive }}
                  >
                    npx tailwindcss init
                  </code>{' '}
                  to merge.
                </p>
              </div>
            </div>
          </div>

          {/* Token chip list */}
          <div
            className="rounded-xl p-5 shadow-sm"
            style={{ backgroundColor: surfaceRaised, border: `1px solid ${border}` }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>
              Active Tokens
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {skill.tokens.map((token) => (
                <span
                  key={token.name}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
                  style={{ backgroundColor: surface, border: `1px solid ${border}`, color: textMuted }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: token.value }}
                  />
                  {token.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100">
        <button
          onClick={onRestart}
          className="w-full px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component: orchestrates the phases
// ---------------------------------------------------------------------------

export default function SessionOneExportSpike() {
  const [phase, setPhase] = useState<SpikePhase>('intro')
  const [currentProposal, setCurrentProposal] = useState(0)
  const [skill, setSkill] = useState<SkillState>({
    name: 'color-primitives',
    dimension: 'Color',
    status: 'drafting',
    tokens: [],
    feedback: [],
    sessionCount: 0,
  })

  // Handle feedback for the current proposal
  const handleFeedback = useCallback(
    (action: FeedbackAction, reason: string, hat?: FeedbackEntry['hat']) => {
      const proposal = SEED_PROPOSALS[currentProposal]

      setSkill((prev) => {
        const entry: FeedbackEntry = {
          proposalId: proposal.id,
          action,
          reason,
          hat,
        }

        // On approve or modify, accumulate tokens into skill.
        // On reject, skip them.
        const newTokens =
          action === 'reject'
            ? prev.tokens
            : [
                ...prev.tokens,
                ...proposal.tokens.filter(
                  (t) => !prev.tokens.some((existing) => existing.name === t.name)
                ),
              ]

        const newStatus: SkillState['status'] =
          currentProposal >= SEED_PROPOSALS.length - 1 ? 'reinforcing' : prev.status

        return {
          ...prev,
          tokens: newTokens,
          feedback: [...prev.feedback, entry],
          status: newStatus,
        }
      })

      // Advance to next proposal or review phase
      if (currentProposal < SEED_PROPOSALS.length - 1) {
        setCurrentProposal((p) => p + 1)
      } else {
        setSkill((prev) => ({ ...prev, sessionCount: prev.sessionCount + 1 }))
        setPhase('review')
      }
    },
    [currentProposal]
  )

  const configCode = useMemo(() => generateTailwindConfig(skill), [skill])

  const handleRestart = useCallback(() => {
    setPhase('intro')
    setCurrentProposal(0)
    setSkill({
      name: 'color-primitives',
      dimension: 'Color',
      status: 'drafting',
      tokens: [],
      feedback: [],
      sessionCount: 0,
    })
  }, [])

  return (
    <div className="h-full w-full flex bg-white">
      {/* Left panel: phase content */}
      <div className="flex-1 min-w-0">
        {phase === 'intro' && <IntroPhase onStart={() => setPhase('training')} />}
        {phase === 'training' && (
          <TrainingPhase
            proposal={SEED_PROPOSALS[currentProposal]}
            proposalIndex={currentProposal}
            totalProposals={SEED_PROPOSALS.length}
            onFeedback={handleFeedback}
          />
        )}
        {phase === 'review' && (
          <ReviewPhase skill={skill} onExport={() => setPhase('export')} />
        )}
        {phase === 'export' && (
          <ExportPhase configCode={configCode} onPreview={() => setPhase('preview')} />
        )}
        {phase === 'preview' && (
          <PreviewPhase skill={skill} onRestart={handleRestart} />
        )}
      </div>

      {/* Right sidebar: persistent skill state (visible during training+) */}
      {phase !== 'intro' && (
        <div className="w-64 border-l border-gray-100 flex flex-col bg-gray-50/50">
          <div className="px-4 pt-5 pb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Skill State
            </h3>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">{skill.name}</div>
                <div className="text-xs text-gray-400">{skill.dimension}</div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                  {skill.status}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                  {skill.tokens.length} tokens
                </span>
              </div>
              {skill.tokens.length > 0 && (
                <div className="space-y-0.5">
                  {skill.tokens.map((token) => (
                    <div key={token.name} className="flex items-center gap-2 py-0.5">
                      <div
                        className="w-3.5 h-3.5 rounded border border-gray-200 shrink-0"
                        style={{ backgroundColor: token.value }}
                      />
                      <span className="text-[11px] font-mono text-gray-600 truncate">
                        {token.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {skill.feedback.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Feedback
                  </div>
                  {skill.feedback.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 py-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          f.action === 'approve'
                            ? 'bg-green-500'
                            : f.action === 'reject'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="text-[11px] text-gray-500 truncate">
                        {f.action}
                        {f.hat ? ` (${f.hat})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
