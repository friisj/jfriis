'use client';

import { useState, useEffect } from 'react';
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
import { createRemixJob, getAllEvalProfiles } from '@/lib/cog';
import { runRemixSource } from '@/lib/ai/actions/run-remix-job';
import { deriveTopicsFromStory } from '@/lib/ai/actions/derive-remix-topics';
import type { CogEvalProfile } from '@/lib/types/cog';

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
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [evalProfiles, setEvalProfiles] = useState<CogEvalProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllEvalProfiles().then(setEvalProfiles).catch(() => {});
  }, []);

  const isValid = story.trim().length > 0;

  async function handleDeriveTopics() {
    if (!story.trim()) return;
    setDeriving(true);
    try {
      const derived = await deriveTopicsFromStory(story.trim());
      setTopicsInput(derived.join(', '));
    } catch {
      setError('Failed to derive topics from story');
    } finally {
      setDeriving(false);
    }
  }

  function toggleProfile(id: string) {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

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
        status: 'draft',
        target_aspect_ratio: aspectRatio || null,
        eval_profile_ids: selectedProfileIds,
      });

      if (andRun) {
        // Fire-and-forget the execution, then navigate to monitor
        runRemixSource(
          job.id,
          seriesId,
          story.trim(),
          topics,
          colors,
          aspectRatio || null,
          selectedProfileIds.length > 0 ? selectedProfileIds : undefined,
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
          <div className="flex items-center justify-between">
            <Label htmlFor="topics">Topics</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDeriveTopics}
              disabled={!story.trim() || saving || running || deriving}
              className="h-5 text-[10px] px-1.5 text-muted-foreground"
            >
              {deriving ? 'Deriving...' : 'Derive from story'}
            </Button>
          </div>
          <Input
            id="topics"
            placeholder="e.g., solitude, urban, night"
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            disabled={saving || running}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. Leave empty to auto-derive at run time.
          </p>
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

      <div className="grid grid-cols-2 gap-4">
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

        <div className="space-y-2">
          <Label>Eval Profiles</Label>
          {evalProfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No profiles available. Using default eval.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
              {evalProfiles.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50 ${
                    saving || running ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProfileIds.includes(p.id)}
                    onChange={() => toggleProfile(p.id)}
                    disabled={saving || running}
                    className="rounded border-border"
                  />
                  <span>{p.name}</span>
                  {selectedProfileIds.indexOf(p.id) === 0 && selectedProfileIds.length > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      primary
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          {selectedProfileIds.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {selectedProfileIds.map((id) => {
                const p = evalProfiles.find((ep) => ep.id === id);
                return (
                  <span
                    key={id}
                    className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1"
                  >
                    {p?.name || 'Unknown'}
                    <button
                      onClick={() => toggleProfile(id)}
                      className="hover:text-purple-600 dark:hover:text-purple-400"
                      disabled={saving || running}
                    >
                      x
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedProfileIds.length === 0
              ? 'Default built-in evaluation will be used'
              : `${selectedProfileIds.length} profile(s) selected. First = primary (drives search iteration).`}
          </p>
        </div>
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
