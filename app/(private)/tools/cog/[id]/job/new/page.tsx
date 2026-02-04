'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateCogJob, type GeneratedJob, type GeneratedJobStep } from '@/lib/ai/actions/generate-cog-job';
import { createJob, createJobSteps } from '@/lib/cog';
import type { CogJobStepInsert } from '@/lib/types/cog';

interface Props {
  params: Promise<{ id: string }>;
}

export default function NewJobPage({ params }: Props) {
  const router = useRouter();
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [basePrompt, setBasePrompt] = useState('');
  const [imageCount, setImageCount] = useState(3);

  // Generated job state
  const [generatedJob, setGeneratedJob] = useState<GeneratedJob | null>(null);
  const [editedSteps, setEditedSteps] = useState<GeneratedJobStep[]>([]);

  // Resolve params
  useState(() => {
    params.then((p) => setSeriesId(p.id));
  });

  async function handleGenerate() {
    if (!basePrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const job = await generateCogJob({
        basePrompt,
        imageCount,
      });
      setGeneratedJob(job);
      setEditedSteps(job.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate job');
    } finally {
      setGenerating(false);
    }
  }

  function handleStepChange(index: number, field: keyof GeneratedJobStep, value: string) {
    setEditedSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSave(runImmediately: boolean) {
    if (!seriesId || !generatedJob) return;

    setLoading(true);
    setError(null);

    try {
      // Create the job
      const job = await createJob({
        series_id: seriesId,
        title: generatedJob.title,
        base_prompt: basePrompt,
        status: runImmediately ? 'ready' : 'draft',
      });

      // Create the steps
      const stepsToCreate: CogJobStepInsert[] = editedSteps.map((step) => ({
        job_id: job.id,
        sequence: step.sequence,
        step_type: step.step_type,
        model: step.model,
        prompt: step.prompt,
        context: step.context || {},
      }));

      await createJobSteps(stepsToCreate);

      // Navigate to job detail page
      router.push(`/tools/cog/${seriesId}/job/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      setLoading(false);
    }
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">New Job</h1>

      {error && (
        <div className="p-4 mb-6 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Input */}
      {!generatedJob && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Base Prompt</Label>
            <Textarea
              id="prompt"
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Describe what images you want to generate..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              The AI will expand this into detailed prompts for each image
            </p>
          </div>

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
                {editedSteps.length} steps · {editedSteps.filter((s) => s.step_type === 'image_gen').length} images
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
                  <span className="text-xs text-muted-foreground">{step.model}</span>
                </div>
                <Textarea
                  value={step.prompt}
                  onChange={(e) => handleStepChange(index, 'prompt', e.target.value)}
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
            <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
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
