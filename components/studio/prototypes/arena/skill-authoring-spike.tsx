'use client'

/**
 * Skill Authoring Spike
 *
 * Part of the Arena studio project (H4: skill data model can capture design intent).
 *
 * A functional prototype for hand-authoring a `color-primitives` skill file.
 * Tests whether the proposed data model (status, decisions, rules, exemplars,
 * feedback log) can capture enough design intent to be both human-readable
 * and machine-actionable.
 *
 * Three views:
 * 1. Structured editor (JSON-backed form)
 * 2. Rendered skill preview (human-readable)
 * 3. Markdown export (machine-actionable skill file)
 */

import { useState, useCallback, useMemo } from 'react'

// ─── Data Model ──────────────────────────────────────────────────────────────

type SkillStatus = 'drafting' | 'reinforcing' | 'hardened'

interface Decision {
  id: string
  label: string
  value: string
  rationale: string
  confidence: 'low' | 'medium' | 'high'
  session?: number
}

interface Rule {
  id: string
  statement: string
  type: 'must' | 'should' | 'must-not' | 'prefer'
  rationale: string
  validatable: boolean
  check?: string // automated check description
}

interface Exemplar {
  id: string
  name: string
  value: string
  usage: string
  rationale: string
  tokens?: Record<string, string> // derived token names -> values
}

interface FeedbackEntry {
  id: string
  session: number
  hat: 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue'
  signal: string
  applied: boolean
  resultingChange?: string
}

interface Skill {
  name: string
  dimension: string
  level: number
  status: SkillStatus
  description: string
  decisions: Decision[]
  rules: Rule[]
  exemplars: Exemplar[]
  feedbackLog: FeedbackEntry[]
  metadata: {
    version: number
    sessions: number
    lastUpdated: string
    dependencies: string[]
  }
}

// ─── Initial Data ────────────────────────────────────────────────────────────

