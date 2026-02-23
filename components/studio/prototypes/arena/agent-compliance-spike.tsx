'use client'

import { useState, useCallback } from 'react'

/**
 * Agent Compliance Spike
 *
 * Part of the Arena studio project.
 * Tests hypothesis H2: agents produce more design-consistent output
 * when given structured skill files.
 *
 * This spike lets you:
 * 1. Load/edit a skill file (color-primitives)
 * 2. Present component challenges to evaluate
 * 3. Simulate agent output per challenge
 * 4. Score compliance (rule adherence, token usage, aesthetic coherence)
 * 5. View results across all challenges
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillRule {
  id: string
  category: 'token-usage' | 'semantic' | 'constraint' | 'composition'
  rule: string
  weight: number // 1-3 importance
}

interface SkillFile {
  name: string
  dimension: string
  rules: SkillRule[]
}

interface ComplianceScore {
  ruleId: string
  pass: boolean
  note: string
}

interface ChallengeResult {
  challengeId: string
  scores: ComplianceScore[]
  tokenUsageRate: number   // 0-100%
  ruleAdherence: number    // 0-100%
  aestheticScore: number   // 1-5 human rating
  notes: string
}

interface Challenge {
  id: string
  name: string
  description: string
  prompt: string
  expectedTokens: string[]
  result: ChallengeResult | null
}

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const DEFAULT_SKILL: SkillFile = {
  name: 'color-primitives',
  dimension: 'Color (Level 1)',
  rules: [
    { id: 'r1', category: 'token-usage', rule: 'Always use named color tokens (e.g. --color-primary-500) instead of raw hex/rgb values', weight: 3 },
    { id: 'r2', category: 'token-usage', rule: 'Background surfaces must use --color-surface-* tokens, never primary or accent tokens', weight: 3 },
    { id: 'r3', category: 'semantic', rule: 'Destructive actions must use --color-danger-* tokens exclusively', weight: 3 },
    { id: 'r4', category: 'semantic', rule: 'Success/confirmation states must use --color-success-* tokens', weight: 2 },
    { id: 'r5', category: 'constraint', rule: 'Text on colored backgrounds must meet WCAG AA contrast (4.5:1 minimum)', weight: 3 },
    { id: 'r6', category: 'constraint', rule: 'Never use more than 3 distinct hue families in a single component', weight: 2 },
    { id: 'r7', category: 'composition', rule: 'Primary action gets --color-primary-500; secondary action gets --color-surface-200 with --color-text-primary', weight: 2 },
    { id: 'r8', category: 'composition', rule: 'Disabled states must use --color-surface-100 bg with --color-text-muted text (opacity: 0.5 is not acceptable)', weight: 2 },
    { id: 'r9', category: 'token-usage', rule: 'Borders must use --color-border-* tokens, not lightened/darkened variants of other tokens', weight: 1 },
    { id: 'r10', category: 'semantic', rule: 'Interactive focus rings must use --color-focus (derived from primary, 2px offset)', weight: 2 },
  ],
}

const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    name: 'Button Group',
    description: 'Primary, secondary, and destructive buttons with disabled states',
    prompt: 'Build a button group component with primary, secondary, danger, and disabled variants. Use the color-primitives skill.',
    expectedTokens: ['--color-primary-500', '--color-surface-200', '--color-danger-500', '--color-surface-100', '--color-text-muted', '--color-focus'],
    result: null,
  },
  {
    id: 'c2',
    name: 'Alert Card',
    description: 'Info, success, warning, and error alert cards',
    prompt: 'Build an alert card component with info, success, warning, and error variants. Each should have an icon, title, and description. Use the color-primitives skill.',
    expectedTokens: ['--color-info-500', '--color-success-500', '--color-warning-500', '--color-danger-500', '--color-surface-50', '--color-border-subtle'],
    result: null,
  },
  {
    id: 'c3',
    name: 'Form Input',
    description: 'Text input with label, placeholder, error state, and focus ring',
    prompt: 'Build a form input with label, helper text, error state, and proper focus ring. Use the color-primitives skill.',
    expectedTokens: ['--color-surface-0', '--color-border-default', '--color-danger-500', '--color-focus', '--color-text-primary', '--color-text-muted'],
    result: null,
  },
  {
    id: 'c4',
    name: 'Navigation Bar',
    description: 'Horizontal nav with active state, hover, and icon support',
    prompt: 'Build a horizontal navigation bar with 5 items, active state highlighting, hover effects, and icon placeholders. Use the color-primitives skill.',
    expectedTokens: ['--color-surface-0', '--color-primary-500', '--color-text-primary', '--color-text-secondary', '--color-border-subtle'],
    result: null,
  },
  {
    id: 'c5',
    name: 'Data Table Row',
    description: 'Table row with status badge, actions, and alternating row colors',
    prompt: 'Build a data table row component with a status badge (active/inactive/pending), action buttons (edit, delete), and support for alternating row backgrounds. Use the color-primitives skill.',
    expectedTokens: ['--color-surface-0', '--color-surface-50', '--color-success-500', '--color-danger-500', '--color-warning-500', '--color-border-subtle'],
    result: null,
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RuleBadge({ category }: { category: SkillRule['category'] }) {
  const colors: Record<SkillRule['category'], string> = {
    'token-usage': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'semantic': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'constraint': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'composition': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors[category]}`}>
      {category}
    </span>
  )
}

function WeightDots({ weight }: { weight: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`importance ${weight} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= weight ? 'bg-foreground' : 'bg-muted'}`}
        />
      ))}
    </span>
  )
}

function ScoreBar({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Aesthetic coherence rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`w-6 h-6 text-sm transition-colors ${star <= value ? 'text-amber-500' : 'text-muted-foreground/30'}`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          {star <= value ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

type View = 'skill' | 'challenges' | 'evaluate' | 'results'

function SkillPanel({ skill, onUpdateSkill }: { skill: SkillFile; onUpdateSkill: (s: SkillFile) => void }) {
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [newRuleText, setNewRuleText] = useState('')

  const addRule = () => {
    if (!newRuleText.trim()) return
    const newRule: SkillRule = {
      id: `r${Date.now()}`,
      category: 'token-usage',
      rule: newRuleText.trim(),
      weight: 2,
    }
    onUpdateSkill({ ...skill, rules: [...skill.rules, newRule] })
    setNewRuleText('')
  }

  const removeRule = (id: string) => {
    onUpdateSkill({ ...skill, rules: skill.rules.filter((r) => r.id !== id) })
  }

  const updateRule = (id: string, updates: Partial<SkillRule>) => {
    onUpdateSkill({
      ...skill,
      rules: skill.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skill File</h3>
        <div className="mt-2 flex items-baseline gap-3">
          <h2 className="text-xl font-bold">{skill.name}</h2>
          <span className="text-sm text-muted-foreground">{skill.dimension}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {skill.rules.length} rules | Weight sum: {skill.rules.reduce((s, r) => s + r.weight, 0)}
      </div>

      <div className="space-y-2">
        {skill.rules.map((rule) => (
          <div
            key={rule.id}
            className="group flex items-start gap-2 p-2 rounded-lg border border-border hover:border-foreground/20 transition-colors"
          >
            <WeightDots weight={rule.weight} />
            <div className="flex-1 min-w-0">
              {editingRule === rule.id ? (
                <div className="space-y-2">
                  <textarea
                    value={rule.rule}
                    onChange={(e) => updateRule(rule.id, { rule: e.target.value })}
                    className="w-full text-sm bg-transparent border border-border rounded p-1 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <select
                      value={rule.category}
                      onChange={(e) => updateRule(rule.id, { category: e.target.value as SkillRule['category'] })}
                      className="text-xs bg-transparent border border-border rounded px-1 py-0.5"
                    >
                      <option value="token-usage">token-usage</option>
                      <option value="semantic">semantic</option>
                      <option value="constraint">constraint</option>
                      <option value="composition">composition</option>
                    </select>
                    <select
                      value={rule.weight}
                      onChange={(e) => updateRule(rule.id, { weight: Number(e.target.value) })}
                      className="text-xs bg-transparent border border-border rounded px-1 py-0.5"
                    >
                      <option value={1}>Weight 1</option>
                      <option value={2}>Weight 2</option>
                      <option value={3}>Weight 3</option>
                    </select>
                    <button
                      onClick={() => setEditingRule(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1 cursor-pointer" onClick={() => setEditingRule(rule.id)}>
                    {rule.rule}
                  </p>
                  <RuleBadge category={rule.category} />
                </div>
              )}
            </div>
            <button
              onClick={() => removeRule(rule.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
              aria-label={`Remove rule: ${rule.rule}`}
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newRuleText}
          onChange={(e) => setNewRuleText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRule()}
          placeholder="Add a new rule..."
          className="flex-1 text-sm bg-transparent border border-border rounded-lg px-3 py-2 placeholder:text-muted-foreground/50"
        />
        <button
          onClick={addRule}
          disabled={!newRuleText.trim()}
          className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function ChallengePanel({
  challenges,
  selectedId,
  onSelect,
}: {
  challenges: Challenge[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const completedCount = challenges.filter((c) => c.result !== null).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Challenges</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount}/{challenges.length} evaluated
        </p>
      </div>

      <div className="space-y-2">
        {challenges.map((challenge) => {
          const isSelected = challenge.id === selectedId
          const isComplete = challenge.result !== null
          const adherence = challenge.result?.ruleAdherence ?? 0

          return (
            <button
              key={challenge.id}
              onClick={() => onSelect(challenge.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-foreground/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{challenge.name}</span>
                {isComplete ? (
                  <span className={`text-xs font-mono font-medium ${
                    adherence >= 80 ? 'text-green-600 dark:text-green-400' :
                    adherence >= 50 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {adherence}%
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-muted" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EvaluatePanel({
  challenge,
  skill,
  onSaveResult,
}: {
  challenge: Challenge
  skill: SkillFile
  onSaveResult: (result: ChallengeResult) => void
}) {
  const [scores, setScores] = useState<ComplianceScore[]>(
    challenge.result?.scores ??
    skill.rules.map((r) => ({ ruleId: r.id, pass: false, note: '' }))
  )
  const [aestheticScore, setAestheticScore] = useState(challenge.result?.aestheticScore ?? 3)
  const [notes, setNotes] = useState(challenge.result?.notes ?? '')

  const togglePass = useCallback((ruleId: string) => {
    setScores((prev) =>
      prev.map((s) => (s.ruleId === ruleId ? { ...s, pass: !s.pass } : s))
    )
  }, [])

  const updateNote = useCallback((ruleId: string, note: string) => {
    setScores((prev) =>
      prev.map((s) => (s.ruleId === ruleId ? { ...s, note } : s))
    )
  }, [])

  const passCount = scores.filter((s) => s.pass).length
  const totalWeight = skill.rules.reduce((sum, r) => sum + r.weight, 0)
  const passedWeight = scores
    .filter((s) => s.pass)
    .reduce((sum, s) => {
      const rule = skill.rules.find((r) => r.id === s.ruleId)
      return sum + (rule?.weight ?? 0)
    }, 0)

  const ruleAdherence = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0
  const tokenUsageRate = Math.round(
    (scores.filter((s) => {
      const rule = skill.rules.find((r) => r.id === s.ruleId)
      return rule?.category === 'token-usage' && s.pass
    }).length /
      Math.max(skill.rules.filter((r) => r.category === 'token-usage').length, 1)) *
      100
  )

  const save = () => {
    onSaveResult({
      challengeId: challenge.id,
      scores,
      tokenUsageRate,
      ruleAdherence,
      aestheticScore,
      notes,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Evaluate</h3>
        <h2 className="text-lg font-bold mt-1">{challenge.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
      </div>

      {/* Challenge prompt */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Agent Prompt</div>
        <p className="text-sm font-mono">{challenge.prompt}</p>
      </div>

      {/* Expected tokens */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expected Tokens</div>
        <div className="flex flex-wrap gap-1">
          {challenge.expectedTokens.map((token) => (
            <code key={token} className="text-[11px] px-1.5 py-0.5 rounded bg-muted font-mono">
              {token}
            </code>
          ))}
        </div>
      </div>

      {/* Rule-by-rule scoring */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Rule Compliance ({passCount}/{skill.rules.length} pass)
        </div>
        {skill.rules.map((rule) => {
          const score = scores.find((s) => s.ruleId === rule.id)
          const pass = score?.pass ?? false

          return (
            <div
              key={rule.id}
              className={`p-2 rounded-lg border transition-colors ${
                pass ? 'border-green-500/30 bg-green-500/5' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => togglePass(rule.id)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    pass
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-muted-foreground/30 text-transparent'
                  }`}
                  aria-label={`Mark rule ${pass ? 'failed' : 'passed'}: ${rule.rule}`}
                >
                  {pass ? '\u2713' : ''}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm flex-1">{rule.rule}</p>
                    <WeightDots weight={rule.weight} />
                  </div>
                  <input
                    type="text"
                    value={score?.note ?? ''}
                    onChange={(e) => updateNote(rule.id, e.target.value)}
                    placeholder="Note (optional)..."
                    className="mt-1 w-full text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary px-0 py-0.5 outline-none placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aesthetic rating */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Aesthetic Coherence
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={aestheticScore} onChange={setAestheticScore} />
          <span className="text-xs text-muted-foreground">{aestheticScore}/5</span>
        </div>
      </div>

      {/* Live score preview */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Score</div>
        <ScoreBar value={tokenUsageRate} label="Token Usage" colorClass="bg-blue-500" />
        <ScoreBar value={ruleAdherence} label="Rule Adherence (weighted)" colorClass="bg-purple-500" />
      </div>

      {/* Notes */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evaluator Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations about the agent output..."
          className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 resize-none placeholder:text-muted-foreground/50"
          rows={3}
        />
      </div>

      {/* Save */}
      <button
        onClick={save}
        className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Save Evaluation
      </button>
    </div>
  )
}

function ResultsPanel({ challenges, skill }: { challenges: Challenge[]; skill: SkillFile }) {
  const evaluated = challenges.filter((c) => c.result !== null)

  if (evaluated.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <p className="text-muted-foreground text-sm">No evaluations yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Evaluate at least one challenge to see results.</p>
        </div>
      </div>
    )
  }

  const avgTokenUsage = Math.round(evaluated.reduce((s, c) => s + (c.result?.tokenUsageRate ?? 0), 0) / evaluated.length)
  const avgAdherence = Math.round(evaluated.reduce((s, c) => s + (c.result?.ruleAdherence ?? 0), 0) / evaluated.length)
  const avgAesthetic = (evaluated.reduce((s, c) => s + (c.result?.aestheticScore ?? 0), 0) / evaluated.length).toFixed(1)

  // Per-rule pass rate across all evaluated challenges
  const rulePassRates = skill.rules.map((rule) => {
    const passes = evaluated.filter((c) => c.result?.scores.find((s) => s.ruleId === rule.id)?.pass).length
    return { rule, rate: Math.round((passes / evaluated.length) * 100) }
  })

  // Identify weakest rules
  const weakest = [...rulePassRates].sort((a, b) => a.rate - b.rate).slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Results Summary</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {evaluated.length}/{challenges.length} challenges evaluated
        </p>
      </div>

      {/* Aggregate scores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border text-center">
          <div className="text-2xl font-bold font-mono">{avgTokenUsage}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Token Usage</div>
        </div>
        <div className="p-3 rounded-lg border border-border text-center">
          <div className="text-2xl font-bold font-mono">{avgAdherence}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Rule Adherence</div>
        </div>
        <div className="p-3 rounded-lg border border-border text-center">
          <div className="text-2xl font-bold font-mono">{avgAesthetic}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Aesthetic (/5)</div>
        </div>
      </div>

      {/* Per-challenge breakdown */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Per-Challenge Breakdown</div>
        <div className="space-y-2">
          {evaluated.map((challenge) => {
            const r = challenge.result!
            return (
              <div key={challenge.id} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{challenge.name}</span>
                  <span className={`text-xs font-mono font-medium ${
                    r.ruleAdherence >= 80 ? 'text-green-600 dark:text-green-400' :
                    r.ruleAdherence >= 50 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {r.ruleAdherence}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>{' '}
                    <span className="font-mono">{r.tokenUsageRate}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rules:</span>{' '}
                    <span className="font-mono">{r.ruleAdherence}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aesthetic:</span>{' '}
                    <span className="font-mono">{r.aestheticScore}/5</span>
                  </div>
                </div>
                {r.notes && (
                  <p className="text-xs text-muted-foreground italic">{r.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Weakest rules */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Weakest Rules (lowest pass rate)
        </div>
        <div className="space-y-1">
          {weakest.map(({ rule, rate }) => (
            <div key={rule.id} className="flex items-center gap-2 p-2 rounded border border-border">
              <span className={`text-xs font-mono font-bold w-10 text-right ${
                rate >= 80 ? 'text-green-600 dark:text-green-400' :
                rate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {rate}%
              </span>
              <p className="text-xs flex-1">{rule.rule}</p>
              <RuleBadge category={rule.category} />
            </div>
          ))}
        </div>
      </div>

      {/* Full rule heatmap */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Rule Pass Rates (all rules)
        </div>
        <div className="space-y-1">
          {rulePassRates.map(({ rule, rate }) => (
            <div key={rule.id} className="flex items-center gap-2">
              <div className="w-full bg-muted rounded-full h-1.5 flex-1">
                <div
                  className={`h-1.5 rounded-full ${
                    rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-[10px] font-mono w-8 text-right text-muted-foreground">{rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hypothesis verdict */}
      <div className="p-4 rounded-lg border-2 border-dashed border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          H2 Signal
        </div>
        <p className="text-sm">
          {avgAdherence >= 80
            ? 'Strong signal: agents produce design-consistent output with structured skill files. Weighted rule adherence exceeds 80% across evaluated challenges.'
            : avgAdherence >= 50
            ? 'Mixed signal: agents partially follow skill files but show inconsistencies. Investigate weakest rules and refine skill structure.'
            : 'Weak signal: agents struggle to follow skill files reliably. Consider whether skill format, rule granularity, or prompting strategy needs revision.'
          }
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Based on {evaluated.length}/{challenges.length} challenges evaluated.
          {evaluated.length < challenges.length && ' Complete all challenges for a definitive signal.'}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AgentComplianceSpike() {
  const [view, setView] = useState<View>('challenges')
  const [skill, setSkill] = useState<SkillFile>(DEFAULT_SKILL)
  const [challenges, setChallenges] = useState<Challenge[]>(DEFAULT_CHALLENGES)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(DEFAULT_CHALLENGES[0].id)

  const selectedChallenge = challenges.find((c) => c.id === selectedChallengeId) ?? null

  const saveResult = useCallback((result: ChallengeResult) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === result.challengeId ? { ...c, result } : c))
    )
    // Auto-advance to next unevaluated challenge
    const nextUnevaluated = challenges.find(
      (c) => c.id !== result.challengeId && c.result === null
    )
    if (nextUnevaluated) {
      setSelectedChallengeId(nextUnevaluated.id)
    } else {
      setView('results')
    }
  }, [challenges])

  const navItems: { key: View; label: string }[] = [
    { key: 'skill', label: 'Skill File' },
    { key: 'challenges', label: 'Challenges' },
    { key: 'evaluate', label: 'Evaluate' },
    { key: 'results', label: 'Results' },
  ]

  const evaluatedCount = challenges.filter((c) => c.result !== null).length

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold">Agent Compliance Spike</h1>
          <p className="text-xs text-muted-foreground">
            H2: agents produce more design-consistent output when given structured skill files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            {evaluatedCount}/{challenges.length}
          </span>
          <div className="flex gap-0.5">
            {challenges.map((c) => (
              <div
                key={c.id}
                className={`w-2 h-2 rounded-full ${
                  c.result
                    ? c.result.ruleAdherence >= 80
                      ? 'bg-green-500'
                      : c.result.ruleAdherence >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="border-b border-border px-4 flex gap-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setView(item.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === item.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {view === 'skill' && (
            <SkillPanel skill={skill} onUpdateSkill={setSkill} />
          )}

          {view === 'challenges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChallengePanel
                challenges={challenges}
                selectedId={selectedChallengeId}
                onSelect={(id) => {
                  setSelectedChallengeId(id)
                  setView('evaluate')
                }}
              />
              {selectedChallenge && (
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <h3 className="font-semibold">{selectedChallenge.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedChallenge.description}</p>
                  <div className="p-2 rounded bg-muted/50 font-mono text-xs">
                    {selectedChallenge.prompt}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Expected tokens:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedChallenge.expectedTokens.map((t) => (
                        <code key={t} className="text-[10px] px-1 py-0.5 rounded bg-muted font-mono">{t}</code>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setView('evaluate')}
                    className="w-full px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    {selectedChallenge.result ? 'Re-evaluate' : 'Evaluate'}
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'evaluate' && selectedChallenge && (
            <EvaluatePanel
              key={selectedChallenge.id}
              challenge={selectedChallenge}
              skill={skill}
              onSaveResult={saveResult}
            />
          )}

          {view === 'evaluate' && !selectedChallenge && (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-sm">Select a challenge to evaluate.</p>
            </div>
          )}

          {view === 'results' && (
            <ResultsPanel challenges={challenges} skill={skill} />
          )}
        </div>
      </div>
    </div>
  )
}
