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
import { createRemixJob } from '@/lib/cog';
import { runRemixSource } from '@/lib/ai/actions/run-remix-job';

interface RemixBuilderFormProps {
  seriesId: string;
}

export function RemixBuilderForm({ seriesId }: RemixBuilderFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = story.trim().length > 0;

  async function handleSave(andRun: boolean) {
    if (!isValid) return;

    const setter = andRun ? setRunning : setSaving;
    setter(true);
    setError(null);

    try {
      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const colors = colorsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const job = await createRemixJob({
        series_id: seriesId,
        title: title.trim() || null,
        story: story.trim(),
        topics,
        colors,
        status: andRun ? 'draft' : 'draft',
        target_aspect_ratio: aspectRatio || null,
      });

      if (andRun) {
        // Fire-and-forget the execution, then navigate to monitor
        runRemixSource(
          job.id,
          seriesId,
          story.trim(),
          topics,
          colors,
          aspectRatio || null
        ).catch((err) => {
          console.error('Remix job execution error:', err);
        });
      }

      router.push(`/tools/cog/${seriesId}/remix/${job.id}`);
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
          placeholder="e.g., Urban solitude at dusk"
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
          placeholder="Describe the narrative, mood, or concept you want the photograph to capture..."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={4}
          disabled={saving || running}
        />
        <p className="text-xs text-muted-foreground">
          The creative brief that will guide photo search and evaluation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="topics">Topics</Label>
          <Input
            id="topics"
            placeholder="e.g., solitude, urban, night"
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            disabled={saving || running}
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="colors">Colors</Label>
          <Input
            id="colors"
            placeholder="e.g., deep blue, amber, shadow"
            value={colorsInput}
            onChange={(e) => setColorsInput(e.target.value)}
            disabled={saving || running}
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aspect-ratio">Target Aspect Ratio (optional)</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={saving || running}>
          <SelectTrigger id="aspect-ratio">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="squarish">Square</SelectItem>
          </SelectContent>
        </Select>
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
