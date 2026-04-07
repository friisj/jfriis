'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { IconCloudUpload, IconSettings } from '@tabler/icons-react';
import { ImageGallery } from './image-gallery';
import {
  updateSeries,
  deleteSeriesWithCleanup,
  enableTagForSeries,
  disableTagForSeries,
  createTag,
  deleteTag,
} from '@/lib/cog';
import { useImageUpload } from '@/lib/cog/use-image-upload';
import type {
  CogSeries,
  CogJob,
  CogRemixJob,
  CogThinkingJob,
  CogTag,
  CogTagWithGroup,
  CogTagGroupWithTags,
  CogImageWithGroupInfo,
} from '@/lib/types/cog';

interface SeriesLayoutProps {
  series: CogSeries;
  images: CogImageWithGroupInfo[];
  jobs: CogJob[];
  remixJobs?: CogRemixJob[];
  thinkingJobs?: CogThinkingJob[];
  childSeries: CogSeries[];
  seriesId: string;
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
  tagGroups: CogTagGroupWithTags[];
}

// ---------------------------------------------------------------------------
// Jobs Sidebar Section
// ---------------------------------------------------------------------------

type UnifiedJob =
  | { type: 'job'; data: CogJob; created_at: string }
  | { type: 'remix'; data: CogRemixJob; created_at: string }
  | { type: 'thinking'; data: CogThinkingJob; created_at: string };

function statusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'running': return 'bg-blue-500 animate-pulse';
    case 'failed': return 'bg-red-500';
    case 'cancelled': return 'bg-orange-500';
    default: return 'bg-muted-foreground/40';
  }
}

