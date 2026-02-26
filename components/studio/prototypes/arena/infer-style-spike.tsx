'use client'

import { useState, useCallback, useMemo } from 'react'

/**
 * Infer Style Spike
 *
 * Part of the Arena studio project.
 * Validates H6: Multimodal agents can reverse-engineer a usable design skill
 * from screenshots and URLs of existing interfaces.
 *
 * Flow:
 * 1. User adds inputs (URLs, images) one at a time
 * 2. Multimodal agent analyzes each input, refining the inferred skill state
 * 3. Canonical components (card, form) render with base skill for comparison
 * 4. Same components render with inferred skill for compliance evaluation
 */

// ---------------------------------------------------------------------------
// Types — shared with training-loop-spike skill data model
// ---------------------------------------------------------------------------

interface SkillDecision {
  id: string
  label: string
  value: string
  rationale: string
  confidence: 'low' | 'medium' | 'high'
  source: string // which input this was inferred from
}

interface SkillRule {
  id: string
  statement: string
  type: 'must' | 'should' | 'must-not' | 'prefer'
  source: string
}

interface DimensionState {
  decisions: SkillDecision[]
  rules: SkillRule[]
}

interface SkillState {
  color: DimensionState
  typography: DimensionState
  spacing: DimensionState
}

type InputType = 'url' | 'image'

interface StyleInput {
  id: string
  type: InputType
  value: string // URL string or base64 data URL
  label: string // user-friendly label
  addedAt: number
}

interface InferenceResult {
  inputId: string
  skillDelta: Partial<SkillState> // what changed from this input
  summary: string // agent's summary of what it found
}

type Phase = 'collect' | 'review' | 'compare'

// ---------------------------------------------------------------------------
// Base skill — the neutral default for canonical components
// ---------------------------------------------------------------------------

