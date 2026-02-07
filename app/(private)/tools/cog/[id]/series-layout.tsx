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
import { UploadModal } from './upload-modal';
import {
  updateSeries,
  deleteSeriesWithCleanup,
  enableTagForSeries,
  disableTagForSeries,
  createTag,
  deleteTag,
} from '@/lib/cog';
import { generateSeriesDescription } from '@/lib/ai/actions/generate-series-description';
import type { CogSeries, CogJob, CogTag, CogTagWithGroup, CogImageWithVersions } from '@/lib/types/cog';

interface SeriesLayoutProps {
  series: CogSeries;
  images: CogImageWithVersions[];
  jobs: CogJob[];
  childSeries: CogSeries[];
  seriesId: string;
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
}

function TagsSection({
  seriesId,
  enabledTags,
  globalTags,
}: {
  seriesId: string;
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
}) {
  const router = useRouter();
  const [localEnabled, setLocalEnabled] = useState<CogTagWithGroup[]>(enabledTags);
  const [localTags, setLocalTags] = useState<CogTag[]>(
    enabledTags.filter((t) => t.series_id === seriesId)
  );
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagShortcut, setNewTagShortcut] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get global tags that aren't enabled yet
  const availableGlobal = globalTags.filter(
    (gt) => !localEnabled.some((et) => et.id === gt.id)
  );

  // Already enabled global tags
  const enabledGlobal = localEnabled.filter((t) => t.series_id === null);

  async function handleEnableTag(tagId: string) {
    setSaving(true);
    setError(null);
    try {
      await enableTagForSeries(seriesId, tagId);
      const tag = globalTags.find((t) => t.id === tagId);
      if (tag) {
        setLocalEnabled((prev) => [...prev, { ...tag, group: null }]);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableTag(tagId: string) {
    setSaving(true);
    setError(null);
    try {
      await disableTagForSeries(seriesId, tagId);
      setLocalEnabled((prev) => prev.filter((t) => t.id !== tagId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLocalTag() {
    if (!newTagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createTag({
        series_id: seriesId,
        name: newTagName.trim(),
        shortcut: newTagShortcut.trim() || null,
      });
      setLocalTags((prev) => [...prev, created]);
      setLocalEnabled((prev) => [...prev, { ...created, group: null }]);
      setNewTagName('');
      setNewTagShortcut('');
      setShowNewTagForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLocalTag(tagId: string) {
    if (!confirm('Delete this series-local tag?')) return;

    setSaving(true);
    setError(null);
    try {
      await deleteTag(tagId);
      setLocalTags((prev) => prev.filter((t) => t.id !== tagId));
      setLocalEnabled((prev) => prev.filter((t) => t.id !== tagId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Image Tags</h2>
        <Button size="sm" variant="outline" asChild>
          <Link href="/tools/cog/tags">Manage</Link>
        </Button>
      </div>

      {error && (
        <div className="p-2 mb-3 bg-destructive/10 text-destructive text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Enabled tags */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Enabled for this series
          </p>
          <div className="flex flex-wrap gap-1.5">
            {enabledGlobal.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleDisableTag(tag.id)}
                disabled={saving}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-primary/10 border-primary/30 hover:bg-destructive/10 hover:border-destructive/30 transition-colors disabled:opacity-50"
                title="Click to disable"
              >
                {tag.shortcut && (
                  <kbd className="text-[10px] px-0.5 bg-muted rounded font-mono">
                    {tag.shortcut}
                  </kbd>
                )}
                {tag.name}
                <span className="text-muted-foreground ml-0.5">×</span>
              </button>
            ))}
            {localTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleDeleteLocalTag(tag.id)}
                disabled={saving}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed bg-muted/50 hover:bg-destructive/10 hover:border-destructive/30 transition-colors disabled:opacity-50"
                title="Click to delete (series-local)"
              >
                {tag.shortcut && (
                  <kbd className="text-[10px] px-0.5 bg-background rounded font-mono">
                    {tag.shortcut}
                  </kbd>
                )}
                {tag.name}
                <span className="text-muted-foreground ml-0.5">×</span>
              </button>
            ))}
            {enabledGlobal.length === 0 && localTags.length === 0 && (
              <p className="text-xs text-muted-foreground">No tags enabled</p>
            )}
          </div>
        </div>

        {/* Available global tags */}
        {availableGlobal.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Available to enable
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableGlobal.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleEnableTag(tag.id)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-muted-foreground/30 hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50"
                  title="Click to enable"
                >
                  {tag.shortcut && (
                    <kbd className="text-[10px] px-0.5 bg-muted rounded font-mono">
                      {tag.shortcut}
                    </kbd>
                  )}
                  {tag.name}
                  <span className="text-primary ml-0.5">+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create series-local tag */}
        <div className="pt-2">
          {showNewTagForm ? (
            <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="text-sm h-8"
                  autoFocus
                />
                <Input
                  value={newTagShortcut}
                  onChange={(e) => setNewTagShortcut(e.target.value.slice(-1))}
                  placeholder="Key"
                  className="text-sm h-8 w-14"
                  maxLength={1}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateLocalTag}
                  disabled={saving || !newTagName.trim()}
                  className="h-7 text-xs"
                >
                  {saving ? '...' : 'Create'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewTagForm(false);
                    setNewTagName('');
                    setNewTagShortcut('');
                  }}
                  disabled={saving}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNewTagForm(true)}
              className="h-7 text-xs"
            >
              + Create series-local tag
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigPanel({
  series,
  childSeries,
  seriesId,
  imageCount,
  jobCount,
  enabledTags,
  globalTags,
}: {
  series: CogSeries;
  childSeries: CogSeries[];
  seriesId: string;
  imageCount: number;
  jobCount: number;
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
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

      {/* Image Tags */}
      <div className="pt-4 border-t">
        <TagsSection
          seriesId={seriesId}
          enabledTags={enabledTags}
          globalTags={globalTags}
        />
      </div>

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
    <JobsList jobs={jobs} seriesId={seriesId} />
  );
}

function ImagesPanel({
  images,
  seriesId,
  primaryImageId,
  enabledTags,
  onUploadClick,
}: {
  images: CogImageWithVersions[];
  seriesId: string;
  primaryImageId: string | null;
  enabledTags: CogTagWithGroup[];
  onUploadClick: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col">
      {images.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No images yet. Upload images or run a job to generate them.
          </p>
          <Button variant="outline" onClick={onUploadClick}>
            Upload Images
          </Button>
        </div>
      ) : (
        <ImageGallery
          images={images}
          seriesId={seriesId}
          primaryImageId={primaryImageId}
          enabledTags={enabledTags}
          onPrimaryImageChange={() => router.refresh()}
        />
      )}
    </div>
  );
}

export function SeriesLayout({
  series,
  images,
  jobs,
  childSeries,
  seriesId,
  enabledTags,
  globalTags,
}: SeriesLayoutProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="flex-1 relative">
      {/* Wide layout: 2 resizable columns */}
      <div className="hidden lg:block h-full border border-red-500">
        <ResizablePanelGroup direction="horizontal">
          {/* Config column */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full overflow-y-auto p-6">
              <ConfigPanel
                series={series}
                childSeries={childSeries}
                seriesId={seriesId}
                imageCount={images.length}
                jobCount={jobs.length}
                enabledTags={enabledTags}
                globalTags={globalTags}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Jobs/Images column with tabs */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <div className="h-full overflow-y-auto p-6">
              <Tabs defaultValue="images" className="h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <TabsList className="w-fit">
                    <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
                    <TabsTrigger value="images">
                      Images ({images.length})
                    </TabsTrigger>
                  </TabsList>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
                      Upload
                    </Button>
                  </div>
                </div>
                <TabsContent value="jobs" className="flex-1 mt-4 overflow-y-auto">
                  <JobsPanel jobs={jobs} seriesId={seriesId} />
                </TabsContent>
                <TabsContent value="images" className="flex-1 mt-4 overflow-y-auto">
                  <ImagesPanel
                    images={images}
                    seriesId={seriesId}
                    primaryImageId={series.primary_image_id}
                    enabledTags={enabledTags}
                    onUploadClick={() => setShowUploadModal(true)}
                  />
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
              enabledTags={enabledTags}
              globalTags={globalTags}
            />
          </TabsContent>
          <TabsContent value="jobs" className="mt-4">
            <JobsPanel jobs={jobs} seriesId={seriesId} />
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            <ImagesPanel
              images={images}
              seriesId={seriesId}
              primaryImageId={series.primary_image_id}
              enabledTags={enabledTags}
              onUploadClick={() => setShowUploadModal(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Modal */}
      <UploadModal
        seriesId={seriesId}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
}
