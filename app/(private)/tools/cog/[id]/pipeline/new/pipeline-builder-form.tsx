'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StepBuilder } from './step-builder';
import { InitialInputSelector } from './initial-input-selector';
import { createPipelineJob } from '@/lib/cog';
import { runPipelineJob } from '@/lib/ai/actions/run-pipeline-job';
import type { CogImage, CogStyleGuide, CogPipelineStepInsert } from '@/lib/types/cog';

interface PipelineBuilderFormProps {
  seriesId: string;
  images: CogImage[];
  styleGuides: CogStyleGuide[];
}

export type PipelineStepConfig = Omit<CogPipelineStepInsert, 'job_id'>;

export function PipelineBuilderForm({ seriesId, images, styleGuides }: PipelineBuilderFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<'configure' | 'review'>('configure');

  // Form state
  const [title, setTitle] = useState('');
  const [styleGuideId, setStyleGuideId] = useState<string>('');
  const [basePrompt, setBasePrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [steps, setSteps] = useState<PipelineStepConfig[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigureDone = () => {
    // Validation
    if (!basePrompt.trim()) {
      setError('Initial prompt is required');
      return;
    }
    if (steps.length === 0) {
      setError('At least one step is required');
      return;
    }
    setError(null);
    setStage('review');
  };

  const handleSave = async (runImmediately: boolean) => {
    setError(null);
    setIsSaving(true);

    try {
      const { job } = await createPipelineJob({
        series_id: seriesId,
        title: title || null,
        style_guide_id: styleGuideId || null,
        initial_images: selectedImages.length > 0 ? selectedImages : null,
        base_prompt: basePrompt,
        steps: steps.map((step, idx) => ({
          ...step,
          job_id: '', // Will be set by the function
          step_order: idx,
        })),
      });

      if (runImmediately) {
        // Trigger job execution in background
        runPipelineJob({ jobId: job.id, seriesId }).catch((err) => {
          console.error('Failed to run pipeline:', err);
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

            {styleGuideId && (
              <div>
                <Label className="text-sm font-medium">Style Guide</Label>
                <p className="text-sm text-muted-foreground">
                  {styleGuides.find((g) => g.id === styleGuideId)?.name}
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Initial Prompt</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {basePrompt}
              </p>
            </div>

            {selectedImages.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Initial Images</Label>
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

          {styleGuides.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="style-guide">Style Guide (optional)</Label>
              <Select value={styleGuideId} onValueChange={setStyleGuideId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a style guide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {styleGuides.map((guide) => (
                    <SelectItem key={guide.id} value={guide.id}>
                      {guide.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initial Input */}
      <Card>
        <CardHeader>
          <CardTitle>Initial Input</CardTitle>
        </CardHeader>
        <CardContent>
          <InitialInputSelector
            basePrompt={basePrompt}
            onBasePromptChange={setBasePrompt}
            selectedImages={selectedImages}
            onSelectedImagesChange={setSelectedImages}
            availableImages={images}
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
