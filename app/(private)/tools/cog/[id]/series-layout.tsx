'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ImageGallery } from './image-gallery';
import { JobsList } from './jobs-list';
import { updateSeries, deleteSeriesWithCleanup } from '@/lib/cog';
import { generateSeriesDescription } from '@/lib/ai/actions/generate-series-description';
import type { CogSeriesWithImages, CogJob, CogSeries } from '@/lib/types/cog';

interface SeriesLayoutProps {
  series: CogSeriesWithImages;
  jobs: CogJob[];
  childSeries: CogSeries[];
  seriesId: string;
}

function ConfigPanel({
  series,
  childSeries,
  seriesId,
  imageCount,
  jobCount,
}: {
  series: CogSeriesWithImages;
  childSeries: CogSeries[];
  seriesId: string;
  imageCount: number;
  jobCount: number;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Generation state
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description || '');
  const [tagsInput, setTagsInput] = useState(series.tags.join(', '));

  async function handleGenerate() {
    if (!generatePrompt.trim()) return;

    setGenerating(true);
    setError(null);

    try {
      const result = await generateSeriesDescription({
        prompt: generatePrompt,
        title,
        existingDescription: description || undefined,
        existingTags: tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });

      setDescription(result.description);
      setTagsInput(result.tags.join(', '));
      setGeneratePrompt('');
      setIsEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteSeriesWithCleanup(seriesId);
      router.push('/tools/cog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete series');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleCancel() {
    setTitle(series.title);
    setDescription(series.description || '');
    setTagsInput(series.tags.join(', '));
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await updateSeries(seriesId, {
        title: title.trim(),
        description: description.trim() || null,
        tags,
      });

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Series Info */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Series</h2>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Generate Section */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <Label htmlFor="generate-prompt" className="text-xs">
            Generate description & tags
          </Label>
          <div className="flex gap-2">
            <Input
              id="generate-prompt"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Describe this series..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !generatePrompt.trim()}
            >
              {generating ? '...' : 'Generate'}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Series title"
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
                  placeholder="Describe this series in markdown..."
                  rows={8}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="border rounded-lg p-3 bg-background min-h-[160px]">
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
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of tags
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Title
              </p>
              <p className="font-medium">{series.title}</p>
            </div>
            {series.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Description
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {series.description}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {series.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {series.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-muted rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Child Series */}
      {childSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Sub-Series</h3>
          <div className="space-y-2">
            {childSeries.map((child) => (
              <Link
                key={child.id}
                href={`/tools/cog/${child.id}`}
                className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm">{child.title}</p>
                {child.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {child.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Delete Series */}
      <div className="pt-6 border-t">
        {showDeleteConfirm ? (
          <div className="p-3 bg-destructive/10 rounded-lg space-y-3">
            <p className="text-sm text-destructive font-medium">
              Delete this series?
            </p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              <li>{imageCount} image{imageCount !== 1 ? 's' : ''} (including storage files)</li>
              <li>{jobCount} job{jobCount !== 1 ? 's' : ''} and all steps</li>
              {childSeries.length > 0 && (
                <li className="text-destructive">
                  {childSeries.length} sub-series (delete those first!)
                </li>
              )}
            </ul>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || childSeries.length > 0}
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Delete Series
          </Button>
        )}
      </div>
    </div>
  );
}

function JobsPanel({ jobs, seriesId }: { jobs: CogJob[]; seriesId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Jobs ({jobs.length})</h2>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/tools/cog/${seriesId}/job/new`}>New Job</Link>
        </Button>
      </div>
      <JobsList jobs={jobs} seriesId={seriesId} />
    </div>
  );
}

function ImagesPanel({
  images,
  seriesId,
}: {
  images: CogSeriesWithImages['images'];
  seriesId: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Images ({images.length})</h2>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/tools/cog/${seriesId}/upload`}>Upload</Link>
        </Button>
      </div>
      {images.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No images yet. Upload images or run a job to generate them.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/tools/cog/${seriesId}/upload`}>Upload Images</Link>
          </Button>
        </div>
      ) : (
        <ImageGallery images={images} seriesId={seriesId} />
      )}
    </div>
  );
}

export function SeriesLayout({
  series,
  jobs,
  childSeries,
  seriesId,
}: SeriesLayoutProps) {
  const images = series.images;

  return (
    <>
      {/* Wide layout: 2 resizable columns */}
      <div className="hidden lg:block h-[calc(100vh-8rem)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Config column */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full overflow-y-auto pr-4">
              <ConfigPanel
                series={series}
                childSeries={childSeries}
                seriesId={seriesId}
                imageCount={images.length}
                jobCount={jobs.length}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Jobs/Images column with tabs */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <div className="h-full overflow-y-auto pl-4">
              <Tabs defaultValue="images" className="h-full flex flex-col">
                <TabsList className="w-fit">
                  <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
                  <TabsTrigger value="images">
                    Images ({images.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="jobs" className="flex-1 mt-4 overflow-y-auto">
                  <JobsPanel jobs={jobs} seriesId={seriesId} />
                </TabsContent>
                <TabsContent value="images" className="flex-1 mt-4 overflow-y-auto">
                  <ImagesPanel images={images} seriesId={seriesId} />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Narrow layout: 3 Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="images" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="mt-4">
            <ConfigPanel
              series={series}
              childSeries={childSeries}
              seriesId={seriesId}
              imageCount={images.length}
              jobCount={jobs.length}
            />
          </TabsContent>
          <TabsContent value="jobs" className="mt-4">
            <JobsPanel jobs={jobs} seriesId={seriesId} />
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            <ImagesPanel images={images} seriesId={seriesId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