const BASE_SKILL: SkillState = {
  color: {
    decisions: [
      { id: 'base-c1', label: 'Primary', value: '#3B82F6', rationale: 'Standard blue', confidence: 'high', source: 'base' },
      { id: 'base-c2', label: 'Accent', value: '#8B5CF6', rationale: 'Purple accent', confidence: 'high', source: 'base' },
      { id: 'base-c3', label: 'Background', value: '#FFFFFF', rationale: 'White background', confidence: 'high', source: 'base' },
      { id: 'base-c4', label: 'Text', value: '#1F2937', rationale: 'Dark gray text', confidence: 'high', source: 'base' },
      { id: 'base-c5', label: 'Muted', value: '#6B7280', rationale: 'Gray for secondary text', confidence: 'high', source: 'base' },
      { id: 'base-c6', label: 'Border', value: '#E5E7EB', rationale: 'Light gray border', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
  typography: {
    decisions: [
      { id: 'base-t1', label: 'Display Font', value: 'system-ui, sans-serif', rationale: 'System default for headings', confidence: 'high', source: 'base' },
      { id: 'base-t2', label: 'Body Font', value: 'system-ui, sans-serif', rationale: 'System default for body', confidence: 'high', source: 'base' },
      { id: 'base-t3', label: 'Heading Size', value: '18px', rationale: 'Standard heading', confidence: 'high', source: 'base' },
      { id: 'base-t4', label: 'Body Size', value: '14px', rationale: 'Standard body', confidence: 'high', source: 'base' },
      { id: 'base-t5', label: 'Small Size', value: '12px', rationale: 'Standard small', confidence: 'high', source: 'base' },
      { id: 'base-t6', label: 'Heading Weight', value: '600', rationale: 'Semibold headings', confidence: 'high', source: 'base' },
      { id: 'base-t7', label: 'Body Weight', value: '400', rationale: 'Normal body weight', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
  spacing: {
    decisions: [
      { id: 'base-s1', label: 'Padding', value: '16px', rationale: 'Standard padding', confidence: 'high', source: 'base' },
      { id: 'base-s2', label: 'Gap', value: '12px', rationale: 'Standard gap', confidence: 'high', source: 'base' },
      { id: 'base-s3', label: 'Border Radius', value: '8px', rationale: 'Standard radius', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
}

// ---------------------------------------------------------------------------
// Canonical components — parameterized by skill
// ---------------------------------------------------------------------------

function CanonicalCard({ skill, label }: { skill: SkillState; label: string }) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

  // Fall back to legacy "Font Family" if Display/Body Font not present
  const displayFont = t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div
        style={{
          background: c['Background'] ?? '#fff',
          border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
          borderRadius: s['Border Radius'] ?? '8px',
          padding: s['Padding'] ?? '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: s['Gap'] ?? '12px',
        }}
      >
        <div style={{
          fontSize: t['Heading Size'] ?? '18px',
          fontWeight: headingWeight,
          fontFamily: displayFont,
          color: c['Text'] ?? '#1f2937',
        }}>
          Notification Title
        </div>
        <div style={{
          fontSize: t['Body Size'] ?? '14px',
          fontWeight: bodyWeight,
          fontFamily: bodyFont,
          color: c['Muted'] ?? '#6b7280',
          lineHeight: 1.5,
        }}>
          This is a sample notification card rendered with the current skill tokens. It tests color, typography, and spacing decisions.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: t['Small Size'] ?? '12px',
            fontFamily: bodyFont,
            fontWeight: bodyWeight,
            color: c['Muted'] ?? '#6b7280',
          }}>2 minutes ago</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                background: 'transparent',
                color: c['Accent'] ?? c['Muted'] ?? '#6b7280',
                border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
                borderRadius: s['Border Radius'] ?? '8px',
                padding: `${parseInt(s['Gap'] ?? '12') / 2}px ${parseInt(s['Padding'] ?? '16') / 1.5}px`,
                fontSize: t['Body Size'] ?? '14px',
                fontFamily: bodyFont,
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
            <button
              style={{
                background: c['Primary'] ?? '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: s['Border Radius'] ?? '8px',
                padding: `${parseInt(s['Gap'] ?? '12') / 2}px ${s['Padding'] ?? '16px'}`,
                fontSize: t['Body Size'] ?? '14px',
                fontFamily: bodyFont,
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CanonicalForm({ skill, label }: { skill: SkillState; label: string }) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

  const displayFont = t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${parseInt(s['Gap'] ?? '12') / 1.5}px ${parseInt(s['Padding'] ?? '16') / 1.5}px`,
    fontSize: t['Body Size'] ?? '14px',
    fontFamily: bodyFont,
    fontWeight: bodyWeight,
    border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
    borderRadius: s['Border Radius'] ?? '8px',
    color: c['Text'] ?? '#1f2937',
    background: c['Background'] ?? '#fff',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: t['Small Size'] ?? '12px',
    fontWeight: '500',
    fontFamily: bodyFont,
    color: c['Text'] ?? '#1f2937',
    display: 'block',
    marginBottom: '4px',
  }

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div
        style={{
          background: c['Background'] ?? '#fff',
          border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
          borderRadius: s['Border Radius'] ?? '8px',
          padding: s['Padding'] ?? '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: s['Gap'] ?? '12px',
        }}
      >
        <div style={{
          fontSize: t['Heading Size'] ?? '18px',
          fontWeight: headingWeight,
          fontFamily: displayFont,
          color: c['Text'] ?? '#1f2937',
        }}>
          Contact Form
        </div>
        <p style={{
          fontSize: t['Small Size'] ?? '12px',
          fontFamily: bodyFont,
          fontWeight: bodyWeight,
          color: c['Accent'] ?? c['Muted'] ?? '#6b7280',
          margin: 0,
        }}>
          Required fields marked with *
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s['Gap'] ?? '12px' }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} placeholder="Jane Doe" readOnly />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} placeholder="jane@example.com" readOnly />
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'none' as const }} placeholder="Your message..." readOnly />
          </div>
        </div>
        <button
          style={{
            background: c['Primary'] ?? '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: s['Border Radius'] ?? '8px',
            padding: `${parseInt(s['Gap'] ?? '12') / 1.5}px ${s['Padding'] ?? '16px'}`,
            fontSize: t['Body Size'] ?? '14px',
            fontFamily: bodyFont,
            fontWeight: '500',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  )
}

function CanonicalDashboard({ skill, label }: { skill: SkillState; label: string }) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

  const displayFont = t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  const bg = c['Background'] ?? '#fff'
  const border = c['Border'] ?? '#e5e7eb'
  const primary = c['Primary'] ?? '#3b82f6'
  const accent = c['Accent'] ?? c['Muted'] ?? '#8b5cf6'
  const text = c['Text'] ?? '#1f2937'
  const muted = c['Muted'] ?? '#6b7280'
  const radius = s['Border Radius'] ?? '8px'
  const padding = s['Padding'] ?? '16px'
  const gap = s['Gap'] ?? '12px'

  // Mock data
  const barData = [65, 42, 88, 55, 73, 38, 81]
  const barLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxBar = Math.max(...barData)

  const sparkData = [12, 18, 14, 22, 19, 28, 25, 32, 29, 35, 31, 38]
  const sparkMax = Math.max(...sparkData)
  const sparkMin = Math.min(...sparkData)
  const sparkPoints = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * 100
    const y = 100 - ((v - sparkMin) / (sparkMax - sparkMin)) * 100
    return `${x},${y}`
  }).join(' ')

  const panelStyle: React.CSSProperties = {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: radius,
    padding,
  }

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: radius,
        padding,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{
            fontSize: t['Heading Size'] ?? '18px',
            fontWeight: headingWeight,
            fontFamily: displayFont,
            color: text,
          }}>
            Weekly Overview
          </div>
          <span style={{
            fontSize: t['Small Size'] ?? '12px',
            fontFamily: bodyFont,
            fontWeight: bodyWeight,
            color: muted,
          }}>
            Feb 17 — 23
          </span>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap }}>
          {[
            { label: 'Visitors', value: '2,847', delta: '+12.4%', up: true },
            { label: 'Conversions', value: '184', delta: '+8.1%', up: true },
            { label: 'Bounce Rate', value: '34.2%', delta: '-2.3%', up: false },
          ].map((kpi) => (
            <div key={kpi.label} style={{ ...panelStyle, padding: `${parseInt(padding) * 0.75}px` }}>
              <div style={{
                fontSize: t['Small Size'] ?? '12px',
                fontFamily: bodyFont,
                fontWeight: bodyWeight,
                color: muted,
                marginBottom: '4px',
              }}>
                {kpi.label}
              </div>
              <div style={{
                fontSize: t['Heading Size'] ?? '18px',
                fontWeight: headingWeight,
                fontFamily: displayFont,
                color: text,
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: t['Small Size'] ?? '12px',
                fontFamily: bodyFont,
                fontWeight: '500',
                color: kpi.up ? primary : accent,
                marginTop: '2px',
              }}>
                {kpi.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row: bar chart + sparkline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap }}>
          {/* Bar chart */}
          <div style={{ ...panelStyle, padding: `${parseInt(padding) * 0.75}px` }}>
            <div style={{
              fontSize: t['Small Size'] ?? '12px',
              fontFamily: bodyFont,
              fontWeight: '500',
              color: text,
              marginBottom: gap,
            }}>
              Daily Sessions
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: `${Math.max(parseInt(gap) / 3, 3)}px`,
              height: '80px',
            }}>
              {barData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '100%',
                    height: `${(val / maxBar) * 100}%`,
                    background: i % 2 === 0 ? primary : accent,
                    borderRadius: `${Math.max(parseInt(radius) / 2, 2)}px ${Math.max(parseInt(radius) / 2, 2)}px 0 0`,
                    opacity: 0.85,
                    minHeight: '4px',
                  }} />
                  <span style={{
                    fontSize: '9px',
                    fontFamily: bodyFont,
                    color: muted,
                  }}>
                    {barLabels[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sparkline + trend */}
          <div style={{ ...panelStyle, padding: `${parseInt(padding) * 0.75}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontSize: t['Small Size'] ?? '12px',
                fontFamily: bodyFont,
                fontWeight: '500',
                color: text,
                marginBottom: '4px',
              }}>
                Revenue Trend
              </div>
              <div style={{
                fontSize: t['Heading Size'] ?? '18px',
                fontWeight: headingWeight,
                fontFamily: displayFont,
                color: text,
              }}>
                $12,430
              </div>
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '40px' }}>
              <defs>
                <linearGradient id={`spark-grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <polygon
                points={`0,100 ${sparkPoints} 100,100`}
                fill={`url(#spark-grad-${label.replace(/\s/g, '')})`}
              />
              <polyline
                points={sparkPoints}
                fill="none"
                stroke={primary}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div style={{
              fontSize: t['Small Size'] ?? '12px',
              fontFamily: bodyFont,
              fontWeight: bodyWeight,
              color: muted,
              textAlign: 'right',
            }}>
              +18.2% vs last week
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill display
// ---------------------------------------------------------------------------

function InferredSkillPanel({ skill }: { skill: SkillState }) {
  const dims: (keyof SkillState)[] = ['color', 'typography', 'spacing']
  const hasAny = dims.some(d => skill[d].decisions.length > 0)

  if (!hasAny) {
    return (
      <div className="text-xs text-gray-400 italic p-3">
        No tokens inferred yet. Add inputs to start building the skill.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {dims.map(dim => {
        const state = skill[dim]
        if (state.decisions.length === 0) return null
        return (
          <div key={dim} className="space-y-1">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{dim}</h4>
            {state.decisions.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className="text-green-500 flex-shrink-0">+</span>
                <span className="font-medium text-gray-600 dark:text-gray-400">{d.label}:</span>
                <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{d.value}</code>
                <span className="text-gray-400 text-[10px]">[{d.confidence}]</span>
              </div>
            ))}
            {state.rules.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className={`flex-shrink-0 ${r.type === 'must-not' ? 'text-red-500' : 'text-blue-500'}`}>
                  {r.type === 'must-not' ? '!' : '*'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium capitalize">{r.type}:</span> {r.statement}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Input collection
// ---------------------------------------------------------------------------

function InputCollector({ onAdd }: { onAdd: (input: StyleInput) => void }) {
  const [url, setUrl] = useState('')
  const [dragging, setDragging] = useState(false)

  const handleAddUrl = () => {
    if (!url.trim()) return
    onAdd({
      id: `url-${Date.now()}`,
      type: 'url',
      value: url.trim(),
      label: new URL(url.trim()).hostname,
      addedAt: Date.now(),
    })
    setUrl('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = () => {
        onAdd({
          id: `img-${Date.now()}-${file.name}`,
          type: 'image',
          value: reader.result as string,
          label: file.name,
          addedAt: Date.now(),
        })
      }
      reader.readAsDataURL(file)
    }
  }, [onAdd])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'))
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = () => {
        onAdd({
          id: `img-${Date.now()}-${file.name}`,
          type: 'image',
          value: reader.result as string,
          label: file.name,
          addedAt: Date.now(),
        })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }, [onAdd])

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Add URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            placeholder="https://example.com"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
          />
          <button
            onClick={handleAddUrl}
            disabled={!url.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Image drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Drop screenshots here or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
            browse
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function emptySkillState(): SkillState {
  return {
    color: { decisions: [], rules: [] },
    typography: { decisions: [], rules: [] },
    spacing: { decisions: [], rules: [] },
  }
}

export default function InferStyleSpike() {
  const [phase, setPhase] = useState<Phase>('collect')
  const [inputs, setInputs] = useState<StyleInput[]>([])
  const [inferredSkill, setInferredSkill] = useState<SkillState>(emptySkillState)
  const [inferring, setInferring] = useState(false)
  const [inferProgress, setInferProgress] = useState<{ current: number; total: number; label: string } | null>(null)
  const [inferError, setInferError] = useState<string | null>(null)
  const [results, setResults] = useState<InferenceResult[]>([])

  const handleAddInput = useCallback((input: StyleInput) => {
    setInputs(prev => [...prev, input])
  }, [])

  const handleRemoveInput = useCallback((id: string) => {
    setInputs(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleInfer = useCallback(async () => {
    if (inputs.length === 0) return
    setInferring(true)
    setInferProgress({ current: 0, total: inputs.length, label: '' })
    setInferError(null)

    let currentSkill: SkillState | undefined = undefined
    // If we already have an inferred skill (adding more inputs), use it as starting point
    const hasExisting = (['color', 'typography', 'spacing'] as const).some(
      d => inferredSkill[d].decisions.length > 0
    )
    if (hasExisting) {
      currentSkill = inferredSkill
    }

    const newResults: InferenceResult[] = [...results]
    const errors: string[] = []

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      setInferProgress({ current: i + 1, total: inputs.length, label: input.label })

      try {
        let inputContent = input.value

        // For URL inputs, fetch HTML content first
        if (input.type === 'url') {
          const fetchRes = await fetch('/api/ai/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input.value }),
          })
          const fetchData = await fetchRes.json()
          if (!fetchRes.ok || !fetchData.content) {
            errors.push(`${input.label}: ${fetchData.error ?? 'Failed to fetch'}`)
            continue
          }
          inputContent = fetchData.content
        }

        // Call the AI action
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'arena-infer-style',
            input: {
              inputType: input.type,
              inputLabel: input.label,
              inputContent,
              currentSkill,
            },
          }),
        })

        const result = await res.json()
        if (!result.success || !result.data) {
          errors.push(`${input.label}: ${result.error?.message ?? 'AI error'}`)
          continue
        }

        const data = result.data as SkillState & { summary: string }
        currentSkill = {
          color: data.color,
          typography: data.typography,
          spacing: data.spacing,
        }

        newResults.push({
          inputId: input.id,
          skillDelta: {},
          summary: data.summary,
        })
      } catch (err) {
        errors.push(`${input.label}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (currentSkill) {
      setInferredSkill(currentSkill)
    }
    setResults(newResults)
    if (errors.length > 0) {
      setInferError(`Failed on ${errors.length} input(s): ${errors.join('; ')}`)
    }

    setInferring(false)
    setInferProgress(null)
    if (currentSkill) {
      setPhase('review')
    }
  }, [inputs, inferredSkill, results])

  const handleReset = useCallback(() => {
    setPhase('collect')
    setInputs([])
    setInferredSkill(emptySkillState())
    setResults([])
    setInferError(null)
    setInferProgress(null)
  }, [])

  const totalDecisions = useMemo(() => {
    const dims: (keyof SkillState)[] = ['color', 'typography', 'spacing']
    return dims.reduce((sum, d) => sum + inferredSkill[d].decisions.length, 0)
  }, [inferredSkill])

  const totalRules = useMemo(() => {
    const dims: (keyof SkillState)[] = ['color', 'typography', 'spacing']
    return dims.reduce((sum, d) => sum + inferredSkill[d].rules.length, 0)
  }, [inferredSkill])

  // ---------------------------------------------------------------------------
  // Collect phase — add inputs
  // ---------------------------------------------------------------------------

  if (phase === 'collect') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Infer Style</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Add URLs and screenshots of interfaces whose style you want to capture.
            The agent will analyze each input and build a design skill.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: add inputs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Style Inputs</h3>
            <InputCollector onAdd={handleAddInput} />
          </div>

          {/* Right: input list */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Added ({inputs.length})
            </h3>
            {inputs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No inputs yet. Add a URL or drop a screenshot.</p>
            ) : (
              <div className="space-y-2">
                {inputs.map(input => (
                  <div key={input.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    {input.type === 'image' ? (
                      <img src={input.value} alt={input.label} className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{input.label}</p>
                      <p className="text-[10px] text-gray-400">{input.type}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveInput(input.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Base components preview */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Canonical Components (Base Skill)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CanonicalCard skill={BASE_SKILL} label="Card" />
            <CanonicalForm skill={BASE_SKILL} label="Form" />
          </div>
          <div className="mt-6">
            <CanonicalDashboard skill={BASE_SKILL} label="Dashboard" />
          </div>
        </div>

        {inferError && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{inferError}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleInfer}
            disabled={inputs.length === 0 || inferring}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {inferring && inferProgress
              ? `Analyzing ${inferProgress.current}/${inferProgress.total}: ${inferProgress.label}`
              : `Infer Style from ${inputs.length} Input${inputs.length !== 1 ? 's' : ''}`}
          </button>
          {inferring && (
            <p className="text-xs text-gray-400">This may take a moment per input...</p>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Review phase — see inferred skill
  // ---------------------------------------------------------------------------

  if (phase === 'review') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inferred Skill</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDecisions} decisions, {totalRules} rules inferred from {inputs.length} input{inputs.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Agent summary */}
        {results.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Analysis Summary</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">{results[results.length - 1].summary}</p>
          </div>
        )}

        {/* Inferred tokens */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Inferred Tokens</h3>
          <InferredSkillPanel skill={inferredSkill} />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setPhase('compare')}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors text-sm"
          >
            Compare Components
          </button>
          <button
            onClick={() => setPhase('collect')}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Add More Inputs
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Compare phase — base vs inferred side by side
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Base vs. Inferred</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Same canonical components, different skills. Does the inferred style match the source material?
        </p>
      </div>

      {/* Card comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Card</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalCard skill={BASE_SKILL} label="Base Skill" />
          <CanonicalCard skill={inferredSkill} label="Inferred Skill" />
        </div>
      </div>

      {/* Form comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Form</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalForm skill={BASE_SKILL} label="Base Skill" />
          <CanonicalForm skill={inferredSkill} label="Inferred Skill" />
        </div>
      </div>

      {/* Dashboard comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalDashboard skill={BASE_SKILL} label="Base Skill" />
          <CanonicalDashboard skill={inferredSkill} label="Inferred Skill" />
        </div>
      </div>

      {/* Token diff */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Token Diff</h3>
        <div className="space-y-1">
          {(['color', 'typography', 'spacing'] as const).map(dim => {
            const baseDecs = BASE_SKILL[dim].decisions
            const infDecs = inferredSkill[dim].decisions
            return baseDecs.map(bd => {
              const inf = infDecs.find(d => d.label === bd.label)
              const changed = inf && inf.value !== bd.value
              return (
                <div key={bd.id} className="flex items-center gap-2 text-xs">
                  <span className={`flex-shrink-0 w-3 ${changed ? 'text-amber-500' : 'text-gray-300'}`}>
                    {changed ? '\u0394' : '\u2022'}
                  </span>
                  <span className="text-gray-500 w-16 capitalize">{dim}</span>
                  <span className="font-medium text-gray-600 dark:text-gray-400 w-28">{bd.label}</span>
                  <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{bd.value}</code>
                  {changed && (
                    <>
                      <span className="text-gray-400">{'\u2192'}</span>
                      <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 px-1 rounded text-purple-700 dark:text-purple-400">{inf!.value}</code>
                    </>
                  )}
                </div>
              )
            })
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setPhase('review')}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          Back to Skill
        </button>
        <button
          onClick={() => setPhase('collect')}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          Add More Inputs
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          Start Over
        </button>
      </div>
    </div>
  )
}