function JobsSidebar({ jobs, remixJobs = [], thinkingJobs = [], seriesId }: {
  jobs: CogJob[];
  remixJobs?: CogRemixJob[];
  thinkingJobs?: CogThinkingJob[];
  seriesId: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const allJobs: UnifiedJob[] = [
    ...jobs.map((j) => ({ type: 'job' as const, data: j, created_at: j.created_at })),
    ...remixJobs.map((j) => ({ type: 'remix' as const, data: j, created_at: j.created_at })),
    ...thinkingJobs.map((j) => ({ type: 'thinking' as const, data: j, created_at: j.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalCount = allJobs.length;

  function getJobLink(unified: UnifiedJob) {
    if (unified.type === 'remix') return `/tools/cog/${seriesId}/remix/${unified.data.id}`;
    if (unified.type === 'thinking') return `/tools/cog/${seriesId}/thinking/${unified.data.id}`;
    const job = unified.data as CogJob;
    return job.job_type === 'pipeline'
      ? `/tools/cog/${seriesId}/pipeline/${job.id}`
      : `/tools/cog/${seriesId}/job/${job.id}`;
  }

  function getJobTitle(unified: UnifiedJob) {
    if (unified.type === 'remix') return unified.data.title || 'Untitled Remix';
    if (unified.type === 'thinking') return unified.data.title || 'Untitled Thinking';
    return (unified.data as CogJob).title || 'Untitled Job';
  }

  function getJobStatus(unified: UnifiedJob) {
    return unified.data.status;
  }

  function getJobBadge(unified: UnifiedJob) {
    if (unified.type === 'remix') return { label: 'remix', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    if (unified.type === 'thinking') return { label: 'thinking', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
    const job = unified.data as CogJob;
    if (job.job_type === 'pipeline') return { label: 'pipeline', cls: 'bg-muted text-muted-foreground' };
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold mb-2"
      >
        <span>Jobs {totalCount > 0 && <span className="text-muted-foreground font-normal">({totalCount})</span>}</span>
        <span className="text-muted-foreground text-xs">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-1">
          {/* Create new job links */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Link href={`/tools/cog/${seriesId}/job/new`} className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors">
              + Batch
            </Link>
            <Link href={`/tools/cog/${seriesId}/pipeline/new`} className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors">
              + Pipeline
            </Link>
            <Link href={`/tools/cog/${seriesId}/remix/new`} className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors">
              + Remix
            </Link>
            <Link href={`/tools/cog/${seriesId}/thinking/new`} className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors">
              + Thinking
            </Link>
          </div>

          {/* Job list */}
          {allJobs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No jobs yet</p>
          ) : (
            <div className="space-y-0.5">
              {allJobs.map((unified) => {
                const badge = getJobBadge(unified);
                return (
                  <Link
                    key={unified.data.id}
                    href={getJobLink(unified)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent transition-colors group"
                  >
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusColor(getJobStatus(unified))}`} />
                    <span className="flex-1 text-xs truncate">{getJobTitle(unified)}</span>
                    {badge && (
                      <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags Section
// ---------------------------------------------------------------------------

function TagsSection({
  seriesId,
  enabledTags,
  globalTags,
  tagGroups,
}: {
  seriesId: string;
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
  tagGroups: CogTagGroupWithTags[];
}) {
  const router = useRouter();
  const [enabledSet, setEnabledSet] = useState<Set<string>>(
    () => new Set(enabledTags.map((t) => t.id))
  );
  const [localTags, setLocalTags] = useState<CogTag[]>(
    enabledTags.filter((t) => t.series_id === seriesId)
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagShortcut, setNewTagShortcut] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ungrouped global tags
  const ungroupedTags = globalTags.filter((t) => !t.group_id);

  function isGroupFullyEnabled(group: CogTagGroupWithTags) {
    return group.tags.length > 0 && group.tags.every((t) => enabledSet.has(t.id));
  }

  function isGroupPartiallyEnabled(group: CogTagGroupWithTags) {
    return group.tags.some((t) => enabledSet.has(t.id)) && !isGroupFullyEnabled(group);
  }

  async function handleToggleGroup(group: CogTagGroupWithTags) {
    setSaving(true);
    setError(null);
    const fullyEnabled = isGroupFullyEnabled(group);
    try {
      if (fullyEnabled) {
        // Disable all tags in group
        for (const tag of group.tags) {
          if (enabledSet.has(tag.id)) {
            await disableTagForSeries(seriesId, tag.id);
          }
        }
        setEnabledSet((prev) => {
          const next = new Set(prev);
          group.tags.forEach((t) => next.delete(t.id));
          return next;
        });
      } else {
        // Enable all tags in group
        for (const tag of group.tags) {
          if (!enabledSet.has(tag.id)) {
            await enableTagForSeries(seriesId, tag.id);
          }
        }
        setEnabledSet((prev) => {
          const next = new Set(prev);
          group.tags.forEach((t) => next.add(t.id));
          return next;
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle group');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTag(tagId: string) {
    setSaving(true);
    setError(null);
    try {
      if (enabledSet.has(tagId)) {
        await disableTagForSeries(seriesId, tagId);
        setEnabledSet((prev) => { const next = new Set(prev); next.delete(tagId); return next; });
      } else {
        await enableTagForSeries(seriesId, tagId);
        setEnabledSet((prev) => new Set(prev).add(tagId));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLocalTag() {
    if (!newTagName.trim()) { setError('Tag name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await createTag({
        series_id: seriesId,
        name: newTagName.trim(),
        shortcut: newTagShortcut.trim() || null,
      });
      setLocalTags((prev) => [...prev, created]);
      setEnabledSet((prev) => new Set(prev).add(created.id));
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
      setEnabledSet((prev) => { const next = new Set(prev); next.delete(tagId); return next; });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setSaving(false);
    }
  }

  function toggleGroupExpanded(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Image Tags</h2>
        <Button size="sm" variant="outline" className="h-6 text-[11px]" asChild>
          <Link href="/tools/cog/tags">Manage</Link>
        </Button>
      </div>

      {error && (
        <div className="p-2 mb-3 bg-destructive/10 text-destructive text-xs rounded-lg">{error}</div>
      )}

      <div className="space-y-3">
        {/* Tag groups */}
        {tagGroups.map((group) => {
          const fullyEnabled = isGroupFullyEnabled(group);
          const partial = isGroupPartiallyEnabled(group);
          const expanded = expandedGroups.has(group.id);
          const enabledCount = group.tags.filter((t) => enabledSet.has(t.id)).length;

          return (
            <div key={group.id} className="border rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <button
                  type="button"
                  onClick={() => handleToggleGroup(group)}
                  disabled={saving || group.tags.length === 0}
                  className="shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] disabled:opacity-50"
                  style={{
                    borderColor: group.color || undefined,
                    backgroundColor: fullyEnabled ? (group.color || 'var(--primary)') : 'transparent',
                    color: fullyEnabled ? 'white' : 'transparent',
                  }}
                  title={fullyEnabled ? 'Disable all tags in group' : 'Enable all tags in group'}
                >
                  {fullyEnabled ? '✓' : partial ? '–' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroupExpanded(group.id)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <span className="text-xs font-medium">{group.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {enabledCount}/{group.tags.length} · {expanded ? '−' : '+'}
                  </span>
                </button>
              </div>

              {/* Individual tags (when expanded) */}
              {expanded && (
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {group.tags.map((tag) => {
                    const isOn = enabledSet.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        disabled={saving}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors disabled:opacity-50 ${
                          isOn
                            ? 'bg-primary/10 border-primary/30 hover:bg-destructive/10'
                            : 'border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped global tags */}
        {ungroupedTags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Ungrouped</p>
            <div className="flex flex-wrap gap-1.5">
              {ungroupedTags.map((tag) => {
                const isOn = enabledSet.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    disabled={saving}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors disabled:opacity-50 ${
                      isOn
                        ? 'bg-primary/10 border-primary/30 hover:bg-destructive/10'
                        : 'border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30'
                    }`}
                  >
                    {tag.shortcut && <kbd className="text-[10px] px-0.5 bg-muted rounded font-mono">{tag.shortcut}</kbd>}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Series-local tags */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Series-Local</p>
          <div className="flex flex-wrap gap-1.5">
            {localTags.map((tag) => (
              <button key={tag.id} onClick={() => handleDeleteLocalTag(tag.id)} disabled={saving}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-dashed bg-muted/50 hover:bg-destructive/10 hover:border-destructive/30 transition-colors disabled:opacity-50"
                title="Click to delete">
                {tag.shortcut && <kbd className="text-[10px] px-0.5 bg-background rounded font-mono">{tag.shortcut}</kbd>}
                {tag.name}
                <span className="text-muted-foreground ml-0.5">×</span>
              </button>
            ))}
          </div>

          {/* Create series-local tag */}
          <div className="mt-2">
            {showNewTagForm ? (
              <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex gap-2">
                  <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name" className="text-sm h-8" autoFocus />
                  <Input value={newTagShortcut} onChange={(e) => setNewTagShortcut(e.target.value.slice(-1))} placeholder="Key" className="text-sm h-8 w-14" maxLength={1} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateLocalTag} disabled={saving || !newTagName.trim()} className="h-7 text-xs">
                    {saving ? '...' : 'Create'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewTagForm(false); setNewTagName(''); setNewTagShortcut(''); }} disabled={saving} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowNewTagForm(true)} className="h-7 text-xs">
                + Series-local tag
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config Panel (metadata, jobs, tags, children, delete)
// ---------------------------------------------------------------------------

function ConfigPanel({
  series,
  childSeries,
  seriesId,
  imageCount,
  jobs,
  remixJobs,
  thinkingJobs,
  enabledTags,
  globalTags,
  tagGroups,
}: {
  series: CogSeries;
  childSeries: CogSeries[];
  seriesId: string;
  imageCount: number;
  jobs: CogJob[];
  remixJobs?: CogRemixJob[];
  thinkingJobs?: CogThinkingJob[];
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
  tagGroups: CogTagGroupWithTags[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [thumbStatus, setThumbStatus] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description || '');
  const [tagsInput, setTagsInput] = useState(series.tags.join(', '));
  const [isPrivate, setIsPrivate] = useState(series.is_private || false);

  const jobCount = jobs.length + (remixJobs?.length ?? 0) + (thinkingJobs?.length ?? 0);

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
    setIsPrivate(series.is_private || false);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await updateSeries(seriesId, { title: title.trim(), description: description.trim() || null, tags, is_private: isPrivate });
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
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>
      )}

      {/* Series metadata */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Markdown supported..." rows={6} className="text-sm font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm">Tags</Label>
            <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tag1, tag2, tag3" className="text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded" />
            <Label htmlFor="private" className="text-sm font-normal cursor-pointer">Private</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold mb-1">{series.title}</h3>
            <p className="text-xs text-muted-foreground">{imageCount} images · {jobCount} jobs</p>
          </div>
          {series.description && (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{series.description}</ReactMarkdown>
            </div>
          )}
          {series.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {series.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full">{tag}</span>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
        </div>
      )}

      {/* Jobs */}
      <div className="pt-4 border-t">
        <JobsSidebar jobs={jobs} remixJobs={remixJobs} thinkingJobs={thinkingJobs} seriesId={seriesId} />
      </div>

      {/* Child Series */}
      {childSeries.length > 0 && (
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3">Sub-Series</h3>
          <div className="space-y-2">
            {childSeries.map((child) => (
              <Link key={child.id} href={`/tools/cog/${child.id}`} className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <p className="font-medium text-sm">{child.title}</p>
                {child.description && <p className="text-xs text-muted-foreground line-clamp-1">{child.description}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Image Tags */}
      <div className="pt-4 border-t">
        <TagsSection seriesId={seriesId} enabledTags={enabledTags} globalTags={globalTags} tagGroups={tagGroups} />
      </div>

      {/* Maintenance */}
      <div className="pt-4 border-t">
        <h3 className="text-sm font-semibold mb-2">Maintenance</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={regenerating}
            onClick={async () => {
              setRegenerating(true);
              setThumbStatus(null);
              try {
                const res = await fetch('/api/cog/thumbnails', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ seriesId }),
                });
                const data = await res.json();
                if (data.generated === 0 && data.failed === 0) {
                  setThumbStatus('All images have thumbnails');
                } else {
                  setThumbStatus(`Generated: ${data.generated}, failed: ${data.failed}`);
                  router.refresh();
                }
              } catch {
                setThumbStatus('Failed');
              } finally {
                setRegenerating(false);
              }
            }}
          >
            {regenerating ? 'Generating...' : 'Regenerate Thumbnails'}
          </Button>
          {thumbStatus && <span className="text-xs text-muted-foreground">{thumbStatus}</span>}
        </div>
      </div>

      {/* Delete Series */}
      <div className="pt-6 border-t">
        {showDeleteConfirm ? (
          <div className="p-3 bg-destructive/10 rounded-lg space-y-3">
            <p className="text-sm text-destructive font-medium">Delete this series?</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              <li>{imageCount} image{imageCount !== 1 ? 's' : ''} (including storage files)</li>
              <li>{jobCount} job{jobCount !== 1 ? 's' : ''} and all steps</li>
              {childSeries.length > 0 && (
                <li className="text-destructive">{childSeries.length} sub-series (delete those first!)</li>
              )}
            </ul>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting || childSeries.length > 0}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            Delete Series
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Images Panel (drag-and-drop wrapper around ImageGallery)
// ---------------------------------------------------------------------------

function ImagesPanel({
  images,
  seriesId,
  primaryImageId,
  enabledTags,
}: {
  images: CogImageWithGroupInfo[];
  seriesId: string;
  primaryImageId: string | null;
  enabledTags: CogTagWithGroup[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { upload, uploadingFiles, isUploading } = useImageUpload({ seriesId });

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
  }, [upload]);

  const hasContent = images.length > 0 || uploadingFiles.length > 0;

  return (
    <div
      className="flex flex-col min-h-[200px] h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ''; }}
      />
      {!hasContent ? (
        <div
          className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 bg-muted/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragOver ? (
            <>
              <IconCloudUpload size={48} className="mx-auto text-primary mb-3" />
              <p className="font-medium text-primary">Drop images to upload</p>
            </>
          ) : (
            <p className="text-muted-foreground">No images yet. Drag & drop or click to upload.</p>
          )}
        </div>
      ) : (
        <ImageGallery
          images={images}
          seriesId={seriesId}
          primaryImageId={primaryImageId}
          enabledTags={enabledTags}
          onPrimaryImageChange={() => router.refresh()}
          onUpload={upload}
          uploading={isUploading}
          uploadingFiles={uploadingFiles}
          isDragOver={isDragOver}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop panel and mobile drawer)
// ---------------------------------------------------------------------------

function SidebarContent(props: {
  series: CogSeries;
  childSeries: CogSeries[];
  seriesId: string;
  imageCount: number;
  jobs: CogJob[];
  remixJobs?: CogRemixJob[];
  thinkingJobs?: CogThinkingJob[];
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
  tagGroups: CogTagGroupWithTags[];
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none px-6 py-4 border-b">
        <h2 className="font-semibold">Series</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ConfigPanel {...props} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Layout
// ---------------------------------------------------------------------------

export function SeriesLayout({
  series,
  images,
  jobs,
  remixJobs,
  thinkingJobs,
  childSeries,
  seriesId,
  enabledTags,
  globalTags,
  tagGroups,
}: SeriesLayoutProps) {
  const sidebarProps = {
    series,
    childSeries,
    seriesId,
    imageCount: images.length,
    jobs,
    remixJobs,
    thinkingJobs,
    enabledTags,
    globalTags,
    tagGroups,
  };

  return (
    <div className="h-[calc(100vh-2.5rem)]">
      {/* Desktop: resizable sidebar + images */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <SidebarContent {...sidebarProps} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={75} minSize={50}>
            <div className="h-full flex flex-col overflow-y-scroll px-6 py-4">
              <ImagesPanel
                images={images}
                seriesId={seriesId}
                primaryImageId={series.primary_image_id}
                enabledTags={enabledTags}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Sheet drawer for sidebar, images as main content */}
      <div className="lg:hidden h-full flex flex-col">
        <div className="flex-none px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">{series.title}</h2>
            <p className="text-xs text-muted-foreground">{images.length} images</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <IconSettings size={14} className="mr-1.5" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0">
              <SidebarContent {...sidebarProps} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ImagesPanel
            images={images}
            seriesId={seriesId}
            primaryImageId={series.primary_image_id}
            enabledTags={enabledTags}
          />
        </div>
      </div>
    </div>
  );
}
