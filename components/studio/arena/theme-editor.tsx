'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { OklchPicker } from '@/components/studio/oklch-picker'
import {
  CanonicalCard,
  CanonicalForm,
  CanonicalDashboard,
} from '@/components/studio/prototypes/arena/shared/canonical-components'
import {
  DECISION_LABELS,
  emptySkillState,
  type TokenMap,
  type ProjectTheme,
} from '@/lib/studio/arena/types'
import { saveTheme } from '@/app/actions/arena'
import { hexToOklch, oklchToHex, isHexColor } from '@/lib/studio/arena/color-utils'
import { useArenaFonts, type AvailableFonts } from '@/components/studio/arena/font-selector'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThemeEditorProps {
  initialTokens: Record<string, TokenMap>
  themeName: string
  /** Either skill_id or project_id — used to target upsertTheme correctly */
  scope: { skillId?: string; projectId?: string }
  platform: string
  dimensionCount: number
}

type ExpandedPickers = Record<string, boolean>

const COLOR_LABELS = DECISION_LABELS.color
const TYPOGRAPHY_LABELS = DECISION_LABELS.typography
const SPACING_LABELS = DECISION_LABELS.spacing
const ELEVATION_LABELS = DECISION_LABELS.elevation
const RADIUS_LABELS = DECISION_LABELS.radius

const FONT_WEIGHT_OPTIONS = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

