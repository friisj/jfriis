'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  generateCogJob,
  type GeneratedJob,
  type GeneratedJobStep,
} from '@/lib/ai/actions/generate-cog-job';
import { createJob, createJobSteps, createJobInputs, getCogImageUrl } from '@/lib/cog';
import type { CogJobStepInsert, CogSeries, CogImage, CogJobInputInsert } from '@/lib/types/cog';

interface SelectedInput {
  image: CogImage;
  referenceId: number;
  context: string;
}

interface NewJobFormProps {
  series: CogSeries;
  images: CogImage[];
}

export function NewJobForm({ series, images }: NewJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [imageCount, setImageCount] = useState(3);
  const [selectedInputs, setSelectedInputs] = useState<SelectedInput[]>([]);
  const [negativePrompt, setNegativePrompt] = useState('');

  // Generated job state
  const [generatedJob, setGeneratedJob] = useState<GeneratedJob | null>(null);
  const [editedSteps, setEditedSteps] = useState<GeneratedJobStep[]>([]);

  // Derive base prompt from series context
  const basePrompt = [
    series.title,
    series.description,
    series.tags?.length ? `Tags: ${series.tags.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  function toggleImageSelection(image: CogImage) {
    const existing = selectedInputs.find((s) => s.image.id === image.id);
    if (existing) {
      // Remove and renumber
      const filtered = selectedInputs.filter((s) => s.image.id !== image.id);
      setSelectedInputs(
        filtered.map((s, i) => ({ ...s, referenceId: i + 1 }))
      );
    } else if (selectedInputs.length < 4) {
      // Add with next reference ID
      setSelectedInputs([
        ...selectedInputs,
        { image, referenceId: selectedInputs.length + 1, context: '' },
      ]);
    }
  }

  function updateInputContext(imageId: string, context: string) {
    setSelectedInputs((prev) =>
      prev.map((s) => (s.image.id === imageId ? { ...s, context } : s))
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    // Build reference images array for the generator
    const referenceImages = selectedInputs.map((s) => ({
      referenceId: s.referenceId,
      context: s.context || 'Reference image',
    }));

    try {
      const job = await generateCogJob({
        basePrompt,
        imageCount,
        seriesContext: {
          title: series.title,
          description: series.description || undefined,
          tags: series.tags || undefined,
        },
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      });
      setGeneratedJob(job);
      setEditedSteps(job.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate job');
    } finally {
      setGenerating(false);
    }
  }

  function handleStepChange(
    index: number,
    field: keyof GeneratedJobStep,
    value: string
  ) {
    setEditedSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSave(runImmediately: boolean) {
    if (!generatedJob) return;

    setLoading(true);
    setError(null);

    try {
      // Create the job
      const job = await createJob({
        series_id: series.id,
        title: generatedJob.title,
        base_prompt: basePrompt,
        negative_prompt: negativePrompt || null,
        status: runImmediately ? 'ready' : 'draft',
      });

      // Create the inputs if any
      if (selectedInputs.length > 0) {
        const inputsToCreate: CogJobInputInsert[] = selectedInputs.map((s) => ({
          job_id: job.id,
          image_id: s.image.id,
          reference_id: s.referenceId,
          context: s.context || null,
        }));
        await createJobInputs(inputsToCreate);
      }

      // Create the steps
      const stepsToCreate: CogJobStepInsert[] = editedSteps.map((step) => ({
        job_id: job.id,
        sequence: step.sequence,
        step_type: step.step_type,
        model: step.model,
        prompt: step.prompt,
        context: {},
      }));

      await createJobSteps(stepsToCreate);

      // Navigate to job detail page
      router.push(`/tools/cog/${series.id}/job/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Series Context Display */}
      <div className="p-4 border rounded-lg bg-muted/50">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Series Context
        </h2>
        <p className="font-semibold">{series.title}</p>
        {series.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {series.description}
          </p>
        )}
        {series.tags && series.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {series.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-background rounded-full border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Step 1: Configure */}
      {!generatedJob && (
        <div className="space-y-6">
          {/* Reference Images Selector */}
          {images.length > 0 && (
            <div className="space-y-3">
              <Label>Reference Images (optional, max 4)</Label>
              <p className="text-xs text-muted-foreground">
                Select images to use as style or subject references. Use [1],
                [2], etc. in prompts to reference them.
              </p>

              {/* Selected Inputs */}
              {selectedInputs.length > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Selected References</p>
                  {selectedInputs.map((input) => (
                    <div
                      key={input.image.id}
                      className="flex items-start gap-3"
                    >
                      <div className="relative">
                        <img
                          src={getCogImageUrl(input.image.storage_path)}
                          alt={input.image.filename}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <span className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          [{input.referenceId}]
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder={`Context for [${input.referenceId}] (e.g., "use as style reference")`}
                          value={input.context}
                          onChange={(e) =>
                            updateInputContext(input.image.id, e.target.value)
                          }
                          className="text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => toggleImageSelection(input.image)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Grid */}
              <div className="grid grid-cols-6 gap-2">
                {images.map((image) => {
                  const selected = selectedInputs.find(
                    (s) => s.image.id === image.id
                  );
                  const isSelected = !!selected;
                  const canSelect = selectedInputs.length < 4 || isSelected;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => canSelect && toggleImageSelection(image)}
                      disabled={!canSelect}
                      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : canSelect
                            ? 'border-transparent hover:border-muted-foreground/50'
                            : 'border-transparent opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <img
                        src={getCogImageUrl(image.storage_path)}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {selected.referenceId}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negative">Negative Prompt (optional)</Label>
            <Input
              id="negative"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g., blurry, low quality, text, watermark"
            />
            <p className="text-xs text-muted-foreground">
              Describe what to avoid in generated images
            </p>
          </div>

          {/* Image Count */}
          <div className="space-y-2">
            <Label htmlFor="count">Number of Images</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={20}
              value={imageCount}
              onChange={(e) => setImageCount(parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              The AI will generate {imageCount} unique image
              {imageCount !== 1 ? 's' : ''} based on the series context
              {selectedInputs.length > 0 &&
                ` and ${selectedInputs.length} reference image${selectedInputs.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Job Sequence'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit */}
      {generatedJob && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{generatedJob.title}</h2>
              <p className="text-sm text-muted-foreground">
                {editedSteps.length} steps ·{' '}
                {editedSteps.filter((s) => s.step_type === 'image_gen').length}{' '}
                images
                {selectedInputs.length > 0 &&
                  ` · ${selectedInputs.length} reference${selectedInputs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGeneratedJob(null);
                setEditedSteps([]);
              }}
            >
              Start Over
            </Button>
          </div>

          {/* Selected References Summary */}
          {selectedInputs.length > 0 && (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">References:</span>
              {selectedInputs.map((input) => (
                <div
                  key={input.image.id}
                  className="relative"
                  title={input.context || `Reference [${input.referenceId}]`}
                >
                  <img
                    src={getCogImageUrl(input.image.storage_path)}
                    alt={input.image.filename}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <span className="absolute -top-1 -left-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {input.referenceId}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {editedSteps.map((step, index) => (
              <div
                key={step.sequence}
                className={`border rounded-lg p-4 ${
                  step.step_type === 'llm'
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                    : 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background">
                    Step {step.sequence}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      step.step_type === 'llm'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}
                  >
                    {step.step_type === 'llm' ? 'LLM Analysis' : 'Image Generation'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step.model}
                  </span>
                </div>
                <Textarea
                  value={step.prompt}
                  onChange={(e) =>
                    handleStepChange(index, 'prompt', e.target.value)
                  }
                  rows={step.step_type === 'llm' ? 3 : 5}
                  className="bg-background"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={() => handleSave(true)} disabled={loading}>
              {loading ? 'Saving...' : 'Save & Run'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
