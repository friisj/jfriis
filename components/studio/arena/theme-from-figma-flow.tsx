'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { SkillState } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import type { ExtractedTokens } from '@/lib/studio/arena/figma-extractor'
import { extractTokens } from '@/lib/studio/arena/figma-extractor'
import { FigmaUrlInput, useFigmaUrls } from './figma-url-input'
import { FontSelector, useArenaFonts } from './font-selector'
import { ExtractedTokensPanel } from './extracted-tokens-panel'
import { CanonicalCard } from '@/components/studio/prototypes/arena/shared/canonical-components'
import { saveThemeFromFigma } from '@/app/actions/arena'

type Phase = 'input' | 'extracting' | 'review' | 'saved'

export function ThemeFromFigmaFlow() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('input')
  const [urlText, setUrlText] = useState('')
  const [themeName, setThemeName] = useState('')
  const [extractedTokens, setExtractedTokens] = useState<ExtractedTokens | null>(null)
  const [classifiedSkill, setClassifiedSkill] = useState<SkillState>(emptySkillState)
  const [summary, setSummary] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedName, setSavedName] = useState<string | null>(null)

  const { parsedUrls, validUrls } = useFigmaUrls(urlText)
  const { availableFonts, fontDisplay, fontBody, fontMono, fontOverrides, handleFontChange } = useArenaFonts()

  const totalDecisions = useMemo(() => {
    return Object.keys(classifiedSkill).reduce(
      (sum, d) => sum + (classifiedSkill[d]?.decisions?.length ?? 0), 0
    )
  }, [classifiedSkill])

  const handleExtractAndClassify = useCallback(async () => {
    if (validUrls.length === 0) return

    setPhase('extracting')
    setError(null)
    setProgress('Fetching frames from Figma...')

    try {
      const fetchRes = await fetch('/api/ai/figma-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls.map(u => u.url) }),
      })
      const fetchData = await fetchRes.json()
      if (!fetchRes.ok) throw new Error(fetchData.error ?? `API error ${fetchRes.status}`)
      if (!fetchData.nodes || fetchData.nodes.length === 0) {
        throw new Error('No nodes returned from Figma. Check your URLs and FIGMA_PAT.')
      }

      setProgress(`Extracting values from ${fetchData.nodes.length} frame(s)...`)
      const tokens = extractTokens(fetchData.nodes)
      setExtractedTokens(tokens)

      if (tokens.colors.length === 0 && tokens.fonts.length === 0 && tokens.spacing.length === 0) {
        throw new Error('No design tokens found in the selected frames.')
      }

      setProgress('Classifying tokens into semantic roles...')
      const classifyRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'arena-classify-figma-tokens',
          input: {
            colors: tokens.colors,
            fonts: tokens.fonts,
            spacing: tokens.spacing,
            frameNames: tokens.frameNames,
            rootBackgrounds: tokens.rootBackgrounds,
          },
        }),
      })
      const classifyData = await classifyRes.json()
      if (!classifyData.success || !classifyData.data) {
        throw new Error(classifyData.error?.message ?? 'Classification failed')
      }

      const result = classifyData.data as SkillState & { summary: string }
      const { summary: _summary, ...skillDims } = result
      setClassifiedSkill(skillDims)
      setSummary(result.summary)

      if (fetchData.errors?.length > 0 || fetchData.invalidUrls?.length > 0) {
        const warnings = [
          ...(fetchData.invalidUrls ?? []).map((u: string) => `Invalid URL: ${u}`),
          ...(fetchData.errors ?? []),
        ]
        setError(`Completed with warnings: ${warnings.join('; ')}`)
      }

      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('input')
    } finally {
      setProgress('')
    }
  }, [validUrls])

  const handleSave = useCallback(async () => {
    const name = themeName.trim()
    if (!name) {
      setError('Theme name is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const result = await saveThemeFromFigma({ name, state: classifiedSkill })
      setSavedName(result.name)
      setPhase('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme')
    } finally {
      setSaving(false)
    }
  }, [classifiedSkill, themeName])

  const handleReset = useCallback(() => {
    setPhase('input')
    setUrlText('')
    setThemeName('')
    setExtractedTokens(null)
    setClassifiedSkill(emptySkillState())
    setSummary('')
    setError(null)
    setProgress('')
    setSavedName(null)
  }, [])

  // ---- Input phase ----
  if (phase === 'input') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">New Theme from Figma</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Paste Figma frame URLs to extract design tokens. AI classifies semantic roles. Saved as a reusable theme.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="theme-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Theme Name
          </label>
          <input
            id="theme-name"
            type="text"
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            placeholder="e.g. Brand Dark, Dashboard Light"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FigmaUrlInput value={urlText} onChange={setUrlText} parsedUrls={parsedUrls} />
          <FontSelector
            fontDisplay={fontDisplay}
            fontBody={fontBody}
            fontMono={fontMono}
            onFontChange={handleFontChange}
            availableFonts={availableFonts}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleExtractAndClassify}
            disabled={validUrls.length === 0 || !themeName.trim()}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Extract &amp; Classify {validUrls.length > 0 ? `(${validUrls.length} frame${validUrls.length !== 1 ? 's' : ''})` : ''}
          </button>
          {validUrls.length > 0 && !themeName.trim() && (
            <p className="text-xs text-slate-400">Enter a theme name to continue</p>
          )}
        </div>
      </div>
    )
  }

  // ---- Extracting phase ----
  if (phase === 'extracting') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">{progress}</p>
        </div>
      </div>
    )
  }

  // ---- Review phase ----
  if (phase === 'review') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Review: {themeName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalDecisions} decisions from {validUrls.length} frame{validUrls.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {summary && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Classification Summary</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">{summary}</p>
          </div>
        )}

        {error && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
          </div>
        )}

        {extractedTokens && <ExtractedTokensPanel tokens={extractedTokens} />}

        {/* Live card preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Preview</h3>
          <div className="flex justify-center">
            <div className="w-80">
              <CanonicalCard skill={classifiedSkill} label={themeName} fontOverrides={fontOverrides} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="theme-name-edit" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Theme Name
          </label>
          <input
            id="theme-name-edit"
            type="text"
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSave}
            disabled={saving || !themeName.trim()}
            className="px-8 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:bg-slate-300 transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ---- Saved phase ----
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <span className="text-green-600 text-xl">{'\u2713'}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Theme Saved</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          &ldquo;{savedName}&rdquo; created with template skills and theme tokens.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/apps/arena/themes/${encodeURIComponent(savedName ?? '')}`)}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors text-sm"
          >
            Open in Editor
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  )
}
