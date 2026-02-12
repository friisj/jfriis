'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getCogImageUrl } from '@/lib/cog';
import { runRemixSource } from '@/lib/ai/actions/run-remix-job';
import { deleteRemixJob } from '@/lib/cog';
import type {
  CogRemixJobFull,
  CogRemixCandidate,
  CogRemixTraceEntry,
} from '@/lib/types/cog';

interface RemixExecutionMonitorProps {
  initialJob: CogRemixJobFull;
  seriesId: string;
}

function PhaseStatusPill({ label, status }: { label: string; status: string }) {
  const colorClasses: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colorClasses[status] || colorClasses.pending}`}>
      {label}: {status}
    </span>
  );
}

function CandidateCard({ candidate }: { candidate: CogRemixCandidate }) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden border ${
        candidate.selected
          ? 'ring-2 ring-green-500 border-green-500'
          : 'border-border'
      }`}
    >
      <div className="aspect-[4/3] relative bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={candidate.thumbnail_url}
          alt={`Candidate from ${candidate.source}`}
          className="w-full h-full object-cover"
        />
        {candidate.eval_score != null && (
          <div
            className={`absolute top-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded ${
              candidate.eval_score >= 7
                ? 'bg-green-600 text-white'
                : candidate.eval_score >= 5
                  ? 'bg-yellow-600 text-white'
                  : 'bg-red-600 text-white'
            }`}
          >
            {candidate.eval_score.toFixed(1)}
          </div>
        )}
        {candidate.selected && (
          <div className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded bg-green-600 text-white">
            Selected
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="text-xs text-muted-foreground truncate">
          {candidate.source} &middot; {candidate.photographer || 'Unknown'}
        </div>
        {candidate.eval_reasoning && (
          <p className="text-xs mt-1 line-clamp-2">{candidate.eval_reasoning}</p>
        )}
      </div>
    </div>
  );
}

function TraceViewer({ trace }: { trace: CogRemixTraceEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  if (trace.length === 0) return null;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
      >
        <span>Execution Trace ({trace.length} entries)</span>
        <span>{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>
      {expanded && (
        <div className="border-t divide-y max-h-96 overflow-y-auto">
          {trace.map((entry, i) => (
            <div key={i} className="px-3 py-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {entry.iteration ? `iter${entry.iteration}` : ''} {entry.phase}/{entry.step}
                </span>
                <span className="text-muted-foreground">{entry.duration_ms}ms</span>
                {entry.tokens_in != null && (
                  <span className="text-muted-foreground">
                    {entry.tokens_in}in/{entry.tokens_out}out
                  </span>
                )}
              </div>
              <p className="mt-0.5">{entry.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RemixExecutionMonitor({ initialJob, seriesId }: RemixExecutionMonitorProps) {
  const router = useRouter();
  const [job, setJob] = useState<CogRemixJobFull>(initialJob);
  const [polling, setPolling] = useState(
    initialJob.status === 'running' || initialJob.status === 'draft'
  );
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isRunning = job.status === 'running';
  const isDraft = job.status === 'draft';

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/cog/remix/${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        if (data.status !== 'running') {
          setPolling(false);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [job.id]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [polling, fetchJob]);

  async function handleRun() {
    setPolling(true);
    runRemixSource(
      job.id,
      seriesId,
      job.story,
      job.topics,
      job.colors,
      job.target_aspect_ratio
    ).catch((err) => {
      console.error('Remix execution error:', err);
    });
    // Start polling immediately
    setTimeout(fetchJob, 1000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRemixJob(job.id);
      router.push(`/tools/cog/${seriesId}`);
    } catch {
      setDeleting(false);
    }
  }

  // Find the selected image
  const selectedCandidate = job.iterations
    .flatMap((iter) => iter.candidates)
    .find((c) => c.selected);

  return (
    <div className="space-y-6">
      {/* Phase Status */}
      <div className="flex items-center gap-3">
        <PhaseStatusPill label="Source" status={job.source_status} />
        <PhaseStatusPill label="Augment" status={job.augment_status} />
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            job.status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : job.status === 'running'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : job.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-muted text-muted-foreground'
          }`}
        >
          {job.status}
        </span>
      </div>

      {/* Error message */}
      {job.error_message && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 text-sm">
          {job.error_message}
        </div>
      )}

      {/* Brief summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-sm">Creative Brief</h3>
        <p className="text-sm">{job.story}</p>
        {job.topics.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {job.topics.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted">{t}</span>
            ))}
          </div>
        )}
        {job.colors.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {job.colors.map((c) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted">{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* Selected image preview */}
      {selectedCandidate && selectedCandidate.image_id && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm">Selected Image</h3>
          <div className="flex gap-4">
            <div className="w-64 aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCandidate.source_url}
                alt="Selected"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Source:</span>{' '}
                {selectedCandidate.source}
              </p>
              <p>
                <span className="text-muted-foreground">Photographer:</span>{' '}
                {selectedCandidate.photographer_url ? (
                  <a
                    href={selectedCandidate.photographer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedCandidate.photographer}
                  </a>
                ) : (
                  selectedCandidate.photographer || 'Unknown'
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Score:</span>{' '}
                {selectedCandidate.eval_score?.toFixed(1)}/10
              </p>
              {selectedCandidate.eval_reasoning && (
                <p className="text-muted-foreground text-xs mt-2">
                  {selectedCandidate.eval_reasoning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Iteration cards */}
      {job.iterations.map((iteration) => (
        <div key={iteration.id} className="border rounded-lg overflow-hidden">
          <div className="p-3 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">Iteration {iteration.iteration_number}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  iteration.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : iteration.status === 'running'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse'
                      : 'bg-muted'
                }`}
              >
                {iteration.status}
              </span>
            </div>
          </div>
          <div className="p-3 space-y-3">
            {/* Search params */}
            {iteration.search_params && (
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground">
                  Queries: {(iteration.search_params.queries || []).join(' | ')}
                </p>
                {iteration.search_params.color && (
                  <p className="text-muted-foreground">
                    Color: {iteration.search_params.color}
                  </p>
                )}
                {iteration.search_params.orientation && (
                  <p className="text-muted-foreground">
                    Orientation: {iteration.search_params.orientation}
                  </p>
                )}
              </div>
            )}
            {iteration.llm_reasoning && (
              <p className="text-xs text-muted-foreground italic">
                {iteration.llm_reasoning}
              </p>
            )}

            {/* Candidate grid */}
            {iteration.candidates.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {iteration.candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            )}

            {/* Feedback */}
            {iteration.feedback && (
              <div className="text-xs bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                <span className="font-medium">Feedback for next iteration:</span>{' '}
                {iteration.feedback}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading indicator while running with no iterations yet */}
      {isRunning && job.iterations.length === 0 && (
        <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30">
          <div className="text-center space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Starting source phase...</p>
          </div>
        </div>
      )}

      {/* Trace viewer */}
      <TraceViewer trace={job.trace || []} />

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {isDraft && (
          <Button onClick={handleRun}>
            Run Source Phase
          </Button>
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'Confirm Delete'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
            disabled={isRunning}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
