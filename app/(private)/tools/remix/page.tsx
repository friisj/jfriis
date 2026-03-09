'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Arrangement,
  PatternSet,
  Recipe,
  SampleBank,
} from '@/lib/types/remix'
import { generatePatterns } from '@/lib/remix/pattern-generator'
import { buildArrangement } from '@/lib/remix/arrangement-builder'
import { MixdownEngine } from '@/lib/remix/mixdown-engine'

interface RecipeOption {
  id: string
  name: string
  description: string
  config: Recipe
  is_preset: boolean
}

type JobState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'processing'; stage: string }
  | {
      phase: 'complete'
      jobId: string
      sampleBank: SampleBank
      stemUrls: string[]
      recipe: Recipe
    }
  | { phase: 'error'; message: string }

const STAGE_LABELS: Record<string, string> = {
  separating: 'Separating stems...',
  analyzing: 'Analyzing audio...',
  chopping: 'Chopping stems...',
}

// ---------------------------------------------------------------------------
// Audio preview hook (HTML5 Audio, simple play/stop)
// ---------------------------------------------------------------------------

function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)

  const toggle = useCallback(
    (url: string) => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
        audioRef.current = null
      }

      if (playingUrl === url) {
        setPlayingUrl(null)
        return
      }

      const audio = new Audio(url)
      audio.onended = () => {
        setPlayingUrl(null)
        audioRef.current = null
      }
      audio.play()
      audioRef.current = audio
      setPlayingUrl(url)
    },
    [playingUrl]
  )

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return { playingUrl, toggle }
}

// ---------------------------------------------------------------------------
// Play button component
// ---------------------------------------------------------------------------

