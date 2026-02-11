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
import { StepBuilder } from './step-builder';
import { StoryInput, ReferenceImageSelector } from './initial-input-selector';
import { createPipelineJob } from '@/lib/cog';
import { runFoundation } from '@/lib/ai/actions/run-pipeline-job';
import type { CogImage, CogPhotographerConfig, CogDirectorConfig, CogProductionConfig, CogPipelineStepInsert } from '@/lib/types/cog';

interface PipelineBuilderFormProps {
  seriesId: string;
  images: CogImage[];
  photographerConfigs: CogPhotographerConfig[];
  directorConfigs: CogDirectorConfig[];
  productionConfigs: CogProductionConfig[];
}

export type PipelineStepConfig = Omit<CogPipelineStepInsert, 'job_id'>;

export function PipelineBuilderForm({ seriesId, images, photographerConfigs, directorConfigs, productionConfigs }: PipelineBuilderFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<'configure' | 'review'>('configure');

  // Form state
  const [title, setTitle] = useState('');
  const [basePrompt, setBasePrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [steps, setSteps] = useState<PipelineStepConfig[]>([]);

  // Config selection
  const [photographerConfigId, setPhotographerConfigId] = useState<string>('');
  const [directorConfigId, setDirectorConfigId] = useState<string>('');
  const [productionConfigId, setProductionConfigId] = useState<string>('');

  // Creative inputs
  const [colors, setColors] = useState<string>('');  // comma-separated
  const [themes, setThemes] = useState<string>('');  // comma-separated

  // Inference controls
  const [numBaseImages, setNumBaseImages] = useState(3);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigureDone = () => {
    // Validation
    if (!basePrompt.trim()) {
      setError('Story is required');
      return;
    }
    if (steps.length === 0) {
      setError('At least one step is required');
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
      const { job } = await createPipelineJob({
        series_id: seriesId,
        title: title || null,
        initial_images: selectedImages.length > 0 ? selectedImages : null,
        base_prompt: basePrompt,
        // Pipeline config references
        photographer_config_id: photographerConfigId || null,
        director_config_id: directorConfigId || null,
        production_config_id: productionConfigId || null,
        // Creative inputs
        colors: colors ? colors.split(',').map(c => c.trim()).filter(Boolean) : null,
        themes: themes ? themes.split(',').map(t => t.trim()).filter(Boolean) : null,
        // Execution controls
        num_base_images: numBaseImages,
        steps: steps.map((step, idx) => ({
          ...step,
          job_id: '', // Will be set by the function
          step_order: idx,
        })),
      });

      if (runImmediately) {
        // Two-phase execution: run foundation first
        // Sequence phase runs after user selects a base image
        runFoundation({ jobId: job.id, seriesId }).catch((err) => {
          console.error('Failed to run foundation:', err);
        });
        // Navigate to monitor page
        router.push(`/tools/cog/${seriesId}/pipeline/${job.id}`);
      } else {
        router.push(`/tools/cog/${seriesId}`);
      }
    } catch (err) {
      console.error('Failed to create pipeline job:', err);
      setError(err instanceof Error ? err.message : 'Failed to create pipeline job');
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

            <div>
              <Label className="text-sm font-medium">Story</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {basePrompt}
              </p>
            </div>

            {selectedImages.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Reference Images</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedImages.length} image(s) selected
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Pipeline Steps</Label>
              <div className="space-y-2 mt-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium capitalize">
                        {step.step_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({step.model})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save & Run'}
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
        <CardContent>
          <StoryInput
            basePrompt={basePrompt}
            onBasePromptChange={setBasePrompt}
          />
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

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <StepBuilder steps={steps} onStepsChange={setSteps} />
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
