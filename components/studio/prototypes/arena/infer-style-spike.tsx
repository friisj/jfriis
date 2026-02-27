'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { SkillState } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import { BASE_SKILL } from '@/lib/studio/arena/base-skill'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from './shared/canonical-components'
import { InferredSkillPanel } from './shared/skill-panel'

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
// Types — local to this spike
// ---------------------------------------------------------------------------

type InputType = 'url' | 'image' | 'svg' | 'css'

interface StyleInput {
  id: string
  type: InputType
  value: string
  label: string
  addedAt: number
}

interface CustomFont {
  name: string
  dataUrl: string
  format: string
}

interface InferenceResult {
  inputId: string
  skillDelta: Partial<SkillState>
  summary: string
}

type Phase = 'collect' | 'review' | 'compare'

// ---------------------------------------------------------------------------
// Input collection
// ---------------------------------------------------------------------------

function InputCollector({ onAdd }: { onAdd: (input: StyleInput) => void }) {
  const [url, setUrl] = useState('')
  const [css, setCss] = useState('')
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

  const handleAddCss = () => {
    if (!css.trim()) return
    const firstProp = css.match(/[\w-]+\s*:/)
    const label = firstProp ? `CSS (${firstProp[0].replace(':', '').trim()}\u2026)` : 'Pasted CSS'
    onAdd({
      id: `css-${Date.now()}`,
      type: 'css',
      value: css.trim(),
      label,
      addedAt: Date.now(),
    })
    setCss('')
  }

  const handleFile = useCallback((file: File) => {
    if (file.name.endsWith('.svg') || file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => {
        onAdd({
          id: `svg-${Date.now()}-${file.name}`,
          type: 'svg',
          value: reader.result as string,
          label: file.name,
          addedAt: Date.now(),
        })
      }
      reader.readAsText(file)
      return
    }

    if (file.type.startsWith('image/')) {
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/') || f.name.endsWith('.svg')
    )
    for (const file of files) handleFile(file)
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      f => f.type.startsWith('image/') || f.name.endsWith('.svg')
    )
    for (const file of files) handleFile(file)
    e.target.value = ''
  }, [handleFile])

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

      {/* CSS paste */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
          Paste CSS
          <span className="font-normal text-gray-400 ml-1">from Figma Inspect or DevTools</span>
        </label>
        <textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          placeholder={'font-family: Inter, sans-serif;\nfont-size: 16px;\ncolor: #1a1a2e;\nborder-radius: 12px;'}
          rows={4}
          className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
        />
        <button
          onClick={handleAddCss}
          disabled={!css.trim()}
          className="mt-1 px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add CSS
        </button>
      </div>

      {/* Image / SVG drop zone */}
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
          Drop screenshots or SVG files, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
            browse
            <input type="file" accept="image/*,.svg" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, SVG</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InferStyleSpike() {
  const [phase, setPhase] = useState<Phase>('collect')
  const [inputs, setInputs] = useState<StyleInput[]>([])
  const [inferredSkill, setInferredSkill] = useState<SkillState>(emptySkillState)
  const [inferring, setInferring] = useState(false)
  const [inferProgress, setInferProgress] = useState<{ current: number; total: number; label: string } | null>(null)
  const [inferError, setInferError] = useState<string | null>(null)
  const [results, setResults] = useState<InferenceResult[]>([])
  const [fontDisplay, setFontDisplay] = useState<CustomFont | null>(null)
  const [fontBody, setFontBody] = useState<CustomFont | null>(null)
  const [fontMono, setFontMono] = useState<CustomFont | null>(null)

  // Inject @font-face rules for uploaded fonts
  useEffect(() => {
    const fonts = [fontDisplay, fontBody, fontMono].filter(Boolean) as CustomFont[]
    if (fonts.length === 0) return

    const css = fonts.map(f =>
      `@font-face { font-family: "${f.name}"; src: url(${f.dataUrl}) format("${f.format}"); font-display: swap; }`
    ).join('\n')
    const style = document.createElement('style')
    style.setAttribute('data-infer-style-fonts', '')
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

  const handleAddInput = useCallback((input: StyleInput) => {
    setInputs(prev => [...prev, input])
  }, [])

  const handleRemoveInput = useCallback((id: string) => {
    setInputs(prev => prev.filter(i => i.id !== id))
  }, [])

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

  const handleInfer = useCallback(async () => {
    if (inputs.length === 0) return
    setInferring(true)
    setInferProgress({ current: 0, total: inputs.length, label: '' })
    setInferError(null)

    let currentSkill: SkillState | undefined = undefined
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
        let inputType: 'image' | 'url' | 'svg' | 'css' = input.type

        if (input.type === 'url') {
          inputType = 'url'
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

        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'arena-infer-style',
            input: {
              inputType,
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
    setFontDisplay(null)
    setFontBody(null)
    setFontMono(null)
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
            Add screenshots, SVGs, CSS, or URLs of interfaces whose style you want to capture.
            The agent will analyze each input and build a design skill.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: add inputs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Style Inputs</h3>
            <InputCollector onAdd={handleAddInput} />
          </div>

          {/* Right: input list + fonts */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Added ({inputs.length})
              </h3>
              {inputs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No inputs yet. Add a URL, paste CSS, or drop a screenshot.</p>
              ) : (
                <div className="space-y-2">
                  {inputs.map(input => (
                    <div key={input.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      {input.type === 'image' ? (
                        <img src={input.value} alt={input.label} className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${
                          input.type === 'svg'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            : input.type === 'css'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {input.type === 'svg' ? 'SVG' : input.type === 'css' ? 'CSS' : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
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

            {/* Font uploads */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fonts</h3>
              <p className="text-[10px] text-gray-400 mb-3">Upload fonts to render in canonical components</p>
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
                          <button
                            onClick={clearFont}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
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
          </div>
        </div>

        {/* Base components preview */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Canonical Components (Base Skill)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CanonicalCard skill={BASE_SKILL} label="Card" fontOverrides={fontOverrides} />
            <CanonicalForm skill={BASE_SKILL} label="Form" fontOverrides={fontOverrides} />
          </div>
          <div className="mt-6">
            <CanonicalDashboard skill={BASE_SKILL} label="Dashboard" fontOverrides={fontOverrides} />
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
          <CanonicalCard skill={inferredSkill} label="Inferred Skill" fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Form comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Form</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalForm skill={BASE_SKILL} label="Base Skill" />
          <CanonicalForm skill={inferredSkill} label="Inferred Skill" fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Dashboard comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalDashboard skill={BASE_SKILL} label="Base Skill" />
          <CanonicalDashboard skill={inferredSkill} label="Inferred Skill" fontOverrides={fontOverrides} />
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
