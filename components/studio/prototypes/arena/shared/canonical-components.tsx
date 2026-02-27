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

export function CanonicalCard({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

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

export function CanonicalForm({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

  const displayFont = fontOverrides?.display ?? t['Display Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
  const bodyFont = fontOverrides?.body ?? t['Body Font'] ?? t['Font Family'] ?? 'system-ui, sans-serif'
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

export function CanonicalDashboard({ skill, label, fontOverrides }: CanonicalProps) {
  const c = Object.fromEntries(skill.color.decisions.map(d => [d.label, d.value]))
  const t = Object.fromEntries(skill.typography.decisions.map(d => [d.label, d.value]))
  const s = Object.fromEntries(skill.spacing.decisions.map(d => [d.label, d.value]))

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
  const radius = s['Border Radius'] ?? '8px'
  const padding = s['Padding'] ?? '16px'
  const gap = s['Gap'] ?? '12px'

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
                fontFamily: monoFont,
                color: text,
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: t['Small Size'] ?? '12px',
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
