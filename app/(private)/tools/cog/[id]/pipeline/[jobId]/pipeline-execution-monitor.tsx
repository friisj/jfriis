'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PipelineStepCard } from './pipeline-step-card';
import { updateJob } from '@/lib/cog';
import { getPipelineJobWithStepsServer } from '@/lib/cog-server';
import type { CogPipelineJobWithSteps } from '@/lib/types/cog';

interface PipelineExecutionMonitorProps {
  job: CogPipelineJobWithSteps;
  seriesId: string;
}

export function PipelineExecutionMonitor({ job: initialJob, seriesId }: PipelineExecutionMonitorProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [isPolling, setIsPolling] = useState(
    initialJob.status === 'running' || initialJob.status === 'ready'
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Polling logic
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getPipelineJobWithStepsServer(job.id);
        setJob(updated);

        // Stop polling if job reaches terminal state
        if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPolling, job.id]);

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
      // Polling will detect the cancellation
    } catch (error) {
      console.error('Failed to cancel job:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const currentStepIndex = job.steps.findIndex(
    (s) => s.status === 'running' || (s.status === 'completed' && job.steps.every((step, idx) => idx > job.steps.indexOf(s) ? step.status === 'pending' : true))
  );

  const completedSteps = job.steps.filter((s) => s.status === 'completed');
  const failedSteps = job.steps.filter((s) => s.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Status Banner */}
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
                {failedSteps.length > 0 && ` • ${failedSteps.length} failed`}
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
