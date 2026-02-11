'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PipelineStepCard } from './pipeline-step-card';
import { updateJob, selectBaseImage, getCogImageUrl, getBaseCandidatesForJob, getImageById } from '@/lib/cog';
import { runFoundation, runSequence } from '@/lib/ai/actions/run-pipeline-job';
import type { CogPipelineJobWithSteps, CogPipelineBaseCandidate, CogFoundationStatus, CogSequenceStatus } from '@/lib/types/cog';

// ============================================================================
// Types
// ============================================================================

export interface BaseCandidateWithImage extends CogPipelineBaseCandidate {
  storage_path: string | null;
}

// ============================================================================
// Phase Status Helpers
// ============================================================================

type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

function getPhaseStatusColor(status: PhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'running':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getBaseSelectionStatus(job: CogPipelineJobWithSteps): PhaseStatus {
  if (job.selected_base_image_id) return 'completed';
  if (job.foundation_status === 'completed' && !job.selected_base_image_id) return 'running';
  if (job.foundation_status === 'completed' || job.foundation_status === 'failed') return 'pending';
  return 'pending';
}

// ============================================================================
// Component
// ============================================================================

interface PipelineExecutionMonitorProps {
  job: CogPipelineJobWithSteps;
  seriesId: string;
  initialBaseCandidates?: BaseCandidateWithImage[];
}

export function PipelineExecutionMonitor({
  job: initialJob,
  seriesId,
  initialBaseCandidates = [],
}: PipelineExecutionMonitorProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [baseCandidates, setBaseCandidates] = useState<BaseCandidateWithImage[]>(initialBaseCandidates);
  const [isPolling, setIsPolling] = useState(
    initialJob.status === 'running' || initialJob.status === 'ready'
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSelectingBase, setIsSelectingBase] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Determine if this is a two-phase job
  const isTwoPhase = !!(
    job.photographer_config_id ||
    job.director_config_id ||
    job.production_config_id
  );

  const foundationStatus = (job.foundation_status || 'pending') as CogFoundationStatus;
  const selectionStatus = getBaseSelectionStatus(job);
  const sequenceStatus = (job.sequence_status || 'pending') as CogSequenceStatus;

  // Fetch base candidates when foundation completes
  const fetchCandidates = useCallback(async () => {
    try {
      const candidates = await getBaseCandidatesForJob(job.id);
      // Enrich with storage paths for display
      const enriched: BaseCandidateWithImage[] = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const image = await getImageById(candidate.image_id);
            return { ...candidate, storage_path: image.storage_path };
          } catch {
            return { ...candidate, storage_path: null };
          }
        })
      );
      setBaseCandidates(enriched);
    } catch (error) {
      console.error('Failed to fetch base candidates:', error);
    }
  }, [job.id]);

  // Polling logic
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/cog/pipeline/${job.id}`);
        if (!response.ok) throw new Error('Failed to fetch job');
        const updated: CogPipelineJobWithSteps = await response.json();
        setJob(updated);

        // Fetch base candidates when foundation completes
        if (updated.foundation_status === 'completed' && baseCandidates.length === 0) {
          fetchCandidates();
        }

        // Stop polling if job reaches terminal state or is waiting for base selection
        if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
          setIsPolling(false);
        }
        // Also stop polling when foundation completes and we're waiting for selection
        if (updated.foundation_status === 'completed' && !updated.selected_base_image_id && updated.sequence_status === 'pending') {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPolling, job.id, baseCandidates.length, fetchCandidates]);

  // Countdown timer for auto-advance preview
  useEffect(() => {
    const currentStepIndex = job.steps.findIndex((s) => s.status === 'running');
    const currentStep = currentStepIndex >= 0 ? job.steps[currentStepIndex] : null;
    const nextStep = currentStepIndex >= 0 && currentStepIndex < job.steps.length - 1 ? job.steps[currentStepIndex + 1] : null;

    // Show countdown when current step completes and there's a next step
    if (currentStep?.status === 'completed' && nextStep?.status === 'pending') {
      setCountdown(4);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c === null || c <= 0) {
            clearInterval(timer);
            return null;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [job.steps]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await updateJob(job.id, { status: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel job:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSelectBase = async (imageId: string) => {
    setIsSelectingBase(true);
    try {
      await selectBaseImage(job.id, imageId);
      setJob((prev) => ({ ...prev, selected_base_image_id: imageId }));
    } catch (error) {
      console.error('Failed to select base image:', error);
    } finally {
      setIsSelectingBase(false);
    }
  };

  const handleRerunFoundation = async () => {
    setIsRunningAction(true);
    try {
      // Reset foundation status and clear previous selection
      await updateJob(job.id, {
        foundation_status: 'pending',
        selected_base_image_id: null,
        sequence_status: 'pending',
        error_message: null,
      });
      runFoundation({ jobId: job.id, seriesId }).catch((err) => {
        console.error('Failed to re-run foundation:', err);
      });
      setIsPolling(true);
      router.refresh();
    } catch (error) {
      console.error('Failed to re-run foundation:', error);
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleStartSequence = async () => {
    setIsRunningAction(true);
    try {
      runSequence({ jobId: job.id, seriesId }).catch((err) => {
        console.error('Failed to start sequence:', err);
      });
      setIsPolling(true);
      router.refresh();
    } catch (error) {
      console.error('Failed to start sequence:', error);
    } finally {
      setIsRunningAction(false);
    }
  };

  const currentStepIndex = job.steps.findIndex(
    (s) => s.status === 'running' || (s.status === 'completed' && job.steps.every((step, idx) => idx > job.steps.indexOf(s) ? step.status === 'pending' : true))
  );

  const completedSteps = job.steps.filter((s) => s.status === 'completed');
  const failedSteps = job.steps.filter((s) => s.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Two-Phase Status Banner */}
      {isTwoPhase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {/* Foundation Phase */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPhaseStatusColor(foundationStatus)}`}>
                    {foundationStatus}
                  </span>
                  <span className="text-sm font-medium">Foundation</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate base image candidates
                </p>
              </div>

              {/* Arrow */}
              <div className="text-muted-foreground shrink-0 px-1">
                &rarr;
              </div>

              {/* Base Selection Phase */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPhaseStatusColor(selectionStatus)}`}>
                    {selectionStatus === 'running' ? 'awaiting' : selectionStatus}
                  </span>
                  <span className="text-sm font-medium">Selection</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose a base image
                </p>
              </div>

              {/* Arrow */}
              <div className="text-muted-foreground shrink-0 px-1">
                &rarr;
              </div>

              {/* Sequence Phase */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPhaseStatusColor(sequenceStatus)}`}>
                    {sequenceStatus}
                  </span>
                  <span className="text-sm font-medium">Sequence</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Refine with pipeline steps
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              {/* Re-run Foundation: available when foundation completed or failed */}
              {(foundationStatus === 'completed' || foundationStatus === 'failed') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRerunFoundation}
                  disabled={isRunningAction}
                >
                  {isRunningAction ? 'Starting...' : 'Re-run Foundation'}
                </Button>
              )}

              {/* Start/Re-run Sequence: available when base is selected */}
              {job.selected_base_image_id && sequenceStatus !== 'running' && (
                <Button
                  size="sm"
                  onClick={handleStartSequence}
                  disabled={isRunningAction}
                >
                  {isRunningAction
                    ? 'Starting...'
                    : sequenceStatus === 'completed' || sequenceStatus === 'failed'
                      ? 'Re-run Sequence'
                      : 'Start Sequence'
                  }
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Prompt (synthesized by the inference pipeline) */}
      {job.synthesized_prompt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.synthesized_prompt}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Base Candidate Selection */}
      {isTwoPhase && foundationStatus === 'completed' && baseCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {job.selected_base_image_id ? 'Selected Base Image' : 'Select a Base Image'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {baseCandidates.map((candidate) => {
                const isSelected = job.selected_base_image_id === candidate.image_id;
                return (
                  <div
                    key={candidate.id}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    {candidate.storage_path ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={getCogImageUrl(candidate.storage_path)}
                        alt={`Base candidate ${candidate.candidate_index + 1}`}
                        className="aspect-square object-cover w-full bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Image unavailable</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      {isSelected ? (
                        <span className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">
                          Selected
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7"
                          onClick={() => handleSelectBase(candidate.image_id)}
                          disabled={isSelectingBase}
                        >
                          {isSelectingBase ? 'Selecting...' : `Select #${candidate.candidate_index + 1}`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!job.selected_base_image_id && (
              <p className="text-sm text-muted-foreground mt-3">
                Choose a base image to proceed to the sequence phase.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Status Banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-lg font-semibold px-3 py-1 rounded-full ${
                    job.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : job.status === 'running'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : job.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : job.status === 'cancelled'
                            ? 'bg-muted'
                            : 'bg-muted'
                  }`}
                >
                  {job.status}
                </span>
                {countdown !== null && (
                  <span className="text-sm text-muted-foreground">
                    Next step in {countdown}s...
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {completedSteps.length} of {job.steps.length} steps completed
                {failedSteps.length > 0 && ` -- ${failedSteps.length} failed`}
              </p>
            </div>
            {(job.status === 'running' || job.status === 'ready') && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Pipeline'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Stepper */}
      {job.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.steps.map((step, idx) => (
                <PipelineStepCard
                  key={step.id}
                  step={step}
                  stepNumber={idx + 1}
                  isActive={idx === currentStepIndex}
                  seriesId={seriesId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intermediate Outputs */}
      {completedSteps.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span>Intermediate Outputs ({completedSteps.length})</span>
                  <span className="text-sm text-muted-foreground">Click to expand</span>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {completedSteps.map((step) => (
                    step.output && (
                      <div key={step.id} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Step {step.step_order + 1}: {step.step_type}
                        </p>
                        {/* TODO: Display image thumbnail when we have the image URL */}
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Image #{step.output.image_id}</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Final Result */}
      {job.status === 'completed' && completedSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Final image display (TODO)</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
