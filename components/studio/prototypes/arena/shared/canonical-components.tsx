/**
 * Arena Canonical Components
 *
 * Parameterized components that render with a given SkillState.
 * Used for base vs. inferred skill comparison across all Arena spikes.
 */

import type { SkillState } from '@/lib/studio/arena/types'

interface CanonicalProps {
  skill: SkillState
  label: string
  fontOverrides?: { display?: string; body?: string; mono?: string }
}

/**
 * Parse a CSS-like value to a number (strips 'px' suffix).
 * Falls back to the provided default if parsing fails.
 */
function px(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = parseFloat(value)
  return isNaN(n) ? fallback : n
}

/** Clamp a value between min and max */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

/**
 * Normalize skill values for web-scale canonical component rendering.
 * Figma designs may be mobile-scale (32px headings, 60px border-radius)
 * which look broken at web comparison size. This clamps to reasonable ranges.
 */
function normalizeForDisplay(skill: SkillState) {
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

  const headingSize = clamp(px(t['Heading Size'], 18), 14, 28)
  const bodySize = clamp(px(t['Body Size'], 14), 11, 18)
  const smallSize = clamp(px(t['Small Size'], 12), 9, 14)
  const padding = clamp(px(s['Padding'], 16), 6, 32)
  const gap = clamp(px(s['Gap'], 12), 4, 24)
  const borderRadius = clamp(px(s['Border Radius'], 8), 0, 20)

  return {
    headingSize: `${headingSize}px`,
    bodySize: `${bodySize}px`,
    smallSize: `${smallSize}px`,
    padding: `${padding}px`,
    gap: `${gap}px`,
    borderRadius: `${borderRadius}px`,
    // Derived values for sub-element sizing
    inputPadY: `${Math.round(gap / 1.5)}px`,
    inputPadX: `${Math.round(padding / 1.5)}px`,
    buttonPadY: `${Math.round(gap / 1.5)}px`,
    halfRadius: `${Math.max(Math.round(borderRadius / 2), 2)}px`,
    panelPadding: `${Math.round(padding * 0.75)}px`,
    barGap: `${Math.max(Math.round(gap / 3), 3)}px`,
  }
}