const INITIAL_SKILL: Skill = {
  name: 'color-primitives',
  dimension: 'Color',
  level: 1,
  status: 'drafting',
  description: 'Primitive color tokens defining the foundational palette. All semantic and component-level color usage derives from these primitives.',
  decisions: [
    {
      id: 'd1',
      label: 'Color space',
      value: 'oklch',
      rationale: 'OKLCH provides perceptually uniform lightness, making it possible to generate palettes where perceived brightness is consistent across hues. This matters for accessible contrast ratios.',
      confidence: 'high',
      session: 1,
    },
    {
      id: 'd2',
      label: 'Primary hue',
      value: '250 (blue-violet)',
      rationale: 'Selected for versatility: works for both professional/technical and creative/expressive contexts. High chroma at this hue without clipping in sRGB gamut.',
      confidence: 'medium',
      session: 1,
    },
    {
      id: 'd3',
      label: 'Neutral base',
      value: 'Desaturated cool gray (chroma: 0.01, hue: 250)',
      rationale: 'A tiny amount of chroma in neutrals creates visual warmth without apparent color. Tied to the primary hue for cohesion.',
      confidence: 'medium',
      session: 1,
    },
    {
      id: 'd4',
      label: 'Scale steps',
      value: '50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950',
      rationale: 'Standard 11-step scale with 50 and 950 for edge cases. Lightness values are evenly distributed in OKLCH L channel (0.97 to 0.15).',
      confidence: 'high',
      session: 1,
    },
    {
      id: 'd5',
      label: 'Accent hues',
      value: 'Success: 145 (green), Warning: 85 (amber), Danger: 25 (red), Info: 220 (cyan)',
      rationale: 'Standard semantic mappings with hues selected for maximum distinctiveness from each other and from primary. All tested for deuteranopia and protanopia distinguishability.',
      confidence: 'low',
    },
  ],
  rules: [
    {
      id: 'r1',
      statement: 'All color values MUST be specified in OKLCH format as the source of truth',
      type: 'must',
      rationale: 'Perceptual uniformity ensures predictable contrast. sRGB hex values are derived, never authored directly.',
      validatable: true,
      check: 'Regex: /oklch\\([\\d.]+\\s+[\\d.]+\\s+[\\d.]+\\)/',
    },
    {
      id: 'r2',
      statement: 'Adjacent scale steps (e.g., 400/500) MUST have a minimum contrast ratio of 1.25:1',
      type: 'must',
      rationale: 'Ensures visual distinction between adjacent shades in the same palette.',
      validatable: true,
      check: 'Calculate WCAG contrast ratio between each adjacent pair',
    },
    {
      id: 'r3',
      statement: 'Text color on any background MUST meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text)',
      type: 'must',
      rationale: 'Non-negotiable accessibility requirement.',
      validatable: true,
      check: 'WCAG contrast ratio check for all text/bg combinations in the token set',
    },
    {
      id: 'r4',
      statement: 'Chroma values SHOULD be clamped to sRGB gamut to avoid rendering artifacts',
      type: 'should',
      rationale: 'Wide-gamut displays are not yet universal. Out-of-gamut colors will be clipped unpredictably by browsers.',
      validatable: true,
      check: 'Convert OKLCH to sRGB and verify all channels are in [0, 1]',
    },
    {
      id: 'r5',
      statement: 'PREFER warm neutrals over pure gray for body text and backgrounds',
      type: 'prefer',
      rationale: 'Pure gray feels clinical. A hint of warmth (via chroma tied to primary hue) creates a more inviting visual tone.',
      validatable: false,
    },
    {
      id: 'r6',
      statement: 'Palette MUST NOT include pure black (#000) or pure white (#fff) as tokens',
      type: 'must-not',
      rationale: 'Pure black/white create harsh contrast. The darkest and lightest tokens should retain a trace of hue.',
      validatable: true,
      check: 'Verify no token resolves to #000000 or #ffffff',
    },
  ],
  exemplars: [
    {
      id: 'e1',
      name: 'primary-500',
      value: 'oklch(0.55 0.18 250)',
      usage: 'Primary interactive elements: buttons, links, active states',
      rationale: 'Mid-point of the primary scale. Sufficient contrast on white backgrounds for large text/icons.',
      tokens: { '--color-primary-500': 'oklch(0.55 0.18 250)' },
    },
    {
      id: 'e2',
      name: 'primary-100',
      value: 'oklch(0.93 0.04 250)',
      usage: 'Subtle backgrounds: selected states, hover highlights, info banners',
      rationale: 'Very light tint of primary. Low chroma prevents it from feeling too colorful in large areas.',
      tokens: { '--color-primary-100': 'oklch(0.93 0.04 250)' },
    },
    {
      id: 'e3',
      name: 'neutral-900',
      value: 'oklch(0.20 0.01 250)',
      usage: 'Primary body text color',
      rationale: 'Near-black with a trace of primary hue. Softer than pure black while maintaining strong contrast on light backgrounds.',
      tokens: { '--color-neutral-900': 'oklch(0.20 0.01 250)' },
    },
    {
      id: 'e4',
      name: 'neutral-50',
      value: 'oklch(0.97 0.005 250)',
      usage: 'Page background, card surfaces',
      rationale: 'Near-white with minimal hue. Creates a warmer feel than #fafafa without being noticeably colored.',
      tokens: { '--color-neutral-50': 'oklch(0.97 0.005 250)' },
    },
    {
      id: 'e5',
      name: 'danger-500',
      value: 'oklch(0.55 0.20 25)',
      usage: 'Error messages, destructive action buttons, alert borders',
      rationale: 'Red at the same perceived lightness as primary-500 for visual consistency. Higher chroma for urgency.',
      tokens: { '--color-danger-500': 'oklch(0.55 0.20 25)' },
    },
  ],
  feedbackLog: [
    {
      id: 'f1',
      session: 1,
      hat: 'white',
      signal: 'OKLCH lightness values: 50=0.97, 100=0.93, 200=0.87, 300=0.78, 400=0.68, 500=0.55, 600=0.45, 700=0.37, 800=0.28, 900=0.20, 950=0.15',
      applied: true,
      resultingChange: 'Encoded lightness values into decision d4',
    },
    {
      id: 'f2',
      session: 1,
      hat: 'red',
      signal: 'The primary-500 feels slightly too saturated for professional use. It reads more "playful" than "capable".',
      applied: false,
    },
    {
      id: 'f3',
      session: 1,
      hat: 'black',
      signal: 'Accent hue selection (d5) has not been tested for color blindness distinguishability. Green (145) and amber (85) may be confusable under deuteranopia.',
      applied: true,
      resultingChange: 'Added color blindness testing note to d5 rationale. Marked confidence as "low" until validated.',
    },
    {
      id: 'f4',
      session: 1,
      hat: 'green',
      signal: 'What if neutrals used a completely separate hue (warm beige ~60) instead of desaturated primary? Could feel more natural.',
      applied: false,
    },
  ],
  metadata: {
    version: 1,
    sessions: 1,
    lastUpdated: '2026-02-22',
    dependencies: [],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 8)
}

