import { getJobWithStepsAndInputsServer, getSeriesImagesServer } from '@/lib/cog-server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import type { CogJobWithStepsAndInputs, CogImage } from '@/lib/types/cog';
import { JobRunner } from './job-runner';
import { JobActions } from './job-actions';
import { JobInputs } from './job-inputs';
import { EditableStepPrompt } from './editable-step-prompt';
import { EditableJobTitle } from './editable-job-title';
import { ThinkingChainViewer } from './thinking-chain-viewer';
import { RefineImageDialog } from './refine-image-dialog';
import { RetryStepButton } from './retry-step-button';
import { StepActions } from './step-actions';
import { Disclosure, DisclosureContent, DisclosureTrigger } from './disclosure';

interface Props {
  params: Promise<{ id: string; jobId: string }>;
}

async function getJobData(
  jobId: string,
  seriesId: string
): Promise<{ job: CogJobWithStepsAndInputs; seriesImages: CogImage[] } | null> {
  try {
    const [job, seriesImages] = await Promise.all([
      getJobWithStepsAndInputsServer(jobId),
      getSeriesImagesServer(seriesId),
    ]);
    return { job, seriesImages };
  } catch {
    return null;
  }
}

export default async function JobDetailPage({ params }: Props) {
  const { id: seriesId, jobId } = await params;
  const data = await getJobData(jobId, seriesId);

  if (!data) {
    notFound();
  }

  const { job, seriesImages } = data;

  const canEdit = job.status === 'draft' || job.status === 'ready';
  const canRun = job.status === 'draft' || job.status === 'ready';
  const isRunning = job.status === 'running';
  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/tools/cog" className="hover:text-foreground">
              Series
            </Link>
            <span>/</span>
            <Link href={`/tools/cog/${seriesId}`} className="hover:text-foreground">
              Back
            </Link>
            <span>/</span>
            <span>Job</span>
          </div>
          <EditableJobTitle jobId={job.id} title={job.title || 'Untitled Job'} canEdit={canEdit} />
          <p className="text-muted-foreground mt-2 line-clamp-2">{job.base_prompt}</p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium ${
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

      {/* Image Model and Settings */}
      <div className="mb-4 flex items-center gap-2 text-sm flex-wrap">
        <span className="text-muted-foreground">Model:</span>
        {job.image_model && job.image_model !== 'auto' ? (
          <span className="px-2 py-0.5 rounded-full bg-muted font-medium">
            {job.image_model === 'gemini-3-pro-image' && 'Gemini 3 Pro Image'}
            {job.image_model === 'imagen-3-capability' && 'Imagen 3 Capability'}
            {job.image_model === 'imagen-4' && 'Imagen 4'}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Auto</span>
        )}
        {job.use_thinking && (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-medium">
            Thinking
          </span>
        )}
      </div>

      {/* Shoot Setup - collapsed by default */}
      {(job.scene || job.art_direction || job.styling || job.lighting || job.camera || job.framing) && (
        <Disclosure>
          <div className="mb-6 border rounded-lg bg-muted/30">
            <DisclosureTrigger className="p-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Shoot Setup
              </span>
            </DisclosureTrigger>
            <DisclosureContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {job.scene && (
                  <div>
                    <span className="text-muted-foreground">Scene:</span>
                    <p className="mt-0.5">{job.scene}</p>
                  </div>
                )}
                {job.art_direction && (
                  <div>
                    <span className="text-muted-foreground">Art Direction:</span>
                    <p className="mt-0.5">{job.art_direction}</p>
                  </div>
                )}
                {job.styling && (
                  <div>
                    <span className="text-muted-foreground">Styling:</span>
                    <p className="mt-0.5">{job.styling}</p>
                  </div>
                )}
                {job.lighting && (
                  <div>
                    <span className="text-muted-foreground">Lighting:</span>
                    <p className="mt-0.5">{job.lighting}</p>
                  </div>
                )}
                {job.camera && (
                  <div>
                    <span className="text-muted-foreground">Camera:</span>
                    <p className="mt-0.5">{job.camera}</p>
                  </div>
                )}
                {job.framing && (
                  <div>
                    <span className="text-muted-foreground">Framing:</span>
                    <p className="mt-0.5">{job.framing}</p>
                  </div>
                )}
              </div>
            </DisclosureContent>
          </div>
        </Disclosure>
      )}

      {/* Error message */}
      {isFailed && job.error_message && (
        <div className="p-4 mb-6 bg-destructive/10 text-destructive rounded-lg">
          <strong>Error:</strong> {job.error_message}
        </div>
      )}

      {/* Job Runner (client component for running jobs) */}
      {canRun && (
        <div className="mb-8">
          <JobRunner
            jobId={job.id}
            seriesId={seriesId}
            currentModel={job.image_model || 'auto'}
            currentImageSize={job.image_size || '2K'}
            currentAspectRatio={job.aspect_ratio || '1:1'}
            currentThinking={job.use_thinking || false}
            hasReferenceImages={job.inputs.length > 0}
          />
        </div>
      )}

      {/* Reference Images */}
      <JobInputs
        jobId={job.id}
        inputs={job.inputs}
        seriesImages={seriesImages}
        canEdit={canEdit}
        maxReferenceImages={job.max_reference_images}
      />

      {/* Shots */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Shots ({job.steps.length})
        </h2>
        <div className="space-y-4">
          {job.steps.map((step) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${
                step.step_type === 'llm'
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  : 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background">
                    Shot {step.sequence}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      step.step_type === 'llm'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}
                  >
                    {step.step_type === 'llm' ? 'LLM' : 'Image'}
                  </span>
                  <span className="text-xs text-muted-foreground">{step.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      step.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : step.status === 'running'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : step.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-muted'
                    }`}
                  >
                    {step.status}
                  </span>
                  <StepActions stepId={step.id} canEdit={canEdit} />
                </div>
              </div>

              <EditableStepPrompt
                stepId={step.id}
                prompt={step.prompt}
                canEdit={canEdit}
              />

              {/* Step output */}
              {step.output && (
                <div className="mt-3">
                  {/* Thinking chain visualization (if present) */}
                  {step.step_type === 'image_gen' &&
                    step.output &&
                    'thinkingChain' in step.output &&
                    step.output.thinkingChain != null && (
                      <ThinkingChainViewer
                        thinkingChain={step.output.thinkingChain as {
                          originalPrompt: string;
                          referenceAnalysis?: string[];
                          refinedPrompt?: string;
                        }}
                      />
                    )}

                  <div className="p-3 bg-background rounded border mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Output:</p>
                    {step.step_type === 'llm' ? (
                      <p className="text-sm whitespace-pre-wrap">
                        {typeof step.output === 'object' && 'text' in step.output
                          ? String(step.output.text)
                          : JSON.stringify(step.output)}
                      </p>
                    ) : (
                      <div className="text-sm">
                        {typeof step.output === 'object' && 'imageUrl' in step.output ? (
                          (() => {
                            const output = step.output as Record<string, unknown>;
                            const refinementHistory = output.refinementHistory as
                              | Array<{
                                  feedback: string;
                                  imageUrl: string;
                                  storagePath: string;
                                  durationMs: number;
                                  timestamp: string;
                                }>
                              | undefined;
                            const refinementCount = refinementHistory?.length ?? 0;

                            return (
                              <div className="space-y-3">
                                <img
                                  src={String(output.imageUrl)}
                                  alt="Generated"
                                  className="max-w-full h-auto rounded"
                                />
                                {/* Refine and Retry buttons - only for completed image_gen steps */}
                                {step.status === 'completed' && (
                                  <div className="flex items-center gap-2">
                                    <RefineImageDialog
                                      stepId={step.id}
                                      currentImageUrl={String(output.imageUrl)}
                                      refinementHistory={refinementHistory}
                                    />
                                    <RetryStepButton stepId={step.id} />
                                    {refinementCount > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {refinementCount} refinement{refinementCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step error */}
              {step.error_message && (
                <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded text-sm">
                  {step.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 pt-6 border-t flex items-center justify-between">
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link href={`/tools/cog/${seriesId}`}>Back to Series</Link>
          </Button>
          {isComplete && (
            <Button variant="outline" asChild>
              <Link href={`/tools/cog/${seriesId}/job/new`}>Create New Job</Link>
            </Button>
          )}
        </div>
        <JobActions jobId={job.id} seriesId={seriesId} jobStatus={job.status} />
      </div>
    </div>
  );
}