const TYPE_SCALE_RATIOS = [
  { label: 'Minor Third', value: 1.2 },
  { label: 'Major Third', value: 1.25 },
  { label: 'Perfect Fourth', value: 1.333 },
  { label: 'Augmented Fourth', value: 1.414 },
  { label: 'Perfect Fifth', value: 1.5 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFontLabel(label: string) {
  return label.endsWith('Font')
}

function isSizeLabel(label: string) {
  return label.endsWith('Size')
}

function isWeightLabel(label: string) {
  return label.endsWith('Weight')
}

function isLineHeightLabel(label: string) {
  return label.includes('Line Height')
}

function isLetterSpacingLabel(label: string) {
  return label.includes('Letter Spacing')
}

// ─── Component ───────────────────────────────────────────────────────────────

type PreviewComponent = 'card' | 'form' | 'dashboard'

export function ThemeEditor({ initialTokens, themeName, scope, platform, dimensionCount }: ThemeEditorProps) {
  const [tokens, setTokens] = useState<Record<string, TokenMap>>(initialTokens)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedPickers, setExpandedPickers] = useState<ExpandedPickers>({})
  const [typeScaleOpen, setTypeScaleOpen] = useState(false)
  const [typeScaleBase, setTypeScaleBase] = useState(16)
  const [typeScaleRatio, setTypeScaleRatio] = useState(1.25)
  const [activePreview, setActivePreview] = useState<PreviewComponent>('card')

  const { availableFonts, fontOverrides, handleFontChange, fontDisplay, fontBody, fontMono } = useArenaFonts()

  // ─── Token updates ──────────────────────────────────────────────────────

  const updateToken = useCallback((dimension: string, label: string, value: string) => {
    setTokens(prev => ({
      ...prev,
      [dimension]: { ...prev[dimension], [label]: value },
    }))
    setSaved(false)
  }, [])

  const applyTypeScale = useCallback((base: number, ratio: number) => {
    const small = Math.round(base / ratio)
    const heading = Math.round(base * ratio * ratio)
    setTokens(prev => ({
      ...prev,
      typography: {
        ...prev['typography'],
        'Small Size': `${small}px`,
        'Body Size': `${base}px`,
        'Heading Size': `${heading}px`,
      },
    }))
    setSaved(false)
  }, [])

  // ─── Preview state ──────────────────────────────────────────────────────

  const previewSkill = useMemo(() => emptySkillState(), [])

  const previewTheme: ProjectTheme = useMemo(() => {
    const result: ProjectTheme = {}
    for (const [dim, toks] of Object.entries(tokens)) {
      result[dim] = { tokens: toks, source: 'editor' }
    }
    return result
  }, [tokens])

  // ─── Save ───────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      for (const [dim, toks] of Object.entries(tokens)) {
        await saveTheme({
          skill_id: scope.skillId,
          project_id: scope.projectId,
          dimension: dim,
          platform,
          name: themeName,
          tokens: toks,
          source: 'manual',
        })
      }
      setSaved(true)
    } catch (err) {
      console.error('Failed to save theme:', err)
    } finally {
      setSaving(false)
    }
  }, [tokens, scope, platform, themeName])

  // ─── Color section ──────────────────────────────────────────────────────

  const colorTokens = tokens['color'] ?? {}

  function renderColorRow(label: string) {
    const value = colorTokens[label] ?? ''
    const pickerKey = `color-${label}`
    const expanded = expandedPickers[pickerKey] ?? false
    const oklch = isHexColor(value) ? hexToOklch(value) : { l: 50, c: 0.1, h: 240 }

    return (
      <div key={label} className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-20 shrink-0">
            {label}
          </label>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-8 h-8 rounded border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
              style={{ backgroundColor: value || '#cccccc' }}
              onClick={() => setExpandedPickers(p => ({ ...p, [pickerKey]: !p[pickerKey] }))}
              title="Toggle color picker"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => updateToken('color', label, e.target.value)}
              placeholder="#3B82F6"
              className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
        {expanded && (
          <div className="ml-[88px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <OklchPicker
              l={oklch.l}
              c={oklch.c}
              h={oklch.h}
              onChange={(l, c, h) => updateToken('color', label, oklchToHex(l, c, h))}
            />
          </div>
        )}
      </div>
    )
  }

  // ─── Typography section ─────────────────────────────────────────────────

  const typographyTokens = tokens['typography'] ?? {}

  function renderTypographyRow(label: string) {
    const value = typographyTokens[label] ?? ''

    if (isFontLabel(label)) {
      return (
        <div key={label} className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
            {label}
          </label>
          <select
            value={value}
            onChange={(e) => updateToken('typography', label, e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            style={value ? { fontFamily: value } : undefined}
          >
            <option value="">None</option>
            <FontOptions availableFonts={availableFonts} />
          </select>
        </div>
      )
    }

    if (isLineHeightLabel(label)) {
      const numVal = parseFloat(value) || 0
      return (
        <div key={label} className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
            {label}
          </label>
          <input
            type="number"
            min={0.8}
            max={2.5}
            step={0.05}
            value={numVal || ''}
            onChange={(e) => updateToken('typography', label, e.target.value || '')}
            className="w-20 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
          <input
            type="range"
            min={0.8}
            max={2.5}
            step={0.05}
            value={numVal || 1.5}
            onChange={(e) => updateToken('typography', label, e.target.value)}
            className="flex-1"
          />
        </div>
      )
    }

    if (isLetterSpacingLabel(label)) {
      return (
        <div key={label} className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
            {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => updateToken('typography', label, e.target.value)}
            placeholder="0em"
            className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400 shrink-0">em</span>
        </div>
      )
    }

    if (isWeightLabel(label)) {
      return (
        <div key={label} className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
            {label}
          </label>
          <select
            value={value}
            onChange={(e) => updateToken('typography', label, e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="">Default</option>
            {FONT_WEIGHT_OPTIONS.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      )
    }

    if (isSizeLabel(label)) {
      const numVal = parseFloat(value) || 0
      return (
        <div key={label} className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
            {label}
          </label>
          <input
            type="number"
            min={8}
            max={72}
            step={1}
            value={numVal || ''}
            onChange={(e) => updateToken('typography', label, e.target.value ? `${e.target.value}px` : '')}
            className="w-20 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400">px</span>
          <input
            type="range"
            min={8}
            max={72}
            step={1}
            value={numVal || 16}
            onChange={(e) => updateToken('typography', label, `${e.target.value}px`)}
            className="flex-1"
          />
        </div>
      )
    }

    // Fallback: plain text input
    return (
      <div key={label} className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => updateToken('typography', label, e.target.value)}
          className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        />
      </div>
    )
  }

  // ─── Spacing section ────────────────────────────────────────────────────

  const spacingTokens = tokens['spacing'] ?? {}

  function renderSpacingRow(label: string) {
    const value = spacingTokens[label] ?? ''
    const numVal = parseFloat(value) || 0

    return (
      <div key={label} className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
          {label}
        </label>
        <input
          type="number"
          min={0}
          max={64}
          step={1}
          value={numVal || ''}
          onChange={(e) => updateToken('spacing', label, e.target.value ? `${e.target.value}px` : '')}
          className="w-20 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">px</span>
        <input
          type="range"
          min={0}
          max={64}
          step={1}
          value={numVal || 8}
          onChange={(e) => updateToken('spacing', label, `${e.target.value}px`)}
          className="flex-1"
        />
      </div>
    )
  }

  // ─── Elevation section ──────────────────────────────────────────────────

  const elevationTokens = tokens['elevation'] ?? {}

  function renderElevationRow(label: string) {
    const value = elevationTokens[label] ?? ''

    return (
      <div key={label} className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
          {label}
        </label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => updateToken('elevation', label, e.target.value)}
            placeholder="0 1px 3px rgba(0,0,0,0.08)"
            className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
          <div
            className="w-8 h-8 rounded bg-white dark:bg-slate-200 shrink-0 border border-slate-100"
            style={{ boxShadow: value || 'none' }}
            title={value || 'none'}
          />
        </div>
      </div>
    )
  }

  // ─── Radius section ────────────────────────────────────────────────────

  const radiusTokens = tokens['radius'] ?? {}

  function renderRadiusRow(label: string) {
    const value = radiusTokens[label] ?? ''
    const numVal = parseFloat(value) || 0

    return (
      <div key={label} className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
          {label}
        </label>
        <input
          type="number"
          min={0}
          max={label === 'Full' ? 9999 : 32}
          step={1}
          value={numVal || ''}
          onChange={(e) => updateToken('radius', label, e.target.value ? `${e.target.value}px` : '')}
          className="w-20 text-xs font-mono px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">px</span>
        {label !== 'Full' && (
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={numVal || 0}
            onChange={(e) => updateToken('radius', label, `${e.target.value}px`)}
            className="flex-1"
          />
        )}
        <div
          className="w-8 h-8 bg-slate-300 dark:bg-slate-600 shrink-0"
          style={{ borderRadius: value || '0px' }}
          title={value || '0px'}
        />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const PREVIEW_TABS: { key: PreviewComponent; label: string }[] = [
    { key: 'card', label: 'Card' },
    { key: 'form', label: 'Form' },
    { key: 'dashboard', label: 'Dashboard' },
  ]

  return (
    <>
    {/* Header bar */}
    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/apps/arena/themes" className="hover:text-slate-700 dark:hover:text-slate-200">
          Themes
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">{themeName}</span>
      </div>
      <span className="text-xs text-slate-400">{platform}</span>
      <span className="text-xs text-slate-400">{dimensionCount} {dimensionCount === 1 ? 'dimension' : 'dimensions'}</span>
      <div className="ml-auto flex items-center gap-1">
        {PREVIEW_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActivePreview(tab.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activePreview === tab.key
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>

    <div className="flex flex-1 min-h-0">
      {/* LEFT: Sidebar */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Color */}
          <details open className="group">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">&#x25B6;</span>
              Color
            </summary>
            <div className="space-y-3 pb-4">
              {COLOR_LABELS.map(label => renderColorRow(label))}
            </div>
          </details>

          {/* Typography */}
          <details open className="group">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">&#x25B6;</span>
              Typography
            </summary>
            <div className="pb-4">
              {/* Type Scale Generator */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setTypeScaleOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="text-[10px]">{typeScaleOpen ? '\u25BC' : '\u25B6'}</span>
                  Type Scale Generator
                </button>
                {typeScaleOpen && (
                  <div className="mt-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-16 shrink-0">Base</label>
                      <input
                        type="number"
                        min={10}
                        max={24}
                        step={1}
                        value={typeScaleBase}
                        onChange={(ev) => setTypeScaleBase(Number(ev.target.value) || 16)}
                        className="w-16 text-xs font-mono px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                      <span className="text-xs text-slate-400">px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 w-16 shrink-0">Ratio</label>
                      <select
                        value={typeScaleRatio}
                        onChange={(ev) => setTypeScaleRatio(Number(ev.target.value))}
                        className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        {TYPE_SCALE_RATIOS.map(r => (
                          <option key={r.value} value={r.value}>{r.label} ({r.value})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {Math.round(typeScaleBase / typeScaleRatio)}px / {typeScaleBase}px / {Math.round(typeScaleBase * typeScaleRatio * typeScaleRatio)}px
                      </span>
                      <button
                        type="button"
                        onClick={() => applyTypeScale(typeScaleBase, typeScaleRatio)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {TYPOGRAPHY_LABELS.map(label => renderTypographyRow(label))}
              </div>
            </div>
          </details>

          {/* Spacing */}
          <details open className="group">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">&#x25B6;</span>
              Spacing
            </summary>
            <div className="space-y-3 pb-4">
              {SPACING_LABELS.map(label => renderSpacingRow(label))}
            </div>
          </details>

          {/* Elevation */}
          <details open className="group">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">&#x25B6;</span>
              Elevation
            </summary>
            <div className="space-y-3 pb-4">
              {ELEVATION_LABELS.map(label => renderElevationRow(label))}
            </div>
          </details>

          {/* Radius */}
          <details open className="group">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-slate-400 transition-transform group-open:rotate-90">&#x25B6;</span>
              Radius
            </summary>
            <div className="space-y-3 pb-4">
              {RADIUS_LABELS.map(label => renderRadiusRow(label))}
            </div>
          </details>
        </div>

        {/* Pinned save bar */}
        <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Theme'}
          </button>
        </div>
      </div>

      {/* RIGHT: Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900 overflow-auto p-8">
          <div className={activePreview === 'dashboard' ? 'w-full max-w-2xl' : 'w-full max-w-lg'}>
            {activePreview === 'card' && (
              <CanonicalCard
                skill={previewSkill}
                theme={previewTheme}
                label="Card"
                fontOverrides={fontOverrides}
              />
            )}
            {activePreview === 'form' && (
              <CanonicalForm
                skill={previewSkill}
                theme={previewTheme}
                label="Form"
                fontOverrides={fontOverrides}
              />
            )}
            {activePreview === 'dashboard' && (
              <CanonicalDashboard
                skill={previewSkill}
                theme={previewTheme}
                label="Dashboard"
                fontOverrides={fontOverrides}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Font options sub-component ──────────────────────────────────────────────

function FontOptions({ availableFonts }: { availableFonts: AvailableFonts | null }) {
  if (!availableFonts) return null
  return (
    <>
      {availableFonts.systemFonts.map(f => (
        <option key={`sys-${f.name}`} value={f.stack}>{f.displayName}</option>
      ))}
      {availableFonts.customFonts.length > 0 && (
        <optgroup label="Custom Fonts">
          {availableFonts.customFonts.map(f => (
            <option key={`custom-${f.name}`} value={f.displayName}>{f.displayName}</option>
          ))}
        </optgroup>
      )}
    </>
  )
}