const HAT_COLORS: Record<FeedbackEntry['hat'], { bg: string; text: string; label: string }> = {
  white: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Factual' },
  red: { bg: 'bg-red-100', text: 'text-red-700', label: 'Gut feel' },
  black: { bg: 'bg-gray-800', text: 'text-gray-100', label: 'Risks' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Benefits' },
  green: { bg: 'bg-green-100', text: 'text-green-700', label: 'Alternatives' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Process' },
}

const RULE_TYPE_LABELS: Record<Rule['type'], { label: string; color: string }> = {
  must: { label: 'MUST', color: 'bg-red-600 text-white' },
  'must-not': { label: 'MUST NOT', color: 'bg-red-800 text-white' },
  should: { label: 'SHOULD', color: 'bg-amber-500 text-white' },
  prefer: { label: 'PREFER', color: 'bg-blue-500 text-white' },
}

const STATUS_STYLES: Record<SkillStatus, { bg: string; text: string }> = {
  drafting: { bg: 'bg-amber-100', text: 'text-amber-800' },
  reinforcing: { bg: 'bg-blue-100', text: 'text-blue-800' },
  hardened: { bg: 'bg-green-100', text: 'text-green-800' },
}

const CONFIDENCE_STYLES: Record<Decision['confidence'], string> = {
  low: 'text-red-600',
  medium: 'text-amber-600',
  high: 'text-green-600',
}

// ─── Markdown Export ─────────────────────────────────────────────────────────

function exportSkillToMarkdown(skill: Skill): string {
  const lines: string[] = []

  lines.push(`# Skill: ${skill.name}`)
  lines.push('')
  lines.push(`> ${skill.description}`)
  lines.push('')
  lines.push(`| Property | Value |`)
  lines.push(`|----------|-------|`)
  lines.push(`| **Dimension** | ${skill.dimension} |`)
  lines.push(`| **Level** | ${skill.level} |`)
  lines.push(`| **Status** | ${skill.status} |`)
  lines.push(`| **Version** | ${skill.metadata.version} |`)
  lines.push(`| **Sessions** | ${skill.metadata.sessions} |`)
  lines.push(`| **Last Updated** | ${skill.metadata.lastUpdated} |`)
  if (skill.metadata.dependencies.length > 0) {
    lines.push(`| **Dependencies** | ${skill.metadata.dependencies.join(', ')} |`)
  }
  lines.push('')

  // Decisions
  lines.push('## Decisions')
  lines.push('')
  for (const d of skill.decisions) {
    const conf = d.confidence === 'high' ? '' : ` _(confidence: ${d.confidence})_`
    lines.push(`### ${d.label}`)
    lines.push('')
    lines.push(`**Value:** ${d.value}${conf}`)
    lines.push('')
    lines.push(`**Rationale:** ${d.rationale}`)
    lines.push('')
  }

  // Rules
  lines.push('## Rules')
  lines.push('')
  for (const r of skill.rules) {
    const badge = r.type.toUpperCase()
    const checkNote = r.validatable && r.check ? ` _[Automated check: ${r.check}]_` : ''
    lines.push(`- **[${badge}]** ${r.statement}${checkNote}`)
    lines.push(`  - _Rationale:_ ${r.rationale}`)
  }
  lines.push('')

  // Exemplars
  lines.push('## Exemplars')
  lines.push('')
  lines.push('| Token | Value | Usage |')
  lines.push('|-------|-------|-------|')
  for (const e of skill.exemplars) {
    lines.push(`| \`${e.name}\` | \`${e.value}\` | ${e.usage} |`)
  }
  lines.push('')
  for (const e of skill.exemplars) {
    lines.push(`### ${e.name}`)
    lines.push(`- **Value:** \`${e.value}\``)
    lines.push(`- **Usage:** ${e.usage}`)
    lines.push(`- **Rationale:** ${e.rationale}`)
    if (e.tokens) {
      lines.push('- **CSS Custom Properties:**')
      for (const [name, val] of Object.entries(e.tokens)) {
        lines.push(`  - \`${name}: ${val};\``)
      }
    }
    lines.push('')
  }

  // Feedback Log
  if (skill.feedbackLog.length > 0) {
    lines.push('## Feedback Log')
    lines.push('')
    for (const f of skill.feedbackLog) {
      const hatLabel = `[${f.hat.toUpperCase()}]`
      const applied = f.applied ? 'Applied' : 'Noted'
      lines.push(`- **Session ${f.session}** ${hatLabel} _(${applied})_: ${f.signal}`)
      if (f.resultingChange) {
        lines.push(`  - _Change:_ ${f.resultingChange}`)
      }
    }
    lines.push('')
  }

  lines.push('---')
  lines.push(`_Generated from Arena skill data model v${skill.metadata.version}_`)

  return lines.join('\n')
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SkillHeader({ skill, onStatusChange }: { skill: Skill; onStatusChange: (s: SkillStatus) => void }) {
  const statusStyle = STATUS_STYLES[skill.status]
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-bold font-mono truncate">{skill.name}</h2>
          <select
            value={skill.status}
            onChange={(e) => onStatusChange(e.target.value as SkillStatus)}
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusStyle.bg} ${statusStyle.text}`}
          >
            <option value="drafting">Drafting</option>
            <option value="reinforcing">Reinforcing</option>
            <option value="hardened">Hardened</option>
          </select>
        </div>
        <p className="text-sm text-muted-foreground">{skill.description}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground shrink-0">
        <div>Level {skill.level} &middot; {skill.dimension}</div>
        <div>v{skill.metadata.version} &middot; {skill.metadata.sessions} session{skill.metadata.sessions !== 1 ? 's' : ''}</div>
      </div>
    </div>
  )
}

function DecisionsPanel({
  decisions,
  onUpdate,
  onAdd,
  onRemove,
}: {
  decisions: Decision[]
  onUpdate: (id: string, updates: Partial<Decision>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decisions</h3>
        <button onClick={onAdd} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {decisions.map((d) => (
          <div
            key={d.id}
            className="border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{d.label}</span>
                <span className="text-xs text-muted-foreground font-mono truncate">{d.value}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold ${CONFIDENCE_STYLES[d.confidence]}`}>
                  {d.confidence}
                </span>
                <span className="text-muted-foreground text-xs">{expandedId === d.id ? '\u25B2' : '\u25BC'}</span>
              </div>
            </button>
            {expandedId === d.id && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-muted/30">
                <div>
                  <label className="text-xs text-muted-foreground">Label</label>
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => onUpdate(d.id, { label: e.target.value })}
                    className="w-full text-sm px-2 py-1 border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Value</label>
                  <input
                    type="text"
                    value={d.value}
                    onChange={(e) => onUpdate(d.id, { value: e.target.value })}
                    className="w-full text-sm px-2 py-1 border rounded bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rationale</label>
                  <textarea
                    value={d.rationale}
                    onChange={(e) => onUpdate(d.id, { rationale: e.target.value })}
                    rows={2}
                    className="w-full text-sm px-2 py-1 border rounded bg-background resize-y"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Confidence</label>
                    <select
                      value={d.confidence}
                      onChange={(e) => onUpdate(d.id, { confidence: e.target.value as Decision['confidence'] })}
                      className="text-sm px-2 py-1 border rounded bg-background ml-1"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <button
                    onClick={() => onRemove(d.id)}
                    className="text-xs text-red-600 hover:text-red-700 ml-auto"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RulesPanel({
  rules,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rules: Rule[]
  onUpdate: (id: string, updates: Partial<Rule>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rules</h3>
        <button onClick={onAdd} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {rules.map((r) => {
          const typeStyle = RULE_TYPE_LABELS[r.type]
          return (
            <div key={r.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${typeStyle.color}`}>
                  {typeStyle.label}
                </span>
                <span className="text-sm flex-1">{r.statement}</span>
                <span className="text-muted-foreground text-xs shrink-0">{expandedId === r.id ? '\u25B2' : '\u25BC'}</span>
              </button>
              {expandedId === r.id && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-muted/30">
                  <div>
                    <label className="text-xs text-muted-foreground">Statement</label>
                    <textarea
                      value={r.statement}
                      onChange={(e) => onUpdate(r.id, { statement: e.target.value })}
                      rows={2}
                      className="w-full text-sm px-2 py-1 border rounded bg-background resize-y"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <select
                        value={r.type}
                        onChange={(e) => onUpdate(r.id, { type: e.target.value as Rule['type'] })}
                        className="text-sm px-2 py-1 border rounded bg-background ml-1"
                      >
                        <option value="must">MUST</option>
                        <option value="must-not">MUST NOT</option>
                        <option value="should">SHOULD</option>
                        <option value="prefer">PREFER</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={r.validatable}
                        onChange={(e) => onUpdate(r.id, { validatable: e.target.checked })}
                      />
                      Validatable
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rationale</label>
                    <textarea
                      value={r.rationale}
                      onChange={(e) => onUpdate(r.id, { rationale: e.target.value })}
                      rows={2}
                      className="w-full text-sm px-2 py-1 border rounded bg-background resize-y"
                    />
                  </div>
                  {r.validatable && (
                    <div>
                      <label className="text-xs text-muted-foreground">Automated check</label>
                      <input
                        type="text"
                        value={r.check || ''}
                        onChange={(e) => onUpdate(r.id, { check: e.target.value })}
                        className="w-full text-sm px-2 py-1 border rounded bg-background font-mono"
                        placeholder="Describe the automated validation..."
                      />
                    </div>
                  )}
                  <button
                    onClick={() => onRemove(r.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExemplarsPanel({
  exemplars,
  onUpdate,
  onAdd,
  onRemove,
}: {
  exemplars: Exemplar[]
  onUpdate: (id: string, updates: Partial<Exemplar>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exemplars</h3>
        <button onClick={onAdd} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
          + Add
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {exemplars.map((e) => (
          <div key={e.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ColorSwatch value={e.value} />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={e.name}
                  onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
                  className="text-sm font-mono font-semibold bg-transparent border-0 p-0 w-full focus:outline-none focus:ring-0"
                />
                <input
                  type="text"
                  value={e.value}
                  onChange={(ev) => onUpdate(e.id, { value: ev.target.value })}
                  className="text-xs font-mono text-muted-foreground bg-transparent border-0 p-0 w-full focus:outline-none focus:ring-0"
                />
              </div>
              <button
                onClick={() => onRemove(e.id)}
                className="text-xs text-red-600 hover:text-red-700 shrink-0"
              >
                x
              </button>
            </div>
            <input
              type="text"
              value={e.usage}
              onChange={(ev) => onUpdate(e.id, { usage: ev.target.value })}
              className="w-full text-xs px-2 py-1 border rounded bg-background"
              placeholder="Usage..."
            />
            <textarea
              value={e.rationale}
              onChange={(ev) => onUpdate(e.id, { rationale: ev.target.value })}
              rows={1}
              className="w-full text-xs px-2 py-1 border rounded bg-background resize-y"
              placeholder="Rationale..."
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ColorSwatch({ value }: { value: string }) {
  // Try to render the OKLCH color
  return (
    <div
      className="w-8 h-8 rounded border shrink-0"
      style={{ backgroundColor: value }}
      title={value}
    />
  )
}

function FeedbackLogPanel({
  feedback,
  onAdd,
  onToggleApplied,
}: {
  feedback: FeedbackEntry[]
  onAdd: (entry: Omit<FeedbackEntry, 'id'>) => void
  onToggleApplied: (id: string) => void
}) {
  const [newHat, setNewHat] = useState<FeedbackEntry['hat']>('white')
  const [newSignal, setNewSignal] = useState('')

  const handleAdd = () => {
    if (!newSignal.trim()) return
    const maxSession = feedback.reduce((max, f) => Math.max(max, f.session), 0)
    onAdd({
      session: maxSession || 1,
      hat: newHat,
      signal: newSignal.trim(),
      applied: false,
    })
    setNewSignal('')
  }

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Feedback Log</h3>

      {/* Add new feedback */}
      <div className="border rounded-lg p-3 mb-3 space-y-2 bg-muted/30">
        <div className="flex gap-2">
          <select
            value={newHat}
            onChange={(e) => setNewHat(e.target.value as FeedbackEntry['hat'])}
            className="text-xs px-2 py-1 border rounded bg-background"
          >
            {Object.entries(HAT_COLORS).map(([hat, { label }]) => (
              <option key={hat} value={hat}>{label} ({hat})</option>
            ))}
          </select>
          <input
            type="text"
            value={newSignal}
            onChange={(e) => setNewSignal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 text-sm px-2 py-1 border rounded bg-background"
            placeholder="Enter feedback signal..."
          />
          <button
            onClick={handleAdd}
            disabled={!newSignal.trim()}
            className="text-xs px-3 py-1 rounded bg-foreground text-background disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
      </div>

      {/* Existing feedback */}
      <div className="space-y-1.5">
        {feedback.map((f) => {
          const hatStyle = HAT_COLORS[f.hat]
          return (
            <div key={f.id} className="flex items-start gap-2 text-sm">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${hatStyle.bg} ${hatStyle.text}`}>
                {f.hat.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <span className={f.applied ? '' : 'text-muted-foreground'}>{f.signal}</span>
                {f.resultingChange && (
                  <div className="text-xs text-green-600 mt-0.5">Applied: {f.resultingChange}</div>
                )}
              </div>
              <button
                onClick={() => onToggleApplied(f.id)}
                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${f.applied ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}
              >
                {f.applied ? 'Applied' : 'Noted'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [markdown])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground">color-primitives.md</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed">
        {markdown}
      </pre>
    </div>
  )
}

function JsonView({ skill }: { skill: Skill }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(skill, null, 2)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [json])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground">skill.json</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed">
        {json}
      </pre>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

type ViewMode = 'editor' | 'markdown' | 'json'

export default function SkillAuthoringSpike() {
  const [skill, setSkill] = useState<Skill>(INITIAL_SKILL)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')

  const markdown = useMemo(() => exportSkillToMarkdown(skill), [skill])

  // ── Updaters ──

  const updateStatus = useCallback((status: SkillStatus) => {
    setSkill((s) => ({ ...s, status }))
  }, [])

  const updateDecision = useCallback((id: string, updates: Partial<Decision>) => {
    setSkill((s) => ({
      ...s,
      decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }))
  }, [])

  const addDecision = useCallback(() => {
    setSkill((s) => ({
      ...s,
      decisions: [
        ...s.decisions,
        {
          id: generateId(),
          label: 'New decision',
          value: '',
          rationale: '',
          confidence: 'low' as const,
        },
      ],
    }))
  }, [])

  const removeDecision = useCallback((id: string) => {
    setSkill((s) => ({
      ...s,
      decisions: s.decisions.filter((d) => d.id !== id),
    }))
  }, [])

  const updateRule = useCallback((id: string, updates: Partial<Rule>) => {
    setSkill((s) => ({
      ...s,
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
  }, [])

  const addRule = useCallback(() => {
    setSkill((s) => ({
      ...s,
      rules: [
        ...s.rules,
        {
          id: generateId(),
          statement: 'New rule',
          type: 'should' as const,
          rationale: '',
          validatable: false,
        },
      ],
    }))
  }, [])

  const removeRule = useCallback((id: string) => {
    setSkill((s) => ({
      ...s,
      rules: s.rules.filter((r) => r.id !== id),
    }))
  }, [])

  const updateExemplar = useCallback((id: string, updates: Partial<Exemplar>) => {
    setSkill((s) => ({
      ...s,
      exemplars: s.exemplars.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))
  }, [])

  const addExemplar = useCallback(() => {
    setSkill((s) => ({
      ...s,
      exemplars: [
        ...s.exemplars,
        {
          id: generateId(),
          name: 'new-token',
          value: 'oklch(0.50 0.10 250)',
          usage: '',
          rationale: '',
        },
      ],
    }))
  }, [])

  const removeExemplar = useCallback((id: string) => {
    setSkill((s) => ({
      ...s,
      exemplars: s.exemplars.filter((e) => e.id !== id),
    }))
  }, [])

  const addFeedback = useCallback((entry: Omit<FeedbackEntry, 'id'>) => {
    setSkill((s) => ({
      ...s,
      feedbackLog: [...s.feedbackLog, { ...entry, id: generateId() }],
    }))
  }, [])

  const toggleFeedbackApplied = useCallback((id: string) => {
    setSkill((s) => ({
      ...s,
      feedbackLog: s.feedbackLog.map((f) =>
        f.id === id ? { ...f, applied: !f.applied } : f
      ),
    }))
  }, [])

  // ── Stats ──

  const stats = useMemo(() => {
    const highConfidence = skill.decisions.filter((d) => d.confidence === 'high').length
    const musts = skill.rules.filter((r) => r.type === 'must' || r.type === 'must-not').length
    const validatable = skill.rules.filter((r) => r.validatable).length
    const applied = skill.feedbackLog.filter((f) => f.applied).length
    return {
      decisions: skill.decisions.length,
      highConfidence,
      rules: skill.rules.length,
      musts,
      validatable,
      exemplars: skill.exemplars.length,
      feedback: skill.feedbackLog.length,
      applied,
    }
  }, [skill])

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-1">
          {(['editor', 'markdown', 'json'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                viewMode === mode
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {mode === 'editor' ? 'Editor' : mode === 'markdown' ? 'Markdown' : 'JSON'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{stats.decisions} decisions ({stats.highConfidence} high)</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{stats.rules} rules ({stats.musts} must, {stats.validatable} validatable)</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{stats.exemplars} exemplars</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{stats.feedback} feedback ({stats.applied} applied)</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'editor' && (
          <div className="h-full overflow-auto">
            <div className="max-w-3xl mx-auto p-6 space-y-8">
              <SkillHeader skill={skill} onStatusChange={updateStatus} />
              <DecisionsPanel
                decisions={skill.decisions}
                onUpdate={updateDecision}
                onAdd={addDecision}
                onRemove={removeDecision}
              />
              <RulesPanel
                rules={skill.rules}
                onUpdate={updateRule}
                onAdd={addRule}
                onRemove={removeRule}
              />
              <ExemplarsPanel
                exemplars={skill.exemplars}
                onUpdate={updateExemplar}
                onAdd={addExemplar}
                onRemove={removeExemplar}
              />
              <FeedbackLogPanel
                feedback={skill.feedbackLog}
                onAdd={addFeedback}
                onToggleApplied={toggleFeedbackApplied}
              />
            </div>
          </div>
        )}
        {viewMode === 'markdown' && <MarkdownPreview markdown={markdown} />}
        {viewMode === 'json' && <JsonView skill={skill} />}
      </div>
    </div>
  )
}
