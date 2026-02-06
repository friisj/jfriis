'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { runCogJob } from '@/lib/ai/actions/run-cog-job';
import { updateJob } from '@/lib/cog';
import type { CogImageModel, CogImageSize, CogAspectRatio } from '@/lib/types/cog';

interface JobRunnerProps {
  jobId: string;
  seriesId: string;
  currentModel: CogImageModel;
  currentImageSize: CogImageSize;
  currentAspectRatio: CogAspectRatio;
  currentThinking: boolean;
  hasReferenceImages: boolean;
}

const modelLabels: Record<CogImageModel, string> = {
  'auto': 'Auto (recommended)',
  'flux-2-pro': 'Flux 2 Pro',
  'flux-2-dev': 'Flux 2 Dev',
  'gemini-3-pro-image': 'Gemini 3 Pro Image',
  'imagen-3-capability': 'Imagen 3 Capability',
  'imagen-4': 'Imagen 4',
};

const modelDescriptions: Record<CogImageModel, string> = {
  'auto': 'Auto-select based on references',
  'flux-2-pro': 'Up to 8 refs, 4MP, excellent text',
  'flux-2-dev': 'Up to 5 refs, 2MP, fast',
  'gemini-3-pro-image': 'Up to 14 refs, 4K output',
  'imagen-3-capability': 'Up to 4 subject refs (Vertex)',
  'imagen-4': 'Text-only, no references',
};

const imageSizeLabels: Record<CogImageSize, string> = {
  '1K': '1K (~1024px)',
  '2K': '2K (~2048px)',
  '4K': '4K (~4096px)',
};

const aspectRatioLabels: Record<CogAspectRatio, string> = {
  '1:1': '1:1 Square',
  '2:3': '2:3 Portrait',
  '3:2': '3:2 Landscape',
  '3:4': '3:4 Portrait',
  '4:3': '4:3 Landscape',
  '4:5': '4:5 Portrait',
  '5:4': '5:4 Landscape',
  '9:16': '9:16 Vertical',
  '16:9': '16:9 Widescreen',
  '21:9': '21:9 Ultrawide',
};

export function JobRunner({
  jobId,
  seriesId,
  currentModel,
  currentImageSize,
  currentAspectRatio,
  currentThinking,
  hasReferenceImages,
}: JobRunnerProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageModel, setImageModel] = useState<CogImageModel>(currentModel || 'auto');
  const [imageSize, setImageSize] = useState<CogImageSize>(currentImageSize || '2K');
  const [aspectRatio, setAspectRatio] = useState<CogAspectRatio>(currentAspectRatio || '1:1');
  const [useThinking, setUseThinking] = useState(currentThinking || false);

  // Sync state if props change (e.g., after page refresh)
  useEffect(() => {
    setImageModel(currentModel || 'auto');
  }, [currentModel]);

  useEffect(() => {
    setImageSize(currentImageSize || '2K');
  }, [currentImageSize]);

  useEffect(() => {
    setAspectRatio(currentAspectRatio || '1:1');
  }, [currentAspectRatio]);

  useEffect(() => {
    setUseThinking(currentThinking || false);
  }, [currentThinking]);

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

  async function handleImageSizeChange(value: string) {
    const newSize = value as CogImageSize;
    setImageSize(newSize);

    try {
      await updateJob(jobId, { image_size: newSize });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image size');
    }
  }

  async function handleAspectRatioChange(value: string) {
    const newRatio = value as CogAspectRatio;
    setAspectRatio(newRatio);

    try {
      await updateJob(jobId, { aspect_ratio: newRatio });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update aspect ratio');
    }
  }

  async function handleThinkingChange(checked: boolean) {
    setUseThinking(checked);

    // Update the job immediately
    try {
      await updateJob(jobId, { use_thinking: checked });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thinking setting');
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

      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
        <div>
          <label className="text-sm text-muted-foreground">Image Model</label>
          <Select value={imageModel} onValueChange={handleModelChange} disabled={running}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select model">{modelLabels[imageModel]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{modelLabels['auto']}</SelectItem>
              <SelectItem value="flux-2-pro">{modelLabels['flux-2-pro']}</SelectItem>
              <SelectItem value="flux-2-dev">{modelLabels['flux-2-dev']}</SelectItem>
              <SelectItem value="gemini-3-pro-image">{modelLabels['gemini-3-pro-image']}</SelectItem>
              <SelectItem value="imagen-3-capability">{modelLabels['imagen-3-capability']}</SelectItem>
              <SelectItem value="imagen-4">{modelLabels['imagen-4']}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {modelDescriptions[imageModel]}
            {hasReferenceImages && imageModel === 'imagen-4' && (
              <span className="text-amber-600 dark:text-amber-400 block">
                Refs ignored
              </span>
            )}
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Resolution</label>
          <Select value={imageSize} onValueChange={handleImageSizeChange} disabled={running}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select size">{imageSizeLabels[imageSize]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1K">{imageSizeLabels['1K']}</SelectItem>
              <SelectItem value="2K">{imageSizeLabels['2K']}</SelectItem>
              <SelectItem value="4K">{imageSizeLabels['4K']}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Higher = better quality, slower
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Aspect Ratio</label>
          <Select value={aspectRatio} onValueChange={handleAspectRatioChange} disabled={running}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select ratio">{aspectRatioLabels[aspectRatio]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">{aspectRatioLabels['1:1']}</SelectItem>
              <SelectItem value="3:2">{aspectRatioLabels['3:2']}</SelectItem>
              <SelectItem value="2:3">{aspectRatioLabels['2:3']}</SelectItem>
              <SelectItem value="4:3">{aspectRatioLabels['4:3']}</SelectItem>
              <SelectItem value="3:4">{aspectRatioLabels['3:4']}</SelectItem>
              <SelectItem value="16:9">{aspectRatioLabels['16:9']}</SelectItem>
              <SelectItem value="9:16">{aspectRatioLabels['9:16']}</SelectItem>
              <SelectItem value="5:4">{aspectRatioLabels['5:4']}</SelectItem>
              <SelectItem value="4:5">{aspectRatioLabels['4:5']}</SelectItem>
              <SelectItem value="21:9">{aspectRatioLabels['21:9']}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Output dimensions
          </p>
        </div>
      </div>

      {/* Thinking toggle - uses vision + LLM reasoning pipeline */}
      {(imageModel === 'gemini-3-pro-image' || (imageModel === 'auto' && hasReferenceImages)) && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <Checkbox
            id="use-thinking"
            checked={useThinking}
            onCheckedChange={handleThinkingChange}
            disabled={running}
          />
          <label htmlFor="use-thinking" className="text-sm cursor-pointer">
            Enable thinking mode
          </label>
          <span className="text-xs text-muted-foreground">
            {hasReferenceImages
              ? 'Analyzes refs with vision, then reasons about composition'
              : 'Reasons about composition from prompt + shoot params'}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
