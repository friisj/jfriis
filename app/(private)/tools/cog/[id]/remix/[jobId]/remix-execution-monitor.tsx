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
import { getAllEvalProfiles, updateRemixJob } from '@/lib/cog';
import { runRemixSource, runRemixReeval } from '@/lib/ai/actions/run-remix-job';
import { deriveTopicsFromStory } from '@/lib/ai/actions/derive-remix-topics';
import { deleteRemixJob, duplicateRemixJob } from '@/lib/cog';
import type {
  CogRemixJobFull,
  CogRemixCandidate,
  CogRemixTraceEntry,
  CogEvalProfile,
  CogRemixEvalRunFull,
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

function CandidateCard({ candidate, evalRunResults, profileSelections }: {
  candidate: CogRemixCandidate;
  evalRunResults?: Map<string, { score: number | null; reasoning: string | null; criterion_scores: Record<string, number> | null }>;
  profileSelections?: string[];
}) {
  const [showDetails, setShowDetails] = useState(false);

  const selectionCount = profileSelections?.length ?? 0;
  const isConsensus = selectionCount > 1;

  return (
    <div
      className={`relative rounded-lg overflow-hidden border ${
        candidate.selected
          ? 'ring-2 ring-green-500 border-green-500'
          : selectionCount > 0
            ? 'ring-2 ring-purple-500 border-purple-500'
            : 'border-border'
      }`}
    >
      <div className="aspect-[4/3] relative bg-muted cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
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
        {/* Per-profile selection badges */}
        {selectionCount > 0 && !candidate.selected && (
          <div className={`absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded ${
            isConsensus ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
          }`}>
            {isConsensus ? `${selectionCount} profiles` : profileSelections![0]}
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
        {/* Per-profile selection indicators */}
        {profileSelections && profileSelections.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {profileSelections.map((name) => (
              <span key={name} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {name}
              </span>
            ))}
          </div>
        )}
        {/* Show eval run comparisons */}
        {showDetails && evalRunResults && evalRunResults.size > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {Array.from(evalRunResults.entries()).map(([profileName, result]) => (
              <div key={profileName} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate mr-2">{profileName}</span>
                <span className={`font-bold ${
                  (result.score ?? 0) >= 7 ? 'text-green-600' : (result.score ?? 0) >= 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {result.score?.toFixed(1) ?? '-'}
                </span>
              </div>
            ))}
          </div>
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

function EvalRunsSection({ evalRuns, allCandidates }: {
  evalRuns: CogRemixEvalRunFull[];
  allCandidates: CogRemixCandidate[];
}) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Only show post-hoc runs (not initial inline runs)
  const postHocRuns = evalRuns.filter(r => !r.is_initial);
  if (postHocRuns.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Post-hoc Eval Runs</h3>
      {postHocRuns.map((run) => (
        <div key={run.id} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{run.profile?.name || 'Unknown Profile'}</span>
              <PhaseStatusPill label="" status={run.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(run.created_at).toLocaleString()}
              </span>
            </div>
            <span className="text-xs">{expandedRun === run.id ? '\u25B2' : '\u25BC'}</span>
          </button>
          {expandedRun === run.id && run.results.length > 0 && (
            <div className="border-t p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {run.results
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                  .map((result) => {
                    const candidate = allCandidates.find(c => c.id === result.candidate_id);
                    if (!candidate) return null;
                    return (
                      <div key={result.id} className="border rounded-lg overflow-hidden">
                        <div className="aspect-[4/3] relative bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.thumbnail_url}
                            alt="Candidate"
                            className="w-full h-full object-cover"
                          />
                          {result.score != null && (
                            <div className={`absolute top-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                              result.score >= 7 ? 'bg-green-600 text-white' : result.score >= 5 ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {result.score.toFixed(1)}
                            </div>
                          )}
                          {/* Show original score for comparison */}
                          {candidate.eval_score != null && (
                            <div className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded bg-black/50 text-white">
                              orig: {candidate.eval_score.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          {result.reasoning && (
                            <p className="text-xs line-clamp-2">{result.reasoning}</p>
                          )}
                          {result.criterion_scores && (
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(result.criterion_scores).map(([key, score]) => (
                                <div key={key} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground truncate mr-1">{key.replace(/_/g, ' ')}</span>
                                  <span className="font-mono">{score}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ))}
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
  const [duplicating, setDuplicating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft editing state
  const [editTitle, setEditTitle] = useState(initialJob.title || '');
  const [editStory, setEditStory] = useState(initialJob.story);
  const [editTopics, setEditTopics] = useState(initialJob.topics.join(', '));
  const [editColors, setEditColors] = useState(initialJob.colors.join(', '));
  const [editAspectRatio, setEditAspectRatio] = useState(initialJob.target_aspect_ratio || '');
  const [editProfileIds, setEditProfileIds] = useState<string[]>(initialJob.eval_profile_ids || []);
  const [derivingTopics, setDerivingTopics] = useState(false);

  // Re-eval state
  const [showReeval, setShowReeval] = useState(false);
  const [evalProfiles, setEvalProfiles] = useState<CogEvalProfile[]>([]);
  const [selectedRevalProfile, setSelectedRevalProfile] = useState<string>('');
  const [reevalRunning, setReevalRunning] = useState(false);

  const isRunning = job.status === 'running';
  const isDraft = job.status === 'draft';
  const isCompleted = job.status === 'completed';

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/cog/remix/${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        if (data.status !== 'running') {
          // Check if any eval runs are still running
          const hasRunningEval = (data.eval_runs || []).some((r: CogRemixEvalRunFull) => r.status === 'running');
          if (!hasRunningEval) {
            setPolling(false);
          }
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

  // Load eval profiles when in draft mode or showing re-eval
  useEffect(() => {
    if ((isDraft || showReeval) && evalProfiles.length === 0) {
      getAllEvalProfiles().then(setEvalProfiles).catch(() => {});
    }
  }, [isDraft, showReeval, evalProfiles.length]);

  function parseCsv(input: string): string[] {
    return input.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function toggleEditProfile(id: string) {
    setEditProfileIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleDeriveTopics() {
    if (!editStory.trim()) return;
    setDerivingTopics(true);
    try {
      const derived = await deriveTopicsFromStory(editStory.trim());
      setEditTopics(derived.join(', '));
    } catch {
      // silent fail — user can still type manually
    } finally {
      setDerivingTopics(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const updates = {
        title: editTitle.trim() || null,
        story: editStory.trim(),
        topics: parseCsv(editTopics),
        colors: parseCsv(editColors),
        target_aspect_ratio: editAspectRatio || null,
        eval_profile_ids: editProfileIds,
      };
      await updateRemixJob(job.id, updates);
      setJob({ ...job, ...updates });
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    // Save draft edits before running
    const topics = parseCsv(editTopics);
    const colors = parseCsv(editColors);
    const story = editStory.trim();
    const aspectRatio = editAspectRatio || null;

    await updateRemixJob(job.id, {
      title: editTitle.trim() || null,
      story,
      topics,
      colors,
      target_aspect_ratio: aspectRatio,
      eval_profile_ids: editProfileIds,
    });

    setPolling(true);
    runRemixSource(
      job.id,
      seriesId,
      story,
      topics,
      colors,
      aspectRatio,
      editProfileIds.length > 0 ? editProfileIds : undefined,
    ).catch((err) => {
      console.error('Remix execution error:', err);
    });
    setTimeout(fetchJob, 1000);
  }

  async function handleReeval() {
    if (!selectedRevalProfile) return;
    setReevalRunning(true);
    setPolling(true);
    try {
      await runRemixReeval(job.id, selectedRevalProfile);
    } catch (err) {
      console.error('Re-eval error:', err);
    }
    setReevalRunning(false);
    setShowReeval(false);
    setSelectedRevalProfile('');
    fetchJob();
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

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const newJob = await duplicateRemixJob(job.id);
      router.push(`/tools/cog/${seriesId}/remix/${newJob.id}`);
    } catch {
      setDuplicating(false);
    }
  }

  // Build eval run result maps per candidate (for all runs, both initial and post-hoc)
  const allCandidates = job.iterations.flatMap((iter) => iter.candidates);
  const evalRunResultsPerCandidate = new Map<string, Map<string, { score: number | null; reasoning: string | null; criterion_scores: Record<string, number> | null }>>();

  // Build per-profile selection map: candidateId -> profileNames[]
  const profileSelectionsPerCandidate = new Map<string, string[]>();

  for (const run of (job.eval_runs || [])) {
    // Track per-profile selections
    if (run.selected_candidate_id) {
      const existing = profileSelectionsPerCandidate.get(run.selected_candidate_id) || [];
      existing.push(run.profile?.name || 'Unknown');
      profileSelectionsPerCandidate.set(run.selected_candidate_id, existing);
    }

    if (run.status !== 'completed') continue;
    for (const result of run.results) {
      if (!evalRunResultsPerCandidate.has(result.candidate_id)) {
        evalRunResultsPerCandidate.set(result.candidate_id, new Map());
      }
      evalRunResultsPerCandidate.get(result.candidate_id)!.set(
        run.profile?.name || 'Unknown',
        { score: result.score, reasoning: result.reasoning, criterion_scores: result.criterion_scores }
      );
    }
  }

  // Find the selected image
  const selectedCandidate = allCandidates.find((c) => c.selected);

  // Get all attached profiles (initial eval runs)
  const initialEvalRuns = (job.eval_runs || []).filter(r => r.is_initial);
  const attachedProfiles = job.eval_profiles || [];

  return (
    <div className="space-y-6">
      {/* Phase Status */}
      <div className="flex items-center gap-3 flex-wrap">
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
        {/* Show all attached profiles */}
        {attachedProfiles.length > 0 ? (
          attachedProfiles.map((p, i) => (
            <span key={p.id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              i === 0
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
            }`}>
              {i === 0 && attachedProfiles.length > 1 ? `${p.name} (primary)` : p.name}
            </span>
          ))
        ) : job.eval_profile ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Eval: {job.eval_profile.name}
          </span>
        ) : null}
      </div>

      {/* Error message */}
      {job.error_message && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 text-sm">
          {job.error_message}
        </div>
      )}

      {/* Brief — editable when draft, read-only otherwise */}
      {isDraft ? (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Creative Brief</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving || !editStory.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="e.g., Urban solitude at dusk"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-story">Story <span className="text-red-500">*</span></Label>
            <Textarea
              id="edit-story"
              value={editStory}
              onChange={(e) => setEditStory(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-topics">Topics</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleDeriveTopics}
                  disabled={!editStory.trim() || derivingTopics}
                  className="h-5 text-[10px] px-1.5 text-muted-foreground"
                >
                  {derivingTopics ? 'Deriving...' : 'Derive from story'}
                </Button>
              </div>
              <Input
                id="edit-topics"
                placeholder="e.g., solitude, urban, night"
                value={editTopics}
                onChange={(e) => setEditTopics(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Leave empty to auto-derive at run time.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-colors">Colors</Label>
              <Input
                id="edit-colors"
                placeholder="e.g., deep blue, amber"
                value={editColors}
                onChange={(e) => setEditColors(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={editAspectRatio} onValueChange={setEditAspectRatio}>
                <SelectTrigger>
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
                <p className="text-xs text-muted-foreground py-2">Loading profiles...</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                  {evalProfiles.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={editProfileIds.includes(p.id)}
                        onChange={() => toggleEditProfile(p.id)}
                        className="rounded border-border"
                      />
                      <span>{p.name}</span>
                      {editProfileIds.indexOf(p.id) === 0 && editProfileIds.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          primary
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {editProfileIds.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {editProfileIds.map((id) => {
                    const p = evalProfiles.find((ep) => ep.id === id);
                    return (
                      <span
                        key={id}
                        className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1"
                      >
                        {p?.name || 'Unknown'}
                        <button onClick={() => toggleEditProfile(id)} className="hover:text-purple-600 dark:hover:text-purple-400">x</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editProfileIds.length === 0
                  ? 'Default built-in eval'
                  : `${editProfileIds.length} profile(s). First = primary.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Multi-profile selection results */}
      {isCompleted && profileSelectionsPerCandidate.size > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm">Profile Selections</h3>
          {initialEvalRuns.map((run) => {
            const selectedCand = run.selected_candidate_id
              ? allCandidates.find(c => c.id === run.selected_candidate_id)
              : null;
            return (
              <div key={run.id} className="flex items-center gap-3 text-sm">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                  {run.profile?.name || 'Unknown'}
                </span>
                {selectedCand ? (
                  <span className="text-green-600">
                    Selected candidate (score: {selectedCand.eval_score?.toFixed(1)})
                  </span>
                ) : (
                  <span className="text-muted-foreground">No candidate met threshold</span>
                )}
              </div>
            );
          })}
          {/* Consensus summary */}
          {(() => {
            const candidatesSelectedByMultiple = Array.from(profileSelectionsPerCandidate.entries())
              .filter(([, profiles]) => profiles.length > 1);
            if (candidatesSelectedByMultiple.length > 0) {
              return (
                <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded p-2 mt-2">
                  Consensus: {candidatesSelectedByMultiple.length} candidate(s) selected by multiple profiles
                </div>
              );
            }
            if (profileSelectionsPerCandidate.size > 1) {
              return (
                <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 rounded p-2 mt-2">
                  Profiles disagreed on selection - different candidates chosen
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Selected image preview */}
      {selectedCandidate && selectedCandidate.image_id && (() => {
        const trace = job.trace || [];
        const totalTokensIn = trace.reduce((sum, t) => sum + (t.tokens_in || 0), 0);
        const totalTokensOut = trace.reduce((sum, t) => sum + (t.tokens_out || 0), 0);
        const totalTokens = totalTokensIn + totalTokensOut;
        const elapsedMs = job.started_at && job.completed_at
          ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
          : null;
        const elapsedStr = elapsedMs !== null
          ? elapsedMs < 60_000
            ? `${(elapsedMs / 1000).toFixed(1)}s`
            : `${Math.floor(elapsedMs / 60_000)}m ${Math.round((elapsedMs % 60_000) / 1000)}s`
          : null;
        const iterationCount = job.iterations?.length || 0;

        return (
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
                {(elapsedStr || totalTokens > 0) && (
                  <div className="flex gap-3 pt-2 mt-2 border-t text-xs text-muted-foreground">
                    {elapsedStr && <span>{elapsedStr} total</span>}
                    {iterationCount > 0 && <span>{iterationCount} iteration{iterationCount !== 1 ? 's' : ''}</span>}
                    {totalTokens > 0 && (
                      <span>{totalTokens.toLocaleString()} tokens ({totalTokensIn.toLocaleString()} in / {totalTokensOut.toLocaleString()} out)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    evalRunResults={evalRunResultsPerCandidate.get(candidate.id)}
                    profileSelections={profileSelectionsPerCandidate.get(candidate.id)}
                  />
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

      {/* Eval Runs Section (post-hoc only) */}
      {(job.eval_runs || []).length > 0 && (
        <EvalRunsSection evalRuns={job.eval_runs} allCandidates={allCandidates} />
      )}

      {/* Trace viewer */}
      <TraceViewer trace={job.trace || []} />

      {/* Re-evaluate panel */}
      {showReeval && (
        <div className="border rounded-lg p-4 space-y-3 bg-purple-50 dark:bg-purple-950/30">
          <h3 className="font-medium text-sm">Re-evaluate with Different Profile</h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={selectedRevalProfile} onValueChange={setSelectedRevalProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select eval profile..." />
                </SelectTrigger>
                <SelectContent>
                  {evalProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleReeval}
              disabled={!selectedRevalProfile || reevalRunning}
              size="sm"
            >
              {reevalRunning ? 'Running...' : 'Run Re-evaluation'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowReeval(false); setSelectedRevalProfile(''); }}
              disabled={reevalRunning}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {isDraft && (
          <Button onClick={handleRun}>
            Run Source Phase
          </Button>
        )}
        {isCompleted && !showReeval && (
          <Button variant="outline" onClick={() => setShowReeval(true)}>
            Re-evaluate
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleDuplicate}
          disabled={duplicating || isRunning}
        >
          {duplicating ? 'Duplicating...' : 'Duplicate'}
        </Button>
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
