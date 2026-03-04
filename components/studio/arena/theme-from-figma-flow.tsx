'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { SkillState, ProjectTheme } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import type { ExtractedTokens } from '@/lib/studio/arena/figma-extractor'
import { extractTokens } from '@/lib/studio/arena/figma-extractor'
import { FigmaUrlInput, useFigmaUrls } from './figma-url-input'
import { FontSelector, useArenaFonts } from './font-selector'
import { ExtractedTokensPanel } from './extracted-tokens-panel'
import { CanonicalCard } from '@/components/studio/prototypes/arena/shared/canonical-components'
import { saveThemeFromFigma } from '@/app/actions/arena'

import type { VerifyOutput } from '@/lib/ai/actions/arena-verify-theme-classification'

type ReferenceImage = { dataUrl: string; label?: string }
type Phase = 'input' | 'extracting' | 'review' | 'verifying' | 'saved'

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
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerifyOutput | null>(null)
  const [themeTokens, setThemeTokens] = useState<Record<string, Record<string, string>>>({})

  const { parsedUrls, validUrls } = useFigmaUrls(urlText)
  const { availableFonts, fontDisplay, fontBody, fontMono, fontOverrides, handleFontChange } = useArenaFonts()

  const totalDecisions = useMemo(() => {
    return Object.keys(classifiedSkill).reduce(
      (sum, d) => sum + (classifiedSkill[d]?.decisions?.length ?? 0), 0
    )
  }, [classifiedSkill])

  // Convert flat theme_tokens to ProjectTheme for preview rendering
  const previewTheme = useMemo<ProjectTheme>(() => {
    const pt: ProjectTheme = {}
    for (const [dim, tokens] of Object.entries(themeTokens)) {
      pt[dim] = { tokens, source: 'figma' }
    }
    return pt
  }, [themeTokens])

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
            shadows: tokens.shadows,
            frameNames: tokens.frameNames,
            rootBackgrounds: tokens.rootBackgrounds,
            fontOverrides,
          },
        }),
      })
      const classifyData = await classifyRes.json()
      if (!classifyData.success || !classifyData.data) {
        throw new Error(classifyData.error?.message ?? 'Classification failed')
      }

      const result = classifyData.data as SkillState & { summary: string; theme_tokens?: Record<string, Record<string, string>> }
      const { summary: _summary, theme_tokens: tt, ...skillDims } = result

      // Inject user-selected font families into theme_tokens
      const mergedTokens = tt ?? {}
      if (mergedTokens.typography && fontOverrides) {
        if (fontOverrides.display) mergedTokens.typography['Display Font'] = fontOverrides.display
        if (fontOverrides.body) mergedTokens.typography['Body Font'] = fontOverrides.body
        if (fontOverrides.mono) mergedTokens.typography['Mono Font'] = fontOverrides.mono
      }

      setClassifiedSkill(skillDims)
      setThemeTokens(mergedTokens)
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
  }, [validUrls, fontOverrides])

  const handleSave = useCallback(async () => {
    const name = themeName.trim()
    if (!name) {
      setError('Theme name is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const result = await saveThemeFromFigma({ name, themeTokens })
      setSavedName(result.name)
      setPhase('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme')
    } finally {
      setSaving(false)
    }
  }, [themeName, themeTokens])

  const handleReset = useCallback(() => {
    setPhase('input')
    setUrlText('')
    setThemeName('')
    setExtractedTokens(null)
    setClassifiedSkill(emptySkillState())
    setThemeTokens({})
    setSummary('')
    setError(null)
    setProgress('')
    setSavedName(null)
    setReferenceImages([])
    setVerificationResult(null)
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining = 3 - referenceImages.length
    const toProcess = Array.from(files).slice(0, remaining)
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue
      const reader = new FileReader()
      reader.onload = () => {
        setReferenceImages(prev => {
          if (prev.length >= 3) return prev
          return [...prev, { dataUrl: reader.result as string, label: file.name }]
        })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }, [referenceImages.length])

  const handleVerify = useCallback(async () => {
    if (Object.keys(themeTokens).length === 0 || referenceImages.length === 0) return

    setVerifying(true)
    setPhase('verifying')
    setError(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'arena-verify-theme-classification',
          input: { themeTokens, summary, images: referenceImages },
        }),
      })
      const data = await res.json()
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? 'Verification failed')
      }
      setVerificationResult(data.data as VerifyOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }, [themeTokens, referenceImages, summary])

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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Reference Screenshots (optional, max 3)
          </label>
          <p className="text-xs text-slate-400">Upload design screenshots to verify classification accuracy after extraction.</p>
          <div className="flex items-center gap-3">
            <label className="px-4 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Choose Images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={referenceImages.length >= 3}
              />
            </label>
            {referenceImages.length > 0 && (
              <div className="flex gap-2">
                {referenceImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.dataUrl}
                      alt={img.label ?? `Reference ${i + 1}`}
                      className="w-12 h-12 object-cover rounded border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      onClick={() => setReferenceImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${img.label ?? `image ${i + 1}`}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

  // ---- Verifying phase ----
  if (phase === 'verifying' && verifying) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Verifying classification against reference images...</p>
        </div>
      </div>
    )
  }

  // ---- Review phase (also handles post-verification) ----
  if (phase === 'review' || phase === 'verifying') {
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
              <CanonicalCard skill={classifiedSkill} label={themeName} fontOverrides={fontOverrides} theme={previewTheme} />
            </div>
          </div>
        </div>

        {referenceImages.length > 0 && !verificationResult && (
          <div className="flex justify-center">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-6 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 disabled:bg-slate-300 transition-colors text-sm"
            >
              {verifying ? 'Verifying...' : `Verify with Vision (${referenceImages.length} image${referenceImages.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        )}

        {verificationResult && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vision Verification</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                verificationResult.overallConfidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                verificationResult.overallConfidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {verificationResult.overallConfidence} confidence
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{verificationResult.notes}</p>
            <div className="space-y-1.5">
              {verificationResult.corrections.map((c, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                  c.status === 'confirmed' ? 'bg-green-50 dark:bg-green-950/20' :
                  c.status === 'flagged' ? 'bg-amber-50 dark:bg-amber-950/20' :
                  'bg-slate-50 dark:bg-slate-800'
                }`}>
                  <span className={`flex-shrink-0 mt-0.5 ${
                    c.status === 'confirmed' ? 'text-green-600' :
                    c.status === 'flagged' ? 'text-amber-600' :
                    'text-slate-400'
                  }`}>
                    {c.status === 'confirmed' ? '\u2713' : c.status === 'flagged' ? '!' : '?'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{c.type} / {c.token}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-1">
                      {c.currentValue}
                      {c.suggestedValue && <> {'->'} <span className="font-medium text-amber-700 dark:text-amber-400">{c.suggestedValue}</span></>}
                    </span>
                    <p className="text-slate-400 mt-0.5">{c.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          &ldquo;{savedName}&rdquo; saved as a reusable template theme.
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
