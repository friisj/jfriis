'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { runCogJob } from '@/lib/ai/actions/run-cog-job';
import { updateJob } from '@/lib/cog';
import type { CogImageModel } from '@/lib/types/cog';

interface JobRunnerProps {
  jobId: string;
  seriesId: string;
  currentModel: CogImageModel;
  hasReferenceImages: boolean;
}

const modelLabels: Record<CogImageModel, string> = {
  'auto': 'Auto (recommended)',
  'gemini-3-pro-image': 'Gemini 3 Pro Image',
  'imagen-3-capability': 'Imagen 3 Capability',
  'imagen-4': 'Imagen 4',
};

const modelDescriptions: Record<CogImageModel, string> = {
  'auto': 'Auto-select based on references',
  'gemini-3-pro-image': 'Up to 14 refs, 4K output',
  'imagen-3-capability': 'Up to 4 subject refs (Vertex)',
  'imagen-4': 'Text-only, no references',
};

export function JobRunner({ jobId, seriesId, currentModel, hasReferenceImages }: JobRunnerProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageModel, setImageModel] = useState<CogImageModel>(currentModel || 'auto');

  // Sync state if prop changes (e.g., after page refresh)
  useEffect(() => {
    setImageModel(currentModel || 'auto');
  }, [currentModel]);

  async function handleModelChange(value: string) {
    const newModel = value as CogImageModel;
    setImageModel(newModel);

    // Update the job immediately
    try {
      await updateJob(jobId, { image_model: newModel });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
    }
  }

  async function handleRun() {
    setRunning(true);
    setError(null);

    try {
      await runCogJob({ jobId, seriesId });
      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run job');
      setRunning(false);
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Ready to run</p>
          <p className="text-sm text-muted-foreground">
            This will execute all steps sequentially
          </p>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? 'Running...' : 'Run Job'}
        </Button>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground">Image Model</label>
          <Select value={imageModel} onValueChange={handleModelChange} disabled={running}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select model">{modelLabels[imageModel]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{modelLabels['auto']}</SelectItem>
              <SelectItem value="gemini-3-pro-image">{modelLabels['gemini-3-pro-image']}</SelectItem>
              <SelectItem value="imagen-3-capability">{modelLabels['imagen-3-capability']}</SelectItem>
              <SelectItem value="imagen-4">{modelLabels['imagen-4']}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground max-w-48">
          {modelDescriptions[imageModel]}
          {hasReferenceImages && imageModel === 'imagen-4' && (
            <span className="text-amber-600 dark:text-amber-400 block mt-1">
              Reference images will be ignored
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
