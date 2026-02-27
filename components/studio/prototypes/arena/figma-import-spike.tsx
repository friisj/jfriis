'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { SkillState } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import { BASE_SKILL } from '@/lib/studio/arena/base-skill'
import type { ExtractedTokens } from '@/lib/studio/arena/figma-extractor'
import { extractTokens } from '@/lib/studio/arena/figma-extractor'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from './shared/canonical-components'
import { InferredSkillPanel } from './shared/skill-panel'

/**
 * Figma Import Spike
 *
 * Part of the Arena studio project.
 * Tests ground-truth design token extraction from Figma files via REST API,
 * with AI classification into semantic roles.
 *
 * Two-phase approach:
 * 1. Deterministic extraction: exact values from Figma node JSON
 * 2. AI classification: label assignment + rule generation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'input' | 'extracting' | 'review' | 'compare'

interface ParsedUrl {
  url: string
  fileKey: string
  nodeId: string
  valid: boolean
}

interface CustomFont {
  name: string
  dataUrl: string
  format: string
}

// ---------------------------------------------------------------------------
// URL Parser
// ---------------------------------------------------------------------------

function parseFigmaUrl(url: string): ParsedUrl {
  try {
    const parsed = new URL(url.trim())
    if (!parsed.hostname.includes('figma.com')) {
      return { url, fileKey: '', nodeId: '', valid: false }
    }
    const pathMatch = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/)
    if (!pathMatch) return { url, fileKey: '', nodeId: '', valid: false }
    const nodeId = parsed.searchParams.get('node-id')
    if (!nodeId) return { url, fileKey: '', nodeId: '', valid: false }
    // Figma URLs use hyphens (123-456) but the API uses colons (123:456)
    return { url, fileKey: pathMatch[2], nodeId: nodeId.replace(/-/g, ':'), valid: true }
  } catch {
    return { url, fileKey: '', nodeId: '', valid: false }
  }
}

// ---------------------------------------------------------------------------
// Extracted Tokens Display
// ---------------------------------------------------------------------------

function ExtractedTokensPanel({ tokens }: { tokens: ExtractedTokens }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Extracted Data</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {tokens.colors.length} colors, {tokens.fonts.length} fonts, {tokens.spacing.length} spacing values
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Colors */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Colors ({tokens.colors.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tokens.colors.slice(0, 18).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-5 h-5 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="min-w-0">
                    <code className="text-[10px]">{c.hex}</code>
                    <span className="text-gray-400 ml-1">({c.count}x, {c.usage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Fonts ({tokens.fonts.length})</h4>
            <div className="space-y-1">
              {tokens.fonts.slice(0, 10).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    {f.family} {f.size}px w{f.weight}
                  </code>
                  <span className="text-gray-400">({f.count}x)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Spacing ({tokens.spacing.length})</h4>
            <div className="space-y-1">
              {tokens.spacing.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-24">{s.type}:</span>
                  <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{s.value}px</code>
                  <span className="text-gray-400">({s.count}x)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frame Names */}
          {tokens.frameNames.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Frames</h4>
              <p className="text-xs text-gray-400">{tokens.frameNames.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FigmaImportSpike() {
  const [phase, setPhase] = useState<Phase>('input')
  const [urlText, setUrlText] = useState('')
  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([])
  const [extractedTokens, setExtractedTokens] = useState<ExtractedTokens | null>(null)
  const [classifiedSkill, setClassifiedSkill] = useState<SkillState>(emptySkillState)
  const [summary, setSummary] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Font upload state
  const [fontDisplay, setFontDisplay] = useState<CustomFont | null>(null)
  const [fontBody, setFontBody] = useState<CustomFont | null>(null)
  const [fontMono, setFontMono] = useState<CustomFont | null>(null)

  // Inject @font-face rules
  useEffect(() => {
    const fonts = [fontDisplay, fontBody, fontMono].filter(Boolean) as CustomFont[]
    if (fonts.length === 0) return

    const css = fonts.map(f =>
      `@font-face { font-family: "${f.name}"; src: url(${f.dataUrl}) format("${f.format}"); font-display: swap; }`
    ).join('\n')
    const style = document.createElement('style')
    style.setAttribute('data-figma-import-fonts', '')
    style.textContent = css
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [fontDisplay, fontBody, fontMono])

  const fontOverrides = useMemo(() => {
    const overrides: { display?: string; body?: string; mono?: string } = {}
    if (fontDisplay) overrides.display = `"${fontDisplay.name}", system-ui, sans-serif`
    if (fontBody) overrides.body = `"${fontBody.name}", system-ui, sans-serif`
    if (fontMono) overrides.mono = `"${fontMono.name}", ui-monospace, monospace`
    return Object.keys(overrides).length > 0 ? overrides : undefined
  }, [fontDisplay, fontBody, fontMono])

  // Parse URLs as user types
  useEffect(() => {
    const lines = urlText.split('\n').map(l => l.trim()).filter(Boolean)
    setParsedUrls(lines.map(parseFigmaUrl))
  }, [urlText])

  const validUrls = useMemo(() => parsedUrls.filter(p => p.valid), [parsedUrls])

  const handleFontUpload = useCallback((slot: 'display' | 'body' | 'mono', file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const formatMap: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }
    const format = formatMap[ext] ?? 'truetype'
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

    const reader = new FileReader()
    reader.onload = () => {
      const font: CustomFont = { name, dataUrl: reader.result as string, format }
      if (slot === 'display') setFontDisplay(font)
      else if (slot === 'body') setFontBody(font)
      else setFontMono(font)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleExtractAndClassify = useCallback(async () => {
    if (validUrls.length === 0) return

    setPhase('extracting')
    setError(null)
    setProgress('Fetching frames from Figma...')

    try {
      // Step 1: Fetch nodes from Figma API
      const fetchRes = await fetch('/api/ai/figma-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls.map(u => u.url) }),
      })

      const fetchData = await fetchRes.json()
      if (!fetchRes.ok) {
        throw new Error(fetchData.error ?? `API error ${fetchRes.status}`)
      }

      if (!fetchData.nodes || fetchData.nodes.length === 0) {
        throw new Error('No nodes returned from Figma. Check your URLs and FIGMA_PAT.')
      }

      // Step 2: Deterministic extraction
      setProgress(`Extracting values from ${fetchData.nodes.length} frame(s)...`)
      const tokens = extractTokens(fetchData.nodes)
      setExtractedTokens(tokens)

      if (tokens.colors.length === 0 && tokens.fonts.length === 0 && tokens.spacing.length === 0) {
        throw new Error('No design tokens found in the selected frames. Try selecting frames with visible content.')
      }

      // Step 3: AI classification
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
      setClassifiedSkill({
        color: result.color,
        typography: result.typography,
        spacing: result.spacing,
      })
      setSummary(result.summary)

      // Show warnings from Figma API
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

  const handleReset = useCallback(() => {
    setPhase('input')
    setUrlText('')
    setParsedUrls([])
    setExtractedTokens(null)
    setClassifiedSkill(emptySkillState())
    setSummary('')
    setError(null)
    setProgress('')
    setFontDisplay(null)
    setFontBody(null)
    setFontMono(null)
  }, [])

  const totalDecisions = useMemo(() => {
    return (['color', 'typography', 'spacing'] as const).reduce(
      (sum, d) => sum + classifiedSkill[d].decisions.length, 0
    )
  }, [classifiedSkill])

  const totalRules = useMemo(() => {
    return (['color', 'typography', 'spacing'] as const).reduce(
      (sum, d) => sum + classifiedSkill[d].rules.length, 0
    )
  }, [classifiedSkill])

  // ---------------------------------------------------------------------------
  // Input phase
  // ---------------------------------------------------------------------------

  if (phase === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Figma Import</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Paste Figma frame URLs to extract exact design tokens. Values come directly from the
            source file — no estimation needed. AI only classifies semantic roles.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: URL input */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Figma Frame URLs</h3>
            <p className="text-[10px] text-gray-400 mb-3">
              One URL per line. Right-click a frame in Figma and select &ldquo;Copy link&rdquo;.
            </p>
            <textarea
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder={'https://www.figma.com/design/abc123/My-Design?node-id=1-2\nhttps://www.figma.com/design/abc123/My-Design?node-id=3-4'}
              rows={6}
              className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
            />

            {/* URL validation preview */}
            {parsedUrls.length > 0 && (
              <div className="mt-3 space-y-1">
                {parsedUrls.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`flex-shrink-0 ${p.valid ? 'text-green-500' : 'text-red-400'}`}>
                      {p.valid ? '\u2713' : '\u2717'}
                    </span>
                    {p.valid ? (
                      <span className="text-gray-500 truncate">
                        File: <code className="text-[10px]">{p.fileKey}</code> Node: <code className="text-[10px]">{p.nodeId}</code>
                      </span>
                    ) : (
                      <span className="text-red-400 truncate">Invalid Figma URL</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: font uploads */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fonts</h3>
              <p className="text-[10px] text-gray-400 mb-3">Upload fonts to render in canonical component comparisons</p>
              <div className="space-y-2">
                {(['display', 'body', 'mono'] as const).map(slot => {
                  const font = slot === 'display' ? fontDisplay : slot === 'body' ? fontBody : fontMono
                  const clearFont = () => {
                    if (slot === 'display') setFontDisplay(null)
                    else if (slot === 'body') setFontBody(null)
                    else setFontMono(null)
                  }
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 capitalize">{slot}:</span>
                      {font ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300" style={{ fontFamily: `"${font.name}"` }}>
                            {font.name}
                          </span>
                          <button onClick={clearFont} className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer underline">
                          Upload
                          <input
                            type="file"
                            accept=".woff2,.woff,.ttf,.otf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFontUpload(slot, file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Method comparison */}
            <div className="bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">How it works</h3>
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex gap-2">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">1.</span>
                  <span>Fetch frame data from Figma REST API (exact node JSON)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">2.</span>
                  <span>Deterministic extraction: colors, fonts, spacing with frequency counts</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-500 flex-shrink-0 mt-0.5">3.</span>
                  <span>AI classifies values into semantic roles (Primary, Body Font, etc.)</span>
                </div>
              </div>
            </div>
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
            disabled={validUrls.length === 0}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Extract &amp; Classify {validUrls.length > 0 ? `(${validUrls.length} frame${validUrls.length !== 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Extracting phase
  // ---------------------------------------------------------------------------

  if (phase === 'extracting') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{progress}</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Review phase
  // ---------------------------------------------------------------------------

  if (phase === 'review') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classified Tokens</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDecisions} decisions, {totalRules} rules from {validUrls.length} Figma frame{validUrls.length !== 1 ? 's' : ''}.
            Values are exact — extracted directly from the source file.
          </p>
        </div>

        {/* Summary */}
        {summary && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Classification Summary</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">{summary}</p>
          </div>
        )}

        {/* Warnings */}
        {error && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
          </div>
        )}

        {/* Raw extracted data (collapsible) */}
        {extractedTokens && <ExtractedTokensPanel tokens={extractedTokens} />}

        {/* Classified tokens */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Classified Skill</h3>
          <InferredSkillPanel skill={classifiedSkill} />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setPhase('compare')}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors text-sm"
          >
            Compare Components
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
  // Compare phase
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Base vs. Figma Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Same canonical components, different skills. Ground-truth values from Figma.
        </p>
      </div>

      {/* Card comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Card</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalCard skill={BASE_SKILL} label="Base Skill" />
          <CanonicalCard skill={classifiedSkill} label="Figma Import" fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Form comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Form</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalForm skill={BASE_SKILL} label="Base Skill" />
          <CanonicalForm skill={classifiedSkill} label="Figma Import" fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Dashboard comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalDashboard skill={BASE_SKILL} label="Base Skill" />
          <CanonicalDashboard skill={classifiedSkill} label="Figma Import" fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Token diff */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Token Diff</h3>
        <div className="space-y-1">
          {(['color', 'typography', 'spacing'] as const).map(dim => {
            const baseDecs = BASE_SKILL[dim].decisions
            const impDecs = classifiedSkill[dim].decisions
            return baseDecs.map(bd => {
              const imp = impDecs.find(d => d.label === bd.label)
              const changed = imp && imp.value !== bd.value
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
                      <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 px-1 rounded text-purple-700 dark:text-purple-400">{imp!.value}</code>
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
          Back to Tokens
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
