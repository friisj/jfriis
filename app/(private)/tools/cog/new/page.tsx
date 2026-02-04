'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createSeries } from '@/lib/cog';
import { generateSeriesDescription } from '@/lib/ai/actions/generate-series-description';

export default function NewSeriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Generation state
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!generatePrompt.trim()) return;

    setGenerating(true);
    setError(null);

    try {
      const result = await generateSeriesDescription({
        prompt: generatePrompt,
        title: title || undefined,
        existingDescription: description || undefined,
        existingTags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });

      setDescription(result.description);
      setTagsInput(result.tags.join(', '));
      setGeneratePrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    try {
      const series = await createSeries({
        title: title.trim(),
        description: description.trim() || null,
        tags,
      });
      router.push(`/tools/cog/${series.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
      setLoading(false);
    }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">New Series</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Generate Section */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <Label htmlFor="generate-prompt">
            Generate description & tags with AI
          </Label>
          <div className="flex gap-2">
            <Input
              id="generate-prompt"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Describe what this series is about..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !generatePrompt.trim()}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a prompt and click Generate to auto-fill description and tags
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter series title"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description (Markdown)</Label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-2 py-0.5 text-xs rounded ${
                  !showPreview
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-2 py-0.5 text-xs rounded ${
                  showPreview
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          {!showPreview ? (
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this series in markdown (optional)"
              rows={8}
              className="font-mono text-sm"
            />
          ) : (
            <div className="border rounded-lg p-4 bg-background min-h-[200px]">
              {description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {description}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No description yet...</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tag1, tag2, tag3 (comma separated)"
          />
          <p className="text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Series'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
