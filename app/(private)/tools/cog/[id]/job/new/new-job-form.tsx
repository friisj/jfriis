'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateCogJob,
  type GeneratedJob,
  type GeneratedJobStep,
} from '@/lib/ai/actions/generate-cog-job';
import { generateShootParams } from '@/lib/ai/actions/generate-shoot-params';
import { createJob, createJobSteps, createJobInputs, getCogImageUrl } from '@/lib/cog';
import { getMaxReferenceImagesForModel } from '@/lib/reference-images';
import type {
  CogJobStepInsert,
  CogSeries,
  CogImage,
  CogJobInputInsert,
  ShootParams,
  CogImageModel,
} from '@/lib/types/cog';

interface SelectedInput {
  image: CogImage;
  referenceId: number;
  context: string;
}

interface NewJobFormProps {
  series: CogSeries;
  images: CogImage[];
}

const emptyShootParams: ShootParams = {
  scene: null,
  art_direction: null,
  styling: null,
  camera: null,
  framing: null,
  lighting: null,
};

export function NewJobForm({ series, images }: NewJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [shotCount, setShotCount] = useState(3);
  const [selectedInputs, setSelectedInputs] = useState<SelectedInput[]>([]);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageModel, setImageModel] = useState<CogImageModel>('auto');

  // Shoot params state
  const [shootParams, setShootParams] = useState<ShootParams>(emptyShootParams);
  const [generatingParams, setGeneratingParams] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generated job state
  const [generatingShots, setGeneratingShots] = useState(false);
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

  // Max reference images based on selected model
  const maxReferenceImages = getMaxReferenceImagesForModel(imageModel);

  function toggleImageSelection(image: CogImage) {
    const existing = selectedInputs.find((s) => s.image.id === image.id);
    if (existing) {
      const filtered = selectedInputs.filter((s) => s.image.id !== image.id);
      setSelectedInputs(
        filtered.map((s, i) => ({ ...s, referenceId: i + 1 }))
      );
    } else if (selectedInputs.length < maxReferenceImages) {
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

  function updateShootParam(key: keyof ShootParams, value: string) {
    setShootParams((prev) => ({ ...prev, [key]: value || null }));
  }

  async function handleGenerateParams() {
    setGeneratingParams(true);
    setError(null);

    try {
      const params = await generateShootParams({
        seriesTitle: series.title,
        seriesDescription: series.description || undefined,
        seriesTags: series.tags || undefined,
        referenceCount: selectedInputs.length,
      });
      setShootParams(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate shoot params');
    } finally {
      setGeneratingParams(false);
    }
  }

  async function handleGenerateShots() {
    setGeneratingShots(true);
    setError(null);

    const referenceImages = selectedInputs.map((s) => ({
      referenceId: s.referenceId,
      context: s.context || 'Reference image',
    }));

    try {
      const job = await generateCogJob({
        basePrompt,
        imageCount: shotCount,
        seriesContext: {
          title: series.title,
          description: series.description || undefined,
          tags: series.tags || undefined,
        },
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        shootParams,
      });
      setGeneratedJob(job);
      setEditedSteps(job.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate shots');
    } finally {
      setGeneratingShots(false);
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
      const job = await createJob({
        series_id: series.id,
        title: generatedJob.title,
        base_prompt: basePrompt,
        negative_prompt: negativePrompt || null,
        scene: shootParams.scene,
        art_direction: shootParams.art_direction,
        styling: shootParams.styling,
        camera: shootParams.camera,
        framing: shootParams.framing,
        lighting: shootParams.lighting,
        image_model: imageModel,
        max_reference_images: maxReferenceImages,
        status: runImmediately ? 'ready' : 'draft',
      });

      if (selectedInputs.length > 0) {
        const inputsToCreate: CogJobInputInsert[] = selectedInputs.map((s) => ({
          job_id: job.id,
          image_id: s.image.id,
          reference_id: s.referenceId,
          context: s.context || null,
        }));
        await createJobInputs(inputsToCreate);
      }

      const stepsToCreate: CogJobStepInsert[] = editedSteps.map((step) => ({
        job_id: job.id,
        sequence: step.sequence,
        step_type: step.step_type,
        model: step.model,
        prompt: step.prompt,
        context: {},
      }));

      await createJobSteps(stepsToCreate);
      router.push(`/tools/cog/${series.id}/job/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      setLoading(false);
    }
  }

  const hasAnyShootParams = Object.values(shootParams).some(Boolean);

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
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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

      {/* Step 1: Configure Shoot */}
      {!generatedJob && (
        <div className="space-y-8">
          {/* Reference Images Section */}
          <div className="space-y-3">
            <Label>
              Subject References (optional{maxReferenceImages > 0 ? `, max ${maxReferenceImages}` : ''})
            </Label>
            <p className="text-xs text-muted-foreground">
              {maxReferenceImages === 0
                ? 'Reference images are not supported with the current model. Select a different model to enable subject references.'
                : `Select up to ${maxReferenceImages} images to use as subject references. The AI will recreate these subjects in new scenes.`}
            </p>

            {images.length === 0 && (
              <div className="p-4 border rounded-lg bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No images in this series yet.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tools/cog/${series.id}/upload`}>
                    Upload Reference Images
                  </Link>
                </Button>
              </div>
            )}

            {images.length > 0 && (
              <>

              {selectedInputs.length > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Selected Subjects</p>
                  {selectedInputs.map((input) => (
                    <div key={input.image.id} className="flex items-start gap-3">
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
                          placeholder={`Describe subject [${input.referenceId}] (e.g., "the person", "the dog")`}
                          value={input.context}
                          onChange={(e) => updateInputContext(input.image.id, e.target.value)}
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

              <div className="grid grid-cols-6 gap-2">
                {images.map((image) => {
                  const selected = selectedInputs.find((s) => s.image.id === image.id);
                  const isSelected = !!selected;
                  const canSelect = selectedInputs.length < maxReferenceImages || isSelected;

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
              </>
            )}
          </div>

          {/* Shoot Setup Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Shoot Setup</h3>
                <p className="text-xs text-muted-foreground">
                  Define the creative direction for this photo shoot
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateParams}
                disabled={generatingParams}
              >
                {generatingParams ? 'Generating...' : 'Generate from Series'}
              </Button>
            </div>

            {hasAnyShootParams && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="scene" className="text-xs">Scene</Label>
                    <Textarea
                      id="scene"
                      value={shootParams.scene || ''}
                      onChange={(e) => updateShootParam('scene', e.target.value)}
                      placeholder="Environment and setting..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="art_direction" className="text-xs">Art Direction</Label>
                    <Textarea
                      id="art_direction"
                      value={shootParams.art_direction || ''}
                      onChange={(e) => updateShootParam('art_direction', e.target.value)}
                      placeholder="Visual style and aesthetic..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="styling" className="text-xs">Styling</Label>
                    <Textarea
                      id="styling"
                      value={shootParams.styling || ''}
                      onChange={(e) => updateShootParam('styling', e.target.value)}
                      placeholder="Props, colors, textures..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lighting" className="text-xs">Lighting</Label>
                    <Textarea
                      id="lighting"
                      value={shootParams.lighting || ''}
                      onChange={(e) => updateShootParam('lighting', e.target.value)}
                      placeholder="Light quality and mood..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>

                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
                    {showAdvanced ? '▼' : '▶'} Camera & Framing
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="camera" className="text-xs">Camera</Label>
                        <Textarea
                          id="camera"
                          value={shootParams.camera || ''}
                          onChange={(e) => updateShootParam('camera', e.target.value)}
                          placeholder="Camera type, lens, settings..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="framing" className="text-xs">Framing</Label>
                        <Textarea
                          id="framing"
                          value={shootParams.framing || ''}
                          onChange={(e) => updateShootParam('framing', e.target.value)}
                          placeholder="Composition and angle..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {!hasAnyShootParams && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Click &quot;Generate from Series&quot; to auto-fill shoot parameters, or manually enter them above.
              </p>
            )}
          </div>

          {/* Image Model Selection */}
          <div className="space-y-3">
            <Label>Image Generation Model</Label>
            <Select value={imageModel} onValueChange={(v) => setImageModel(v as CogImageModel)}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended)</SelectItem>
                <SelectItem value="gemini-3-pro-image">Gemini 3 Pro Image (up to 14 refs, 4K)</SelectItem>
                <SelectItem value="imagen-3-capability">Imagen 3 Capability (subject refs)</SelectItem>
                <SelectItem value="imagen-4">Imagen 4 (text-only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {imageModel === 'auto' && 'Auto will select the best model based on reference images and available APIs.'}
              {imageModel === 'gemini-3-pro-image' && 'Supports up to 14 reference images, 4K output, and better text rendering.'}
              {imageModel === 'imagen-3-capability' && 'Vertex AI model for subject customization with up to 4 reference images.'}
              {imageModel === 'imagen-4' && 'High-quality text-to-image generation. Reference images will not be used.'}
            </p>
          </div>

          {/* Shot Count & Negative Prompt */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="count">Number of Shots</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={20}
                value={shotCount}
                onChange={(e) => setShotCount(parseInt(e.target.value) || 1)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Generate {shotCount} unique shot{shotCount !== 1 ? 's' : ''} from this shoot setup
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="negative">Negative Prompt (optional)</Label>
              <Input
                id="negative"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="e.g., blurry, low quality, text"
              />
              <p className="text-xs text-muted-foreground">
                What to avoid in generated images
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleGenerateShots} disabled={generatingShots}>
              {generatingShots ? 'Planning Shots...' : 'Plan Shots'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit Shots */}
      {generatedJob && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{generatedJob.title}</h2>
              <p className="text-sm text-muted-foreground">
                {editedSteps.length} shot{editedSteps.length !== 1 ? 's' : ''}
                {selectedInputs.length > 0 &&
                  ` · ${selectedInputs.length} subject ref${selectedInputs.length !== 1 ? 's' : ''}`}
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

          {/* Shoot Setup Summary */}
          {hasAnyShootParams && (
            <div className="p-3 border rounded-lg bg-muted/30 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Shoot Setup
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {shootParams.scene && (
                  <div><span className="text-muted-foreground">Scene:</span> {shootParams.scene}</div>
                )}
                {shootParams.art_direction && (
                  <div><span className="text-muted-foreground">Style:</span> {shootParams.art_direction}</div>
                )}
                {shootParams.lighting && (
                  <div><span className="text-muted-foreground">Lighting:</span> {shootParams.lighting}</div>
                )}
              </div>
            </div>
          )}

          {/* Selected References Summary */}
          {selectedInputs.length > 0 && (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Subjects:</span>
              {selectedInputs.map((input) => (
                <div
                  key={input.image.id}
                  className="relative"
                  title={input.context || `Subject [${input.referenceId}]`}
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

          {/* Shot List */}
          <div className="space-y-4">
            {editedSteps.map((step, index) => (
              <div
                key={step.sequence}
                className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background">
                    Shot {step.sequence}
                  </span>
                  {step.variation && (
                    <span className="text-xs text-muted-foreground italic">
                      {step.variation}
                    </span>
                  )}
                </div>
                <Textarea
                  value={step.prompt}
                  onChange={(e) => handleStepChange(index, 'prompt', e.target.value)}
                  rows={4}
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