function PlayButton({
  url,
  playingUrl,
  onToggle,
  label,
}: {
  url: string
  playingUrl: string | null
  onToggle: (url: string) => void
  label?: string
}) {
  const isPlaying = playingUrl === url
  return (
    <button
      onClick={() => onToggle(url)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        isPlaying
          ? 'bg-foreground text-background'
          : 'bg-muted hover:bg-accent text-foreground'
      }`}
    >
      <span className="w-3 text-center">{isPlaying ? '■' : '▶'}</span>
      {label && <span>{label}</span>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Results panel — stems & chops browser
// ---------------------------------------------------------------------------

function ResultsPanel({
  sampleBank,
  stemUrls,
}: {
  sampleBank: SampleBank
  stemUrls: string[]
}) {
  const { playingUrl, toggle } = useAudioPreview()
  const [expandedStems, setExpandedStems] = useState<Set<string>>(new Set())

  const toggleStemExpand = (stemType: string) => {
    setExpandedStems((prev) => {
      const next = new Set(prev)
      if (next.has(stemType)) next.delete(stemType)
      else next.add(stemType)
      return next
    })
  }

  const { source, analysis } = sampleBank
  const durationSec = (source.duration_ms / 1000).toFixed(1)

  const stemTypeToUrl: Record<string, string> = {}
  for (const url of stemUrls) {
    const match = url.match(/\/([^/]+)\.wav$/)
    if (match) stemTypeToUrl[match[1]] = url
  }

  return (
    <div className="space-y-6">
      {/* Analysis summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Duration', value: `${durationSec}s` },
          { label: 'BPM', value: `${Math.round(analysis.bpm)}` },
          { label: 'Key', value: analysis.key },
          {
            label: 'Sample Rate',
            value: `${(source.sample_rate / 1000).toFixed(1)}k`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono">{value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Stems */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Stems ({stemUrls.length})</h3>
        <div className="grid gap-2">
          {sampleBank.stems.map((stemGroup) => {
            const stemUrl = stemTypeToUrl[stemGroup.stem_type]
            const isExpanded = expandedStems.has(stemGroup.stem_type)
            return (
              <div
                key={stemGroup.stem_type}
                className="border rounded-lg overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  {stemUrl && (
                    <PlayButton
                      url={stemUrl}
                      playingUrl={playingUrl}
                      onToggle={toggle}
                    />
                  )}
                  <span className="font-medium text-sm flex-1">
                    {stemGroup.stem_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stemGroup.chops.length} chops
                  </span>
                  <button
                    onClick={() => toggleStemExpand(stemGroup.stem_type)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    {isExpanded ? '▾ hide' : '▸ chops'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/30 divide-y divide-border/50 max-h-64 overflow-y-auto">
                    {stemGroup.chops.map((chop) => (
                      <div
                        key={chop.id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <PlayButton
                          url={chop.audio_url}
                          playingUrl={playingUrl}
                          onToggle={toggle}
                        />
                        <span className="text-xs font-mono text-muted-foreground w-16">
                          {(chop.duration_ms / 1000).toFixed(2)}s
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chop.strategy}
                        </span>
                        <div className="flex-1" />
                        <div className="flex gap-1">
                          {chop.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/40 rounded-full"
                            style={{
                              width: `${Math.min(chop.energy * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Remix player — stages 4-6 (generate patterns, arrange, play)
// ---------------------------------------------------------------------------

function RemixPlayer({
  sampleBank,
  recipe,
}: {
  sampleBank: SampleBank
  recipe: Recipe
}) {
  const engineRef = useRef<MixdownEngine | null>(null)
  const [remixState, setRemixState] = useState<
    'idle' | 'loading' | 'ready' | 'playing' | 'error'
  >('idle')
  const [progress, setProgress] = useState({ bar: 0, total: 0 })
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000))
  const [generatedData, setGeneratedData] = useState<{
    patternSet: PatternSet
    arrangement: Arrangement
  } | null>(null)

  const generate = useCallback(async () => {
    setRemixState('loading')

    try {
      // Stage 4: Pattern generation
      const patternSet = generatePatterns(sampleBank, recipe, seed)

      // Stage 5: Arrangement
      const arrangement = buildArrangement(patternSet, recipe)

      setGeneratedData({ patternSet, arrangement })

      // Stage 6: Prepare mixdown engine
      const engine = new MixdownEngine()
      await engine.init()
      await engine.preloadChops(sampleBank)

      if (engineRef.current) engineRef.current.dispose()
      engineRef.current = engine

      setRemixState('ready')
      setProgress({ bar: 0, total: arrangement.total_bars })
    } catch (err) {
      console.error('[remix] Generation error:', err)
      setRemixState('error')
    }
  }, [sampleBank, recipe, seed])

  const play = useCallback(async () => {
    if (!engineRef.current || !generatedData) return

    setRemixState('playing')

    await engineRef.current.play(
      generatedData.arrangement,
      generatedData.patternSet,
      recipe,
      (bar, total) => {
        setProgress({ bar, total })
        if (bar >= total) setRemixState('ready')
      }
    )
  }, [generatedData, recipe])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    setRemixState('ready')
  }, [])

  const regenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 100000))
  }, [])

  // Auto-generate when seed changes
  useEffect(() => {
    if (remixState !== 'idle') {
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
    }
  }, [])

  const totalSteps = generatedData
    ? generatedData.patternSet.patterns.reduce(
        (sum, p) => sum + p.steps.length,
        0
      )
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Remix</h3>
        {generatedData && (
          <span className="text-xs text-muted-foreground font-mono">
            seed: {seed}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {remixState === 'idle' && (
          <button
            onClick={generate}
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Generate Remix
          </button>
        )}

        {remixState === 'loading' && (
          <span className="text-sm text-muted-foreground">
            Loading chops...
          </span>
        )}

        {(remixState === 'ready' || remixState === 'playing') && (
          <>
            <button
              onClick={remixState === 'playing' ? stop : play}
              className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {remixState === 'playing' ? '■ Stop' : '▶ Play'}
            </button>
            <button
              onClick={regenerate}
              disabled={remixState === 'playing'}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              Re-roll
            </button>
          </>
        )}

        {remixState === 'error' && (
          <button
            onClick={generate}
            className="px-4 py-2 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/5 transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Progress bar */}
      {remixState === 'playing' && progress.total > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/60 rounded-full transition-all duration-100"
              style={{
                width: `${(progress.bar / progress.total) * 100}%`,
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Bar {progress.bar} / {progress.total}
          </div>
        </div>
      )}

      {/* Generation summary */}
      {generatedData && remixState !== 'loading' && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1 font-mono">
          <div>
            {generatedData.patternSet.patterns.length} patterns, {totalSteps}{' '}
            steps
          </div>
          <div>
            {generatedData.arrangement.sections.length} sections,{' '}
            {generatedData.arrangement.total_bars} bars
          </div>
          <div>
            sections:{' '}
            {generatedData.arrangement.sections
              .map(
                (s) =>
                  `${s.name} (${s.lanes.length} lanes, ${s.length_bars} bars)`
              )
              .join(' → ')}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RemixNewJob() {
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [jobState, setJobState] = useState<JobState>({ phase: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/remix/recipes')
      .then((res) => res.json())
      .then((data: RecipeOption[]) => {
        setRecipes(data)
        if (data.length > 0) setSelectedRecipeId(data[0].id)
      })
      .catch(() => {})
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setAudioFile(file)
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    if (!audioFile || !selectedRecipeId) return

    const recipe = recipes.find((r) => r.id === selectedRecipeId)
    if (!recipe) return

    setJobState({ phase: 'uploading' })

    try {
      setJobState({ phase: 'processing', stage: 'separating' })

      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('recipe', JSON.stringify(recipe.config))
      formData.append('recipe_id', selectedRecipeId)

      const response = await fetch('/api/remix/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.details || err.error || 'Processing failed')
      }

      const result = await response.json()

      setJobState({
        phase: 'complete',
        jobId: result.job_id,
        sampleBank: result.sample_bank,
        stemUrls: result.stem_urls,
        recipe: recipe.config,
      })
    } catch (error) {
      setJobState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }, [audioFile, selectedRecipeId, recipes])

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Remix</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload audio, pick a recipe, and decompose it into stems and chops.
        </p>
      </div>

      {/* Audio Upload */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Source Audio</h2>
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-foreground/30"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {audioFile ? (
            <div className="space-y-1">
              <p className="font-medium">{audioFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click to select an audio file (WAV, MP3, FLAC)
            </p>
          )}
        </div>
      </section>

      {/* Recipe Picker */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recipe</h2>
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => setSelectedRecipeId(recipe.id)}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                selectedRecipeId === recipe.id
                  ? 'border-foreground bg-accent'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{recipe.name}</span>
                {recipe.is_preset && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    preset
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {recipe.description}
              </p>
            </button>
          ))}
        </div>

        {selectedRecipe && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1 font-mono">
            <div>
              stems: {selectedRecipe.config.separation.stems} (
              {selectedRecipe.config.separation.model})
            </div>
            <div>
              chop: {selectedRecipe.config.chopping.strategy},{' '}
              {selectedRecipe.config.chopping.min_length_ms}–
              {selectedRecipe.config.chopping.max_length_ms}ms
            </div>
            <div>
              density: {selectedRecipe.config.patterns.density}, swing:{' '}
              {selectedRecipe.config.patterns.swing}
            </div>
            <div>
              sections:{' '}
              {selectedRecipe.config.arrangement.sections
                .map((s) => s.name)
                .join(' → ')}
            </div>
          </div>
        )}
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={
          !audioFile ||
          !selectedRecipeId ||
          jobState.phase === 'uploading' ||
          jobState.phase === 'processing'
        }
        className="w-full py-3 px-4 bg-foreground text-background rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
      >
        {jobState.phase === 'idle' && 'Process'}
        {jobState.phase === 'uploading' && 'Uploading...'}
        {jobState.phase === 'processing' &&
          (STAGE_LABELS[jobState.stage] || 'Processing...')}
        {jobState.phase === 'complete' && 'Process Another'}
        {jobState.phase === 'error' && 'Retry'}
      </button>

      {/* Results */}
      {jobState.phase === 'complete' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Processing complete
            </p>
            <span className="text-xs font-mono text-muted-foreground">
              {jobState.jobId.slice(0, 8)}
            </span>
          </div>

          <ResultsPanel
            sampleBank={jobState.sampleBank}
            stemUrls={jobState.stemUrls}
          />

          <div className="border-t pt-6">
            <RemixPlayer
              sampleBank={jobState.sampleBank}
              recipe={jobState.recipe}
            />
          </div>
        </div>
      )}

      {jobState.phase === 'error' && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Error
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {jobState.message}
          </p>
        </div>
      )}
    </div>
  )
}
