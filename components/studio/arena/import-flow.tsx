'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SkillState } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import type { ExtractedTokens } from '@/lib/studio/arena/figma-extractor'
import { extractTokens } from '@/lib/studio/arena/figma-extractor'
import { FigmaUrlInput, useFigmaUrls } from './figma-url-input'
import { FontSelector, useArenaFonts } from './font-selector'
import { ExtractedTokensPanel } from './extracted-tokens-panel'
import { SkillCompareView } from './skill-compare-view'
import { InferredSkillPanel } from '@/components/studio/prototypes/arena/shared/skill-panel'
import { BASE_SKILL } from '@/lib/studio/arena/base-skill'
import { saveImportedSkill } from '@/lib/studio/arena/actions'

type Phase = 'input' | 'extracting' | 'review' | 'compare' | 'saved'

interface ImportFlowProps {
  projectId?: string
  projectName?: string
  onComplete?: (skillId: string) => void
}

export function ImportFlow({ projectId, projectName, onComplete }: ImportFlowProps) {
  const [phase, setPhase] = useState<Phase>('input')
  const [urlText, setUrlText] = useState('')
  const [extractedTokens, setExtractedTokens] = useState<ExtractedTokens | null>(null)
  const [classifiedSkill, setClassifiedSkill] = useState<SkillState>(emptySkillState)
  const [summary, setSummary] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedSkillId, setSavedSkillId] = useState<string | null>(null)

  const { parsedUrls, validUrls } = useFigmaUrls(urlText)
  const { availableFonts, fontDisplay, fontBody, fontMono, fontOverrides, handleFontChange } = useArenaFonts()

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
      setClassifiedSkill({ color: result.color, typography: result.typography, spacing: result.spacing })
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
    setSaving(true)
    try {
      const name = projectName
        ? `${projectName} — Figma Import`
        : `Figma Import ${new Date().toISOString().slice(0, 10)}`

      const result = await saveImportedSkill({
        name,
        state: classifiedSkill,
        source: 'figma',
        project_id: projectId,
      })
      setSavedSkillId(result.id)
      setPhase('saved')
      onComplete?.(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skill')
    } finally {
      setSaving(false)
    }
  }, [classifiedSkill, projectId, projectName, onComplete])

  const handleReset = useCallback(() => {
    setPhase('input')
    setUrlText('')
    setExtractedTokens(null)
    setClassifiedSkill(emptySkillState())
    setSummary('')
    setError(null)
    setProgress('')
    setSavedSkillId(null)
  }, [])

  // ---- Input phase ----
  if (phase === 'input') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Figma Import</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Paste Figma frame URLs to extract exact design tokens. AI classifies semantic roles.
          </p>
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
            disabled={validUrls.length === 0}
            className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Extract &amp; Classify {validUrls.length > 0 ? `(${validUrls.length} frame${validUrls.length !== 1 ? 's' : ''})` : ''}
          </button>
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
          <p className="text-sm text-gray-600 dark:text-gray-400">{progress}</p>
        </div>
      </div>
    )
  }

  // ---- Review phase ----
  if (phase === 'review') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classified Tokens</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalDecisions} decisions, {totalRules} rules from {validUrls.length} frame{validUrls.length !== 1 ? 's' : ''}.
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
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:bg-gray-300 transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Skill'}
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

  // ---- Saved phase ----
  if (phase === 'saved') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-green-600 text-xl">{'\u2713'}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Skill Saved</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The design skill has been persisted to the database.
          </p>
          <div className="flex gap-3">
            {savedSkillId && (
              <a
                href={`/apps/arena/skills/${savedSkillId}`}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors text-sm"
              >
                View Skill
              </a>
            )}
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Import Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Compare phase ----
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Base vs. Figma Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Same canonical components, different skills. Ground-truth values from Figma.
        </p>
      </div>

      <SkillCompareView
        baseSkill={BASE_SKILL}
        compareSkill={classifiedSkill}
        baseLabel="Base Skill"
        compareLabel="Figma Import"
        fontOverrides={fontOverrides}
      />

      <div className="flex gap-3 justify-center">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:bg-gray-300 transition-colors text-sm"
        >
          {saving ? 'Saving...' : 'Save Skill'}
        </button>
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
