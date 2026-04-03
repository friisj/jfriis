/**
 * Luv: Generation Job Infrastructure
 *
 * Two-phase async pattern for image generation, chassis studies, and sketch studies.
 * start_* tools create a job row and return immediately.
 * check_gen_job reads the row, executes the pipeline if pending, and returns the result.
 */

import { createClient } from '@supabase/supabase-js';

export type GenJobType = 'image' | 'chassis_study' | 'sketch_study';
export type GenJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenJobRecord {
  id: string;
  job_type: GenJobType;
  status: GenJobStatus;
  input_params: Record<string, unknown>;
  image_url: string | null;
  cog_image_id: string | null;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Create a new generation job. Returns the job UUID.
 */
export async function submitGenJob(
  jobType: GenJobType,
  inputParams: Record<string, unknown>,
): Promise<string> {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('luv_gen_jobs')
    .insert({
      job_type: jobType,
      status: 'pending',
      input_params: inputParams,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create gen job: ${error.message}`);
  return data.id as string;
}

/**
 * Read a job row by ID.
 */
export async function getGenJob(jobId: string): Promise<GenJobRecord | null> {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('luv_gen_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return null;
  return data as GenJobRecord;
}

/**
 * Update a job row.
 */
export async function updateGenJob(
  jobId: string,
  patch: Partial<Pick<GenJobRecord, 'status' | 'image_url' | 'cog_image_id' | 'result_data' | 'error_message' | 'duration_ms'>>,
): Promise<void> {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('luv_gen_jobs')
    .update(patch)
    .eq('id', jobId);

  if (error) console.error('[luv-gen-jobs] updateGenJob failed:', error.message);
}

/**
 * Execute a pending job. Dispatches to the appropriate pipeline based on job_type.
 * Updates the job row with results or error.
 */
export async function executeGenJob(jobId: string): Promise<GenJobRecord> {
  const job = await getGenJob(jobId);
  if (!job) throw new Error(`Gen job not found: ${jobId}`);

  // Already terminal
  if (job.status === 'completed' || job.status === 'failed') return job;

  // Mark processing
  await updateGenJob(jobId, { status: 'processing' });

  const startTime = Date.now();

  try {
    let result: Record<string, unknown>;

    switch (job.job_type) {
      case 'image':
        result = await executeImageJob(job.input_params);
        break;
      case 'chassis_study':
        result = await executeChassisStudyJob(job.input_params);
        break;
      case 'sketch_study':
        result = await executeSketchStudyJob(job.input_params);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }

    const durationMs = Date.now() - startTime;
    const imageUrl = (result.imageUrl as string) ?? null;
    const cogImageId = (result.cogImageId as string) ?? null;

    await updateGenJob(jobId, {
      status: 'completed',
      image_url: imageUrl,
      cog_image_id: cogImageId,
      result_data: result,
      duration_ms: durationMs,
    });

    return {
      ...job,
      status: 'completed',
      image_url: imageUrl,
      cog_image_id: cogImageId,
      result_data: result,
      duration_ms: durationMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const durationMs = Date.now() - startTime;
    await updateGenJob(jobId, {
      status: 'failed',
      error_message: msg,
      duration_ms: durationMs,
    });

    return {
      ...job,
      status: 'failed',
      error_message: msg,
      duration_ms: durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Job type executors
// ---------------------------------------------------------------------------

async function executeImageJob(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { generateLuvImage } = await import('./luv-image-gen');

  const result = await generateLuvImage({
    prompt: params.prompt as string,
    referenceImages: params.referenceImages as { base64: string; mimeType: string }[] | undefined,
    aspectRatio: params.aspectRatio as '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | undefined,
    imageSize: params.imageSize as '1K' | '2K' | '4K' | undefined,
    model: params.model as 'nano-banana-2' | 'nano-banana-pro' | undefined,
    templateId: params.templateId as string | undefined,
  });

  return {
    type: 'image_generation_result',
    success: true,
    imageUrl: result.publicUrl,
    cogImageId: result.cogImageId,
    cogSeriesId: result.cogSeriesId,
    prompt: result.prompt,
    model: result.model,
    aspectRatio: params.aspectRatio ?? '1:1',
    imageSize: params.imageSize ?? '1K',
    durationMs: result.durationMs,
  };
}

async function executeChassisStudyJob(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { runChassisStudyPipeline } = await import('./luv-chassis-study-pipeline');

  const result = await runChassisStudyPipeline({
    userPrompt: params.userPrompt as string,
    goal: params.goal as string | undefined,
    style: params.style as string | undefined,
    moduleSlugs: params.moduleSlugs as string[] | undefined,
    dynamics: params.dynamics as string | undefined,
    focusArea: params.focusArea as string | undefined,
    aspectRatio: params.aspectRatio as string | undefined,
    imageSize: params.imageSize as '1K' | '2K' | '4K' | undefined,
    model: params.model as 'nano-banana-2' | 'nano-banana-pro' | undefined,
    chatReferenceImages: params.chatReferenceImages as { base64: string; mimeType: string }[] | undefined,
  });

  return {
    type: 'chassis_study_result',
    success: true,
    studyId: result.study.id,
    imageUrl: result.imageUrl,
    cogImageId: result.study.cog_image_id,
    brief: result.brief,
    generationPrompt: result.deliberation.generationPrompt,
    moduleSlugs: params.moduleSlugs ?? [],
    durationMs: result.durationMs,
    deliberation: {
      rounds: result.deliberation.turns.length,
      totalDurationMs: result.deliberation.totalDurationMs,
      summary: result.deliberation.turns.map(
        (t: { role: string; content: string }) => `[${t.role}] ${t.content.slice(0, 150)}`
      ),
    },
  };
}

async function executeSketchStudyJob(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { runSketchStudyPipeline } = await import('./luv-sketch-study-pipeline');

  const result = await runSketchStudyPipeline({
    subject: params.subject as string,
    focus: params.focus as 'assembly' | 'detail' | 'dynamics',
    moduleSlugs: params.moduleSlugs as string[] | undefined,
    aspectRatio: params.aspectRatio as '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | undefined,
    styleNotes: params.styleNotes as string | undefined,
    referenceImages: params.referenceImages as { base64: string; mimeType: string }[] | undefined,
    warnings: params.warnings as string[] | undefined,
  });

  return {
    type: 'sketch_study_result',
    success: true,
    imageUrl: result.imageUrl,
    cogImageId: result.cogImageId,
    prompt: result.prompt,
    durationMs: result.durationMs,
    referenceUsed: result.referenceUsed,
    focus: params.focus,
  };
}
