'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoryInput, ReferenceImageSelector } from './initial-input-selector';
import { InferenceStepControls } from './inference-step-controls';
import { createPipelineJob, updatePipelineJob } from '@/lib/cog';
import { runFoundation } from '@/lib/ai/actions/run-pipeline-job';
import { INFERENCE_STEP_DEFAULTS } from '@/lib/ai/inference-defaults';
import type { CogImage, CogJob, CogPhotographerConfig, CogDirectorConfig, CogProductionConfig, CogImageModel, CogAspectRatio, InferenceStepConfigs } from '@/lib/types/cog';

interface PipelineBuilderFormProps {
  seriesId: string;
  images: CogImage[];
  photographerConfigs: CogPhotographerConfig[];
  directorConfigs: CogDirectorConfig[];
  productionConfigs: CogProductionConfig[];
  existingJob?: CogJob;
}

export function PipelineBuilderForm({ seriesId, images, photographerConfigs, directorConfigs, productionConfigs, existingJob }: PipelineBuilderFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<'configure' | 'review'>('configure');

  // Form state — pre-fill from existingJob when editing
  const [title, setTitle] = useState(existingJob?.title || '');
  const [basePrompt, setBasePrompt] = useState(existingJob?.base_prompt || '');
  const [negativePrompt, setNegativePrompt] = useState(existingJob?.negative_prompt || '');
  const [selectedImages, setSelectedImages] = useState<string[]>(existingJob?.initial_images || []);

  // Config selection
  const [photographerConfigId, setPhotographerConfigId] = useState<string>(existingJob?.photographer_config_id || '');
  const [directorConfigId, setDirectorConfigId] = useState<string>(existingJob?.director_config_id || '');
  const [productionConfigId, setProductionConfigId] = useState<string>(existingJob?.production_config_id || '');

  // Creative inputs
  const [colors, setColors] = useState<string>(existingJob?.colors?.join(', ') || '');
  const [themes, setThemes] = useState<string>(existingJob?.themes?.join(', ') || '');

  // Per-step inference overrides
  const [inferenceStepConfigs, setInferenceStepConfigs] = useState<InferenceStepConfigs | null>(existingJob?.inference_step_configs ?? null);

  // Inference controls
  const [numBaseImages, setNumBaseImages] = useState(existingJob?.num_base_images ?? 3);
  const [foundationModel, setFoundationModel] = useState<CogImageModel>(existingJob?.foundation_model || 'gemini-3-pro-image');
  const [aspectRatio, setAspectRatio] = useState<CogAspectRatio>(existingJob?.aspect_ratio || '1:1');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigureDone = () => {
    // Validation
    if (!basePrompt.trim()) {
      setError('Story is required');
      return;
    }
    setError(null);
    setStage('review');
  };

  const handleImagesUploaded = () => {
    // Refresh the page to get updated images list
    router.refresh();
  };

  const handleSave = async (runImmediately: boolean) => {
    setError(null);
    setIsSaving(true);

    try {
      const jobFields = {
        title: title || null,
        initial_images: selectedImages.length > 0 ? selectedImages : null,
        base_prompt: basePrompt,
        negative_prompt: negativePrompt || null,
        photographer_config_id: photographerConfigId || null,
        director_config_id: directorConfigId || null,
        production_config_id: productionConfigId || null,
        colors: colors ? colors.split(',').map(c => c.trim()).filter(Boolean) : null,
        themes: themes ? themes.split(',').map(t => t.trim()).filter(Boolean) : null,
        num_base_images: numBaseImages,
        foundation_model: foundationModel,
        aspect_ratio: aspectRatio,
        inference_step_configs: inferenceStepConfigs,
      };

      let jobId: string;

      if (existingJob) {
        const updated = await updatePipelineJob(existingJob.id, jobFields);
        jobId = updated.id;
      } else {
        const { job } = await createPipelineJob({
          series_id: seriesId,
          ...jobFields,
        });
        jobId = job.id;
      }

      if (runImmediately) {
        runFoundation({ jobId, seriesId }).catch((err) => {
          console.error('Failed to run foundation:', err);
        });
        router.push(`/tools/cog/${seriesId}/pipeline/${jobId}`);
      } else {
        router.push(`/tools/cog/${seriesId}`);
      }
    } catch (err) {
      console.error('Failed to save pipeline job:', err);
      setError(err instanceof Error ? err.message : 'Failed to save pipeline job');
      setIsSaving(false);
    }
  };

  if (stage === 'review') {
    return (
      <div className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <p className="text-sm text-muted-foreground">
                {title || <span className="italic">Untitled Pipeline</span>}
              </p>
            </div>

            {photographerConfigId && (
              <div>
                <Label className="text-sm font-medium">Photographer</Label>
                <p className="text-sm text-muted-foreground">
                  {photographerConfigs.find((c) => c.id === photographerConfigId)?.name}
                </p>
              </div>
            )}
            {directorConfigId && (
              <div>
                <Label className="text-sm font-medium">Director</Label>
                <p className="text-sm text-muted-foreground">
                  {directorConfigs.find((c) => c.id === directorConfigId)?.name}
                </p>
              </div>
            )}
            {productionConfigId && (
              <div>
                <Label className="text-sm font-medium">Production</Label>
                <p className="text-sm text-muted-foreground">
                  {productionConfigs.find((c) => c.id === productionConfigId)?.name}
                </p>
              </div>
            )}

            <div className="flex gap-8">
              <div>
                <Label className="text-sm font-medium">Foundation Model</Label>
                <p className="text-sm text-muted-foreground">{foundationModel}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Aspect Ratio</Label>
                <p className="text-sm text-muted-foreground">{aspectRatio}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Story</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {basePrompt}
              </p>
            </div>

            {negativePrompt && (
              <div>
                <Label className="text-sm font-medium">Negative Prompt</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {negativePrompt}
                </p>
              </div>
            )}

            {selectedImages.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Reference Images</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedImages.length} image(s) selected
                </p>
              </div>
            )}

            {inferenceStepConfigs && Object.keys(inferenceStepConfigs).length > 0 && (
              <div>
                <Label className="text-sm font-medium">Inference Step Overrides</Label>
                <ul className="text-sm text-muted-foreground space-y-0.5 mt-1">
                  {Object.entries(inferenceStepConfigs).map(([stepStr, override]) => {
                    const step = Number(stepStr);
                    const defaults = INFERENCE_STEP_DEFAULTS[step];
                    if (!defaults) return null;
                    const parts: string[] = [];
                    if (!override.enabled) {
                      parts.push('disabled');
                    } else {
                      if (override.temperature !== undefined && override.temperature !== defaults.temperature)
                        parts.push(`temp ${override.temperature}`);
                      if (override.max_tokens !== undefined && override.max_tokens !== defaults.max_tokens)
                        parts.push(`${override.max_tokens} tokens`);
                      if (override.thinking !== undefined && override.thinking !== defaults.thinking)
                        parts.push(override.thinking ? 'thinking on' : 'thinking off');
                    }
                    if (parts.length === 0) return null;
                    return (
                      <li key={step}>
                        <span className="font-mono text-xs">#{step}</span> {defaults.label}: {parts.join(', ')}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setStage('configure')}
            disabled={isSaving}
          >
            Back to Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : existingJob ? 'Update Draft' : 'Save as Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? 'Saving...' : existingJob ? 'Update & Run' : 'Save & Run'}
          </Button>
        </div>
      </div>
    );
  }

  // Configure stage
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Product Photography Pipeline"
            />
          </div>

          {/* Config Selectors */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Pipeline Configs</Label>
            <Link href="/tools/cog?tab=library" className="text-xs text-muted-foreground hover:text-foreground">
              Manage config library
            </Link>
          </div>
          {photographerConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Photographer Config</Label>
                {photographerConfigId && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPhotographerConfigId('')} className="h-auto py-0 px-2 text-xs">Clear</Button>
                )}
              </div>
              <Select value={photographerConfigId || undefined} onValueChange={setPhotographerConfigId}>
                <SelectTrigger><SelectValue placeholder="Select photographer config" /></SelectTrigger>
                <SelectContent>
                  {photographerConfigs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {directorConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Director Config</Label>
                {directorConfigId && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDirectorConfigId('')} className="h-auto py-0 px-2 text-xs">Clear</Button>
                )}
              </div>
              <Select value={directorConfigId || undefined} onValueChange={setDirectorConfigId}>
                <SelectTrigger><SelectValue placeholder="Select director config" /></SelectTrigger>
                <SelectContent>
                  {directorConfigs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {productionConfigs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Production Config</Label>
                {productionConfigId && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProductionConfigId('')} className="h-auto py-0 px-2 text-xs">Clear</Button>
                )}
              </div>
              <Select value={productionConfigId || undefined} onValueChange={setProductionConfigId}>
                <SelectTrigger><SelectValue placeholder="Select production config" /></SelectTrigger>
                <SelectContent>
                  {productionConfigs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Creative Inputs */}
          <div className="space-y-2">
            <Label htmlFor="colors">Colors (optional, comma-separated)</Label>
            <Input
              id="colors"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="e.g., deep blue, warm gold, crimson"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="themes">Themes/Topics (optional, comma-separated)</Label>
            <Input
              id="themes"
              value={themes}
              onChange={(e) => setThemes(e.target.value)}
              placeholder="e.g., nostalgia, urban decay, golden hour"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numBaseImages">Base Image Candidates</Label>
            <Input
              id="numBaseImages"
              type="number"
              min={1}
              max={10}
              value={numBaseImages}
              onChange={(e) => setNumBaseImages(parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground">How many candidate base images to generate in the foundation phase</p>
          </div>

          <div className="space-y-2">
            <Label>Foundation Image Model</Label>
            <Select value={foundationModel} onValueChange={(v) => setFoundationModel(v as CogImageModel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-3-pro-image">Gemini 3 Pro (recommended)</SelectItem>
                <SelectItem value="flux-2-dev">Flux 2 Dev</SelectItem>
                <SelectItem value="flux-2-pro">Flux 2 Pro</SelectItem>
                <SelectItem value="imagen-3-capability">Imagen 3</SelectItem>
                <SelectItem value="imagen-4">Imagen 4</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Which image model to use for generating base candidates</p>
          </div>

          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as CogAspectRatio)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                <SelectItem value="3:2">3:2 (Landscape)</SelectItem>
                <SelectItem value="2:3">2:3 (Portrait)</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="3:4">3:4</SelectItem>
                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                <SelectItem value="4:5">4:5</SelectItem>
                <SelectItem value="5:4">5:4</SelectItem>
                <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Aspect ratio for generated base candidates</p>
          </div>
        </CardContent>
      </Card>

      {/* Inference Step Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Inference Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fine-tune the 7-step LLM inference chain. Toggle steps on/off and adjust temperature, token limits, and thinking mode per step.
          </p>
        </CardHeader>
        <CardContent>
          <InferenceStepControls
            value={inferenceStepConfigs}
            onChange={setInferenceStepConfigs}
          />
        </CardContent>
      </Card>

      {/* Story */}
      <Card>
        <CardHeader>
          <CardTitle>Story</CardTitle>
          <p className="text-sm text-muted-foreground">
            Describe your creative vision. When pipeline configs are selected, this story drives the multi-step inference process that generates the image prompt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <StoryInput
            basePrompt={basePrompt}
            onBasePromptChange={setBasePrompt}
          />
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Negative Prompt (optional)</Label>
            <Textarea
              id="negativePrompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g., no text, no logos, no watermarks, no people"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Elements to exclude from the generated image. Folded into the final synthesized prompt.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reference Images */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Images</CardTitle>
          <p className="text-sm text-muted-foreground">
            Optional images for style reference. These are analyzed during inference to inform the visual direction.
          </p>
        </CardHeader>
        <CardContent>
          <ReferenceImageSelector
            selectedImages={selectedImages}
            onSelectedImagesChange={setSelectedImages}
            availableImages={images}
            seriesId={seriesId}
            onImagesUploaded={handleImagesUploaded}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleConfigureDone} size="lg">
          Review Pipeline
        </Button>
      </div>
    </div>
  );
}
