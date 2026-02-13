'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createThinkingJob } from '@/lib/cog';
import { runThinkingJob } from '@/lib/ai/actions/run-thinking-job';

interface ThinkingBuilderFormProps {
  seriesId: string;
}

export function ThinkingBuilderForm({ seriesId }: ThinkingBuilderFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [publication, setPublication] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('');
  const [imageSize, setImageSize] = useState('2K');
  const [styleHints, setStyleHints] = useState('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = story.trim().length > 0 && photographer.trim().length > 0 && publication.trim().length > 0;

  async function handleSave(andRun: boolean) {
    if (!isValid) return;

    const setter = andRun ? setRunning : setSaving;
    setter(true);
    setError(null);

    try {
      const job = await createThinkingJob({
        series_id: seriesId,
        title: title.trim() || null,
        story: story.trim(),
        photographer: photographer.trim(),
        publication: publication.trim(),
        aspect_ratio: aspectRatio || null,
        image_size: imageSize || '2K',
        style_hints: styleHints.trim() || null,
        status: 'draft',
      });

      if (andRun) {
        runThinkingJob(
          job.id,
          seriesId,
          story.trim(),
          photographer.trim(),
          publication.trim(),
          aspectRatio || null,
          imageSize || '2K',
          styleHints.trim() || null,
        ).catch((err) => {
          console.error('Thinking job execution error:', err);
        });
      }

      router.push(`/tools/cog/${seriesId}/thinking/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setter(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          placeholder="e.g., Uranium mining for The Economist"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving || running}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="story">
          Story <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="story"
          placeholder="The creative brief — describe the narrative, concept, or mood you want to capture..."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={4}
          disabled={saving || running}
        />
        <p className="text-xs text-muted-foreground">
          This will be translated into a concrete, photographable subject by the thinking model.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="photographer">
            Photographer <span className="text-red-500">*</span>
          </Label>
          <Input
            id="photographer"
            placeholder="e.g., Gregory Crewdson"
            value={photographer}
            onChange={(e) => setPhotographer(e.target.value)}
            disabled={saving || running}
          />
          <p className="text-xs text-muted-foreground">
            The photographer whose style will guide the creative direction.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publication">
            Publication <span className="text-red-500">*</span>
          </Label>
          <Input
            id="publication"
            placeholder="e.g., The Economist"
            value={publication}
            onChange={(e) => setPublication(e.target.value)}
            disabled={saving || running}
          />
          <p className="text-xs text-muted-foreground">
            The publication context shapes composition and editorial tone.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={saving || running}>
            <SelectTrigger id="aspect-ratio">
              <SelectValue placeholder="1:1 (default)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="2:3">2:3</SelectItem>
              <SelectItem value="3:2">3:2</SelectItem>
              <SelectItem value="3:4">3:4</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="4:5">4:5</SelectItem>
              <SelectItem value="5:4">5:4</SelectItem>
              <SelectItem value="9:16">9:16</SelectItem>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="21:9">21:9</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image-size">Image Size</Label>
          <Select value={imageSize} onValueChange={setImageSize} disabled={saving || running}>
            <SelectTrigger id="image-size">
              <SelectValue placeholder="2K (default)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1K">1K</SelectItem>
              <SelectItem value="2K">2K</SelectItem>
              <SelectItem value="4K">4K</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="style-hints">Style Hints (optional)</Label>
        <Textarea
          id="style-hints"
          placeholder="Additional guidance for the creative direction — e.g., 'moody, desaturated, shallow depth of field'"
          value={styleHints}
          onChange={(e) => setStyleHints(e.target.value)}
          rows={2}
          disabled={saving || running}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={!isValid || saving || running}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={!isValid || saving || running}
        >
          {running ? 'Creating...' : 'Save & Run'}
        </Button>
      </div>
    </div>
  );
}