export function CanonicalCard({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const n = normalizeForDisplay(skill)

  const displayFont = fontOverrides?.display ?? t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = fontOverrides?.body ?? t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div
        style={{
          background: c['Background'] ?? '#fff',
          border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
          borderRadius: n.borderRadius,
          padding: n.padding,
          display: 'flex',
          flexDirection: 'column',
          gap: n.gap,
        }}
      >
        <div style={{
          fontSize: n.headingSize,
          fontWeight: headingWeight,
          fontFamily: displayFont,
          color: c['Text'] ?? '#1f2937',
        }}>
          Notification Title
        </div>
        <div style={{
          fontSize: n.bodySize,
          fontWeight: bodyWeight,
          fontFamily: bodyFont,
          color: c['Muted'] ?? '#6b7280',
          lineHeight: 1.5,
        }}>
          This is a sample notification card rendered with the current skill tokens. It tests color, typography, and spacing decisions.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: n.smallSize,
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
                borderRadius: n.borderRadius,
                padding: `${n.buttonPadY} ${n.inputPadX}`,
                fontSize: n.bodySize,
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
                borderRadius: n.borderRadius,
                padding: `${n.buttonPadY} ${n.padding}`,
                fontSize: n.bodySize,
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

export function CanonicalForm({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const n = normalizeForDisplay(skill)

  const displayFont = fontOverrides?.display ?? t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = fontOverrides?.body ?? t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${n.inputPadY} ${n.inputPadX}`,
    fontSize: n.bodySize,
    fontFamily: bodyFont,
    fontWeight: bodyWeight,
    border: `1px solid ${c['Border'] ?? '#e5e7eb'}`,
    borderRadius: n.borderRadius,
    color: c['Text'] ?? '#1f2937',
    background: c['Background'] ?? '#fff',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: n.smallSize,
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
          borderRadius: n.borderRadius,
          padding: n.padding,
          display: 'flex',
          flexDirection: 'column',
          gap: n.gap,
        }}
      >
        <div style={{
          fontSize: n.headingSize,
          fontWeight: headingWeight,
          fontFamily: displayFont,
          color: c['Text'] ?? '#1f2937',
        }}>
          Contact Form
        </div>
        <p style={{
          fontSize: n.smallSize,
          fontFamily: bodyFont,
          fontWeight: bodyWeight,
          color: c['Accent'] ?? c['Muted'] ?? '#6b7280',
          margin: 0,
        }}>
          Required fields marked with *
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: n.gap }}>
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
            borderRadius: n.borderRadius,
            padding: `${n.buttonPadY} ${n.padding}`,
            fontSize: n.bodySize,
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

export function CanonicalDashboard({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const n = normalizeForDisplay(skill)

  const displayFont = fontOverrides?.display ?? t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = fontOverrides?.body ?? t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const monoFont = fontOverrides?.mono ?? t['Mono Font'] ?? 'ui-monospace, monospace'
  const headingWeight = t['Heading Weight'] ?? '600'
  const bodyWeight = t['Body Weight'] ?? '400'

  const bg = c['Background'] ?? '#fff'
  const border = c['Border'] ?? '#e5e7eb'
  const primary = c['Primary'] ?? '#3b82f6'
  const accent = c['Accent'] ?? c['Muted'] ?? '#8b5cf6'
  const text = c['Text'] ?? '#1f2937'
  const muted = c['Muted'] ?? '#6b7280'

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
    borderRadius: n.borderRadius,
    padding: n.padding,
  }

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: n.borderRadius,
        padding: n.padding,
        display: 'flex',
        flexDirection: 'column',
        gap: n.gap,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{
            fontSize: n.headingSize,
            fontWeight: headingWeight,
            fontFamily: displayFont,
            color: text,
          }}>
            Weekly Overview
          </div>
          <span style={{
            fontSize: n.smallSize,
            fontFamily: bodyFont,
            fontWeight: bodyWeight,
            color: muted,
          }}>
            Feb 17 — 23
          </span>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: n.gap }}>
          {[
            { label: 'Visitors', value: '2,847', delta: '+12.4%', up: true },
            { label: 'Conversions', value: '184', delta: '+8.1%', up: true },
            { label: 'Bounce Rate', value: '34.2%', delta: '-2.3%', up: false },
          ].map((kpi) => (
            <div key={kpi.label} style={{ ...panelStyle, padding: n.panelPadding }}>
              <div style={{
                fontSize: n.smallSize,
                fontFamily: bodyFont,
                fontWeight: bodyWeight,
                color: muted,
                marginBottom: '4px',
              }}>
                {kpi.label}
              </div>
              <div style={{
                fontSize: n.headingSize,
                fontWeight: headingWeight,
                fontFamily: monoFont,
                color: text,
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: n.smallSize,
                fontFamily: monoFont,
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: n.gap }}>
          {/* Bar chart */}
          <div style={{ ...panelStyle, padding: n.panelPadding }}>
            <div style={{
              fontSize: n.smallSize,
              fontFamily: bodyFont,
              fontWeight: '500',
              color: text,
              marginBottom: n.gap,
            }}>
              Daily Sessions
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: n.barGap,
              height: '80px',
            }}>
              {barData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '100%',
                    height: `${(val / maxBar) * 100}%`,
                    background: i % 2 === 0 ? primary : accent,
                    borderRadius: `${n.halfRadius} ${n.halfRadius} 0 0`,
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
          <div style={{ ...panelStyle, padding: n.panelPadding, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontSize: n.smallSize,
                fontFamily: bodyFont,
                fontWeight: '500',
                color: text,
                marginBottom: '4px',
              }}>
                Revenue Trend
              </div>
              <div style={{
                fontSize: n.headingSize,
                fontWeight: headingWeight,
                fontFamily: monoFont,
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
              fontSize: n.smallSize,
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
