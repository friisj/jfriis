'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Recipe } from '@/lib/types/remix'

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
  | { phase: 'complete'; jobId: string; chopCount: number; stemCount: number }
  | { phase: 'error'; message: string }

const STAGE_LABELS: Record<string, string> = {
  separating: 'Separating stems...',
  analyzing: 'Analyzing audio...',
  chopping: 'Chopping stems...',
}

export default function RemixNewJob() {
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [jobState, setJobState] = useState<JobState>({ phase: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recipes on mount
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
        stemCount: result.stem_urls?.length || 0,
        chopCount: result.chop_urls?.length || 0,
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

        {/* Recipe summary */}
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

      {/* Status */}
      {jobState.phase === 'complete' && (
        <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 space-y-2">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Processing complete
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              {jobState.stemCount} stems separated, {jobState.chopCount} chops
              generated
            </p>
            <p className="font-mono">Job: {jobState.jobId}</p>
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
