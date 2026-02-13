'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { getCogImageUrl } from '@/lib/cog';
import {
  updateThinkingJob,
  deleteThinkingJob,
  duplicateThinkingJob,
} from '@/lib/cog';
import { runThinkingJob } from '@/lib/ai/actions/run-thinking-job';
import type { CogThinkingJobFull, CogRemixTraceEntry } from '@/lib/types/cog';

interface ThinkingExecutionMonitorProps {
  initialJob: CogThinkingJobFull;
  seriesId: string;
}

function StepStatus({ status }: { status: 'pending' | 'running' | 'done' | 'failed' }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
    running: { label: 'Running', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse' },
    done: { label: 'Done', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  };
  const c = config[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function ThinkingTrace({ content, label }: { content: string | null; label: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        {label}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
  );
}

function TraceTimeline({ trace }: { trace: CogRemixTraceEntry[] }) {
  if (trace.length === 0) return null;

  const totalMs = trace.reduce((sum, t) => sum + t.duration_ms, 0);
  const totalTokensIn = trace.reduce((sum, t) => sum + (t.tokens_in || 0), 0);
  const totalTokensOut = trace.reduce((sum, t) => sum + (t.tokens_out || 0), 0);

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-sm font-semibold mb-2">Execution Trace</h3>
      <div className="flex gap-4 text-xs text-muted-foreground mb-3">
        <span>Total: {(totalMs / 1000).toFixed(1)}s</span>
        {totalTokensIn > 0 && <span>Tokens in: {totalTokensIn.toLocaleString()}</span>}
        {totalTokensOut > 0 && <span>Tokens out: {totalTokensOut.toLocaleString()}</span>}
      </div>
      <div className="space-y-1">
        {trace.map((t, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <span className="w-32 text-muted-foreground font-mono">{t.step}</span>
            <span className="w-16 text-right font-mono">{(t.duration_ms / 1000).toFixed(1)}s</span>
            {t.tokens_in != null && (
              <span className="w-20 text-right text-muted-foreground">{t.tokens_in} in</span>
            )}
            {t.tokens_out != null && (
              <span className="w-20 text-right text-muted-foreground">{t.tokens_out} out</span>
            )}
            <span className="flex-1 text-muted-foreground truncate">{t.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThinkingExecutionMonitor({ initialJob, seriesId }: ThinkingExecutionMonitorProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [isEditing, setIsEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editStory, setEditStory] = useState(job.story);
  const [editPhotographer, setEditPhotographer] = useState(job.photographer);
  const [editPublication, setEditPublication] = useState(job.publication);
  const [editTitle, setEditTitle] = useState(job.title || '');
  const [editAspectRatio, setEditAspectRatio] = useState(job.aspect_ratio || '');
  const [editImageSize, setEditImageSize] = useState(job.image_size || '2K');
  const [editStyleHints, setEditStyleHints] = useState(job.style_hints || '');

  // Poll while running
  const pollJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/cog/thinking/${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        return data.status;
      }
    } catch {
      // Ignore poll errors
    }
    return job.status;
  }, [job.id, job.status]);

  useEffect(() => {
    if (job.status !== 'running') return;

    const interval = setInterval(async () => {
      const status = await pollJob();
      if (status !== 'running') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job.status, pollJob]);

  // Determine step statuses
  function getStepStatus(stepIndex: number): 'pending' | 'running' | 'done' | 'failed' {
    if (job.status === 'failed') {
      if (stepIndex === 0 && !job.derived_subject) return 'failed';
      if (stepIndex === 1 && job.derived_subject && !job.creative_direction) return 'failed';
      if (stepIndex === 2 && job.creative_direction && !job.generated_image_id) return 'failed';
    }
    if (stepIndex === 0) {
      if (job.derived_subject) return 'done';
      if (job.status === 'running') return 'running';
      return 'pending';
    }
    if (stepIndex === 1) {
      if (job.creative_direction) return 'done';
      if (job.status === 'running' && job.derived_subject) return 'running';
      return 'pending';
    }
    if (stepIndex === 2) {
      if (job.generated_image_id) return 'done';
      if (job.status === 'running' && job.creative_direction) return 'running';
      return 'pending';
    }
    return 'pending';
  }

  async function handleSaveEdit() {
    setError(null);
    try {
      const updated = await updateThinkingJob(job.id, {
        title: editTitle.trim() || null,
        story: editStory.trim(),
        photographer: editPhotographer.trim(),
        publication: editPublication.trim(),
        aspect_ratio: editAspectRatio || null,
        image_size: editImageSize || '2K',
        style_hints: editStyleHints.trim() || null,
      });
      setJob({ ...job, ...updated });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleRerun() {
    setRerunning(true);
    setError(null);
    try {
      runThinkingJob(
        job.id,
        seriesId,
        job.story,
        job.photographer,
        job.publication,
        job.aspect_ratio,
        job.image_size,
        job.style_hints,
      ).catch((err) => {
        console.error('Re-run error:', err);
      });

      // Optimistically set to running
      setJob({
        ...job,
        status: 'running',
        derived_subject: null,
        subject_thinking: null,
        creative_direction: null,
        direction_thinking: null,
        generation_prompt: null,
        generated_image_id: null,
        generated_image: null,
        error_message: null,
        trace: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-run');
    } finally {
      setRerunning(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const newJob = await duplicateThinkingJob(job.id);
      router.push(`/tools/cog/${seriesId}/thinking/${newJob.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteThinkingJob(job.id);
      router.push(`/tools/cog/${seriesId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  const isDraft = job.status === 'draft';
  const isRunning = job.status === 'running';
  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${
              isComplete
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : isRunning
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse'
                  : isFailed
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {job.status}
          </span>
          {job.started_at && job.completed_at && (
            <span className="text-xs text-muted-foreground">
              {((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000).toFixed(1)}s total
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDraft && !isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          {(isDraft || isFailed) && (
            <Button
              size="sm"
              onClick={handleRerun}
              disabled={rerunning || !job.story.trim() || !job.photographer.trim() || !job.publication.trim()}
            >
              {rerunning ? 'Starting...' : isDraft ? 'Run' : 'Re-run'}
            </Button>
          )}
          {isComplete && (
            <Button size="sm" variant="outline" onClick={handleRerun} disabled={rerunning}>
              {rerunning ? 'Starting...' : 'Re-run'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? '...' : 'Duplicate'}
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? '...' : 'Yes'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                No
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={isRunning}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {job.error_message && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 text-sm">
          <strong>Error:</strong> {job.error_message}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">Edit Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-story">Story</Label>
            <Textarea id="edit-story" value={editStory} onChange={(e) => setEditStory(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-photographer">Photographer</Label>
              <Input id="edit-photographer" value={editPhotographer} onChange={(e) => setEditPhotographer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-publication">Publication</Label>
              <Input id="edit-publication" value={editPublication} onChange={(e) => setEditPublication(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={editAspectRatio} onValueChange={setEditAspectRatio}>
                <SelectTrigger><SelectValue placeholder="1:1 (default)" /></SelectTrigger>
                <SelectContent>
                  {['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image Size</Label>
              <Select value={editImageSize} onValueChange={setEditImageSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K</SelectItem>
                  <SelectItem value="2K">2K</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-style-hints">Style Hints</Label>
            <Textarea id="edit-style-hints" value={editStyleHints} onChange={(e) => setEditStyleHints(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Config summary (when not editing) */}
      {!isEditing && (
        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <div>
              <span className="text-muted-foreground">Photographer:</span>{' '}
              <span className="font-medium">{job.photographer}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Publication:</span>{' '}
              <span className="font-medium">{job.publication}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>{' '}
              <span className="font-medium">{job.aspect_ratio || '1:1'} / {job.image_size || '2K'}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Story:</span>{' '}
            <span>{job.story}</span>
          </div>
          {job.style_hints && (
            <div>
              <span className="text-muted-foreground">Style hints:</span>{' '}
              <span>{job.style_hints}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Subject Translation */}
      <div className="border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Step 1: Subject Translation</h3>
          <StepStatus status={getStepStatus(0)} />
        </div>
        {job.derived_subject && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Derived Subject</p>
            <p className="text-sm">{job.derived_subject}</p>
          </div>
        )}
        <ThinkingTrace content={job.subject_thinking} label="Show thinking trace" />
      </div>

      {/* Step 2: Creative Direction */}
      <div className="border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Step 2: Creative Direction</h3>
          <StepStatus status={getStepStatus(1)} />
        </div>
        {job.creative_direction && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Creative Direction</p>
            <p className="text-sm whitespace-pre-wrap">{job.creative_direction}</p>
          </div>
        )}
        <ThinkingTrace content={job.direction_thinking} label="Show thinking trace" />
      </div>

      {/* Step 3: Image Generation */}
      <div className="border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Step 3: Image Generation</h3>
          <StepStatus status={getStepStatus(2)} />
        </div>
        {job.generation_prompt && (
          <ThinkingTrace content={job.generation_prompt} label="Show generation prompt" />
        )}
        {job.generated_image && (
          <div className="mt-3">
            <img
              src={getCogImageUrl(job.generated_image.storage_path)}
              alt={job.title || 'Generated image'}
              className="rounded-lg max-w-full max-h-[600px] object-contain"
            />
          </div>
        )}
      </div>

      {/* Trace timeline */}
      <TraceTimeline trace={job.trace || []} />
    </div>
  );
}
