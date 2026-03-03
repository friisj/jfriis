'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { upsertTheme } from '@/lib/studio/arena/queries'
import { hexToOklch, oklchToHex, isHexColor } from '@/lib/studio/arena/color-utils'
import { useArenaFonts, type AvailableFonts } from '@/components/studio/arena/font-selector'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThemeEditorProps {
  initialTokens: Record<string, TokenMap>
  themeName: string
  /** Either skill_id or project_id — used to target upsertTheme correctly */
  scope: { skillId?: string; projectId?: string }
  platform: string
}

type ExpandedPickers = Record<string, boolean>

const COLOR_LABELS = DECISION_LABELS.color
const TYPOGRAPHY_LABELS = DECISION_LABELS.typography
const SPACING_LABELS = DECISION_LABELS.spacing

const FONT_WEIGHT_OPTIONS = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

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

// ─── Component ───────────────────────────────────────────────────────────────

export function ThemeEditor({ initialTokens, themeName, scope, platform }: ThemeEditorProps) {
  const [tokens, setTokens] = useState<Record<string, TokenMap>>(initialTokens)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedPickers, setExpandedPickers] = useState<ExpandedPickers>({})

  const { availableFonts, fontOverrides, handleFontChange, fontDisplay, fontBody, fontMono } = useArenaFonts()

  // ─── Token updates ──────────────────────────────────────────────────────

  const updateToken = useCallback((dimension: string, label: string, value: string) => {
    setTokens(prev => ({
      ...prev,
      [dimension]: { ...prev[dimension], [label]: value },
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
        await upsertTheme({
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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* LEFT: Editor */}
      <div className="w-[400px] shrink-0 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-2">
        {/* Color */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Color</h2>
          <div className="space-y-3">
            {COLOR_LABELS.map(label => renderColorRow(label))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Typography</h2>
          <div className="space-y-3">
            {TYPOGRAPHY_LABELS.map(label => renderTypographyRow(label))}
          </div>
        </section>

        {/* Spacing */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Spacing</h2>
          <div className="space-y-3">
            {SPACING_LABELS.map(label => renderSpacingRow(label))}
          </div>
        </section>

        {/* Save */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 pt-3 pb-1 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Theme'}
          </button>
        </div>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="flex-1 min-w-0 sticky top-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Preview</h2>
        <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <CanonicalCard
            skill={previewSkill}
            theme={previewTheme}
            label="Card"
            fontOverrides={fontOverrides}
          />
          <CanonicalForm
            skill={previewSkill}
            theme={previewTheme}
            label="Form"
            fontOverrides={fontOverrides}
          />
          <CanonicalDashboard
            skill={previewSkill}
            theme={previewTheme}
            label="Dashboard"
            fontOverrides={fontOverrides}
          />
        </div>
      </div>
    </div>
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
