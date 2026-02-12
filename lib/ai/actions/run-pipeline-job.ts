'use server';

import { experimental_generateImage as generateImage, generateText } from 'ai';
import { getGoogle } from '../providers';
import { getModel } from '../models';
import { generateImageWithVertex, isVertexConfigured } from '../vertex-imagen';
import { generateImageWithGemini3Pro, isGemini3ProConfigured } from '../gemini-multimodal';
import { generateWithFlux, isFluxConfigured, type FluxAspectRatio, type FluxResolution } from '../replicate-flux';
import { createClient } from '@/lib/supabase-server';
import {
  getJobByIdServer,
  getPipelineJobWithStepsServer,
  getImageByIdServer,
  getPhotographerConfigByIdServer,
  getDirectorConfigByIdServer,
  getProductionConfigByIdServer,
  updateJobServer,
  createImageServer,
  createPipelineStepOutputServer,
  createBaseCandidateServer,
} from '@/lib/cog-server';
import {
  buildContextTranslationPrompt,
  buildInference1Prompt,
  buildInference2Prompt,
  buildInference3Prompt,
  buildInference4Prompt,
  buildVisionPrompt,
  buildInference6Prompt,
  type InferenceContext,
} from '../prompts/pipeline-inference';
import type {
  CogPipelineStep,
  CogImageModel,
  CogImageSize,
  CogAspectRatio,
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
  CogPipelineJobWithSteps,
  CogInferenceLogEntry,
} from '@/lib/types/cog';
import { getStepConfig } from '../inference-defaults';

// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline Context
// ═══════════════════════════════════════════════════════════════════════════════

interface PipelineContext {
  photographerConfig: CogPhotographerConfig | null;
  directorConfig: CogDirectorConfig | null;
  productionConfig: CogProductionConfig | null;
  basePrompt: string;
  initialImages: string[];
  colors: string[];
  themes: string[];
  previousOutputs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOUNDATION PHASE: 7-step inference pipeline + generate N candidate base images
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run the foundation phase of a pipeline job.
 *
 * 1. Loads photographer, director, and production configs
 * 2. Runs the 7-step inference pipeline via generateBaseImagePrompt()
 * 3. Generates N candidate base images using I2I (prompt + reference images)
 * 4. Stores each candidate via createBaseCandidateServer()
 * 5. Updates foundation_status on the job ('running' -> 'completed' or 'failed')
 */
export async function runFoundation(input: { jobId: string; seriesId: string }): Promise<void> {
  const { jobId, seriesId } = input;

  // Update foundation status to running
  await updateJobServer(jobId, {
    foundation_status: 'running',
    status: 'running',
    started_at: new Date().toISOString(),
  });

  try {
    const job = await getPipelineJobWithStepsServer(jobId);

    // Load configs
    const [photographerConfig, directorConfig, productionConfig] = await Promise.all([
      job.photographer_config_id
        ? getPhotographerConfigByIdServer(job.photographer_config_id)
        : Promise.resolve(null),
      job.director_config_id
        ? getDirectorConfigByIdServer(job.director_config_id)
        : Promise.resolve(null),
      job.production_config_id
        ? getProductionConfigByIdServer(job.production_config_id)
        : Promise.resolve(null),
    ]);

    const context: PipelineContext = {
      photographerConfig,
      directorConfig,
      productionConfig,
      basePrompt: job.base_prompt,
      initialImages: job.initial_images || [],
      colors: job.colors || [],
      themes: job.themes || [],
      previousOutputs: [],
    };

    // Run 6-step inference pipeline to generate the final prompt
    const finalPrompt = await generateBaseImagePrompt(context, job, seriesId);
    console.log(`[Foundation] Final synthesized prompt (${finalPrompt.length} chars)`);

    // Store the synthesized prompt so users can see what the pipeline generated
    await updateJobServer(jobId, { synthesized_prompt: finalPrompt });

    // Generate N candidate base images using I2I (prompt + reference images)
    const numCandidates = job.num_base_images || 3;
    const supabase = await createClient();

    // Load reference images as base64 for I2I generation
    const referenceImageData = await loadReferenceImagesAsBase64(
      context.initialImages,
      supabase
    );

    for (let i = 0; i < numCandidates; i++) {
      console.log(`[Foundation] Generating base candidate ${i + 1}/${numCandidates}...`);

      // Use the job's foundation_model setting (defaults to gemini-3-pro-image)
      const generationModel: CogImageModel = (job.foundation_model as CogImageModel) || 'gemini-3-pro-image';

      const imageResult = await executeFoundationGenerate({
        prompt: finalPrompt,
        referenceImages: referenceImageData,
        model: generationModel,
        aspectRatio: (job.aspect_ratio as CogAspectRatio) || '1:1',
        seriesId,
        jobId,
        candidateIndex: i,
        supabase,
      });

      // Store candidate in cog_pipeline_base_candidates
      await createBaseCandidateServer({
        job_id: jobId,
        image_id: imageResult.imageId,
        candidate_index: i,
      });

      console.log(`[Foundation] Candidate ${i + 1} stored: ${imageResult.imageId}`);

      // Delay between candidates to avoid rate limits (especially Replicate/Flux)
      if (i < numCandidates - 1) {
        console.log(`[Foundation] Waiting 5s before next candidate...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Mark foundation phase complete — reset job status to draft so user
    // can review candidates, edit, or delete before starting sequence
    await updateJobServer(jobId, { foundation_status: 'completed', status: 'draft' });
    console.log(`[Foundation] Phase completed for job ${jobId}`);
  } catch (error) {
    console.error('[Foundation] Phase failed:', error);
    await updateJobServer(jobId, {
      foundation_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Foundation phase failed',
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE PHASE: Execute refinement pipeline steps on selected base image
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run the sequence phase of a pipeline job.
 *
 * Requires that a base image has been selected (selected_base_image_id).
 * Executes all pipeline steps on the selected base image in order.
 * Updates sequence_status and overall job status.
 */
export async function runSequence(input: { jobId: string; seriesId: string }): Promise<void> {
  const { jobId, seriesId } = input;
  const supabase = await createClient();

  const job = await getPipelineJobWithStepsServer(jobId);

  if (!job.selected_base_image_id) {
    throw new Error('No base image selected. Run foundation phase and select a base image first.');
  }

  // Update sequence status to running
  await updateJobServer(jobId, {
    sequence_status: 'running',
    status: 'running',
  });

  try {
    const context: PipelineContext = {
      photographerConfig: null, // Not needed for sequence phase
      directorConfig: null,
      productionConfig: null,
      basePrompt: job.base_prompt,
      initialImages: job.initial_images || [],
      colors: job.colors || [],
      themes: job.themes || [],
      previousOutputs: [job.selected_base_image_id], // Start from selected base
    };

    // Execute pipeline steps on the selected base image
    const steps = job.steps.sort((a, b) => a.step_order - b.step_order);

    if (steps.length === 0) {
      console.log(`[Sequence] No pipeline steps to execute for job ${jobId}`);
    }

    for (const step of steps) {
      // Check for cancellation
      const currentJob = await getJobByIdServer(jobId);
      if (currentJob.status === 'cancelled') {
        console.log(`[Sequence] Job ${jobId} cancelled, stopping pipeline`);
        break;
      }

      // Update step status to 'running'
      await (supabase as any)
        .from('cog_pipeline_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', step.id);

      try {
        const output = await executeStep(step, context, seriesId, jobId, supabase);

        // Store output
        await createPipelineStepOutputServer({
          step_id: step.id,
          image_id: output.imageId,
          metadata: output.metadata,
        });

        // Update context for next step
        context.previousOutputs.push(output.imageId);

        // Mark step complete
        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        // Auto-advance delay (4 seconds)
        await new Promise((resolve) => setTimeout(resolve, 4000));
      } catch (error) {
        // Mark step as failed
        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        throw error;
      }
    }

    // Mark sequence phase and overall job complete
    await updateJobServer(jobId, {
      sequence_status: 'completed',
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    console.log(`[Sequence] Phase completed for job ${jobId}`);
  } catch (error) {
    console.error('[Sequence] Phase failed:', error);
    await updateJobServer(jobId, {
      sequence_status: 'failed',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Sequence phase failed',
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY FROM STEP: Re-run pipeline from a specific step
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retry the pipeline from a specific step.
 *
 * Resets the target step and all subsequent steps to pending,
 * deletes their outputs, then re-runs the sequence from that point.
 */
export async function retryFromStep(input: {
  jobId: string;
  seriesId: string;
  stepId: string;
}): Promise<void> {
  const { jobId, seriesId, stepId } = input;
  const supabase = await createClient();

  const job = await getPipelineJobWithStepsServer(jobId);
  const steps = job.steps.sort((a, b) => a.step_order - b.step_order);

  // Find the target step index
  const targetIndex = steps.findIndex((s) => s.id === stepId);
  if (targetIndex === -1) {
    throw new Error(`Step ${stepId} not found in job ${jobId}`);
  }

  // Reset target step and all subsequent steps to pending
  const stepsToReset = steps.slice(targetIndex);
  for (const step of stepsToReset) {
    await (supabase as any)
      .from('cog_pipeline_steps')
      .update({
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('id', step.id);

    // Delete step outputs
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .eq('step_id', step.id);
  }

  // Update job status to running / sequence running
  await updateJobServer(jobId, {
    status: 'running',
    sequence_status: 'running',
    error_message: null,
    completed_at: null,
  });

  // Now run the sequence - it will skip completed steps and pick up from the reset point
  try {
    if (!job.selected_base_image_id) {
      throw new Error('No base image selected.');
    }

    const context: PipelineContext = {
      photographerConfig: null,
      directorConfig: null,
      productionConfig: null,
      basePrompt: job.base_prompt,
      initialImages: job.initial_images || [],
      colors: job.colors || [],
      themes: job.themes || [],
      previousOutputs: [job.selected_base_image_id],
    };

    // Re-fetch steps to get current state (some are completed, some are pending)
    const freshJob = await getPipelineJobWithStepsServer(jobId);
    const freshSteps = freshJob.steps.sort((a, b) => a.step_order - b.step_order);

    // Build context from completed steps
    for (const step of freshSteps) {
      if (step.status === 'completed' && step.output?.image_id) {
        context.previousOutputs.push(step.output.image_id);
      }
    }

    // Execute only pending steps
    for (const step of freshSteps) {
      if (step.status !== 'pending') continue;

      // Check for cancellation
      const currentJob = await getJobByIdServer(jobId);
      if (currentJob.status === 'cancelled') break;

      await (supabase as any)
        .from('cog_pipeline_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', step.id);

      try {
        const output = await executeStep(step, context, seriesId, jobId, supabase);

        await createPipelineStepOutputServer({
          step_id: step.id,
          image_id: output.imageId,
          metadata: output.metadata,
        });

        context.previousOutputs.push(output.imageId);

        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        await new Promise((resolve) => setTimeout(resolve, 4000));
      } catch (error) {
        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        throw error;
      }
    }

    await updateJobServer(jobId, {
      sequence_status: 'completed',
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[retryFromStep] Failed:', error);
    await updateJobServer(jobId, {
      sequence_status: 'failed',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Retry failed',
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7-STEP INFERENCE PIPELINE: Generate the final image prompt
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run the 7-step inference pipeline to generate a synthesized image prompt.
 *
 * Steps:
 *   1. Context translation (story + themes → accessible event-oriented briefing)
 *   2. Photographer concept generation
 *   3. Director briefing synthesis
 *   4. Production constraint integration
 *   5. Core creative intent refinement (WITH THINKING)
 *   6. Reference image vision analysis (skipped if no images)
 *   7. Final director vision synthesis (WITH THINKING)
 *
 * Falls back to the plain basePrompt if configs are not available.
 */
async function generateBaseImagePrompt(
  context: PipelineContext,
  job: CogPipelineJobWithSteps,
  seriesId: string
): Promise<string> {
  // If no configs, fall back to simple base prompt
  if (!context.photographerConfig || !context.directorConfig || !context.productionConfig) {
    console.log('[Inference] Missing configs, falling back to base prompt');
    return context.basePrompt;
  }

  const inferenceCtx: InferenceContext = {
    photographerConfig: context.photographerConfig,
    directorConfig: context.directorConfig,
    productionConfig: context.productionConfig,
    basePrompt: context.basePrompt,
    negativePrompt: (job.include_negative_prompt !== false && job.negative_prompt) ? job.negative_prompt : undefined,
    referenceImages: context.initialImages,
    colors: context.colors,
    themes: context.themes,
  };

  // Get job-level inference controls
  const inferenceModel = job.inference_model || 'gemini-2.0-flash';
  const maxRefImages = job.max_reference_images || 3;
  const stepConfigs = job.inference_step_configs;

  // Legacy fallback: use_thinking_infer4/infer6 fields when no step configs
  const legacyThinking4 = job.use_thinking_infer4 !== false;
  const legacyThinking6 = job.use_thinking_infer6 !== false;

  // Inference log: accumulate entries and persist after each step
  const inferenceLog: CogInferenceLogEntry[] = [];
  // Track latest substantive output for downstream steps when a step is skipped
  let latestOutput = context.basePrompt;

  async function persistLog() {
    await updateJobServer(job.id, { inference_log: inferenceLog });
  }

  function logSkipped(step: number, label: string) {
    inferenceLog.push({
      step,
      label,
      prompt: '',
      response: 'Skipped (disabled)',
      tokens_in: null,
      tokens_out: null,
      duration_ms: 0,
      thinking: false,
      skipped: true,
    });
  }

  // Resolve step config, with legacy fallback for thinking on steps 5 and 7
  function resolveStepConfig(step: number) {
    const config = getStepConfig(step, stepConfigs);
    // When no step overrides present, fall back to legacy thinking fields
    if (!stepConfigs) {
      if (step === 5) return { ...config, thinking: legacyThinking4 };
      if (step === 7) return { ...config, thinking: legacyThinking6 };
    }
    return config;
  }

  // Step 1: Context translation
  const cfg1 = resolveStepConfig(1);
  let resultCTText: string;
  if (!cfg1.enabled) {
    console.log('[Inference] Step 1: Skipped (disabled)');
    logSkipped(1, 'Context Translation');
    await persistLog();
    resultCTText = latestOutput;
  } else {
    console.log('[Inference] Step 1: Context translation...');
    const promptCT = buildContextTranslationPrompt(inferenceCtx);
    const resultCT = await callLLM(promptCT, { temperature: cfg1.temperature, maxTokens: cfg1.max_tokens, inferenceModel });
    resultCTText = resultCT.text;
    latestOutput = resultCTText;
    inferenceLog.push({
      step: 1, label: 'Context Translation', prompt: promptCT, response: resultCT.text,
      tokens_in: resultCT.tokens_in, tokens_out: resultCT.tokens_out,
      duration_ms: resultCT.duration_ms, thinking: false,
      temperature: cfg1.temperature, max_tokens: cfg1.max_tokens,
    });
    await persistLog();
    console.log(`[Inference] Step 1 complete (${resultCT.text.length} chars, ${resultCT.duration_ms}ms)`);
  }
  // Only set contextBriefing if step 1 actually ran — otherwise step 2
  // should work from the raw story + themes directly
  if (cfg1.enabled) {
    inferenceCtx.contextBriefing = resultCTText;
  }

  // Step 2: Photographer concept generation
  const cfg2 = resolveStepConfig(2);
  let result1Text: string;
  if (!cfg2.enabled) {
    console.log('[Inference] Step 2: Skipped (disabled)');
    logSkipped(2, 'Photographer Concept');
    await persistLog();
    result1Text = latestOutput;
  } else {
    console.log('[Inference] Step 2: Photographer concept generation...');
    const prompt1 = buildInference1Prompt(inferenceCtx);
    const result1 = await callLLM(prompt1, { temperature: cfg2.temperature, maxTokens: cfg2.max_tokens, inferenceModel });
    result1Text = result1.text;
    latestOutput = result1Text;
    inferenceLog.push({
      step: 2, label: 'Photographer Concept', prompt: prompt1, response: result1.text,
      tokens_in: result1.tokens_in, tokens_out: result1.tokens_out,
      duration_ms: result1.duration_ms, thinking: false,
      temperature: cfg2.temperature, max_tokens: cfg2.max_tokens,
    });
    await persistLog();
    console.log(`[Inference] Step 2 complete (${result1.text.length} chars, ${result1.duration_ms}ms)`);
  }

  // Step 3: Director briefing synthesis
  const cfg3 = resolveStepConfig(3);
  let result2Text: string;
  if (!cfg3.enabled) {
    console.log('[Inference] Step 3: Skipped (disabled)');
    logSkipped(3, 'Director Briefing');
    await persistLog();
    result2Text = latestOutput;
  } else {
    console.log('[Inference] Step 3: Director briefing synthesis...');
    const prompt2 = buildInference2Prompt(inferenceCtx, result1Text);
    const result2 = await callLLM(prompt2, { temperature: cfg3.temperature, maxTokens: cfg3.max_tokens, inferenceModel });
    result2Text = result2.text;
    latestOutput = result2Text;
    inferenceLog.push({
      step: 3, label: 'Director Briefing', prompt: prompt2, response: result2.text,
      tokens_in: result2.tokens_in, tokens_out: result2.tokens_out,
      duration_ms: result2.duration_ms, thinking: false,
      temperature: cfg3.temperature, max_tokens: cfg3.max_tokens,
    });
    await persistLog();
    console.log(`[Inference] Step 3 complete (${result2.text.length} chars, ${result2.duration_ms}ms)`);
  }

  // Step 4: Production constraint integration
  const cfg4 = resolveStepConfig(4);
  let result3Text: string;
  if (!cfg4.enabled) {
    console.log('[Inference] Step 4: Skipped (disabled)');
    logSkipped(4, 'Production Constraints');
    await persistLog();
    result3Text = latestOutput;
  } else {
    console.log('[Inference] Step 4: Production constraint integration...');
    const prompt3 = buildInference3Prompt(inferenceCtx, result1Text, result2Text);
    const result3 = await callLLM(prompt3, { temperature: cfg4.temperature, maxTokens: cfg4.max_tokens, inferenceModel });
    result3Text = result3.text;
    latestOutput = result3Text;
    inferenceLog.push({
      step: 4, label: 'Production Constraints', prompt: prompt3, response: result3.text,
      tokens_in: result3.tokens_in, tokens_out: result3.tokens_out,
      duration_ms: result3.duration_ms, thinking: false,
      temperature: cfg4.temperature, max_tokens: cfg4.max_tokens,
    });
    await persistLog();
    console.log(`[Inference] Step 4 complete (${result3.text.length} chars, ${result3.duration_ms}ms)`);
  }

  // Step 5: Core creative intent refinement
  const cfg5 = resolveStepConfig(5);
  let result4Text: string;
  if (!cfg5.enabled) {
    console.log('[Inference] Step 5: Skipped (disabled)');
    logSkipped(5, 'Creative Synthesis');
    await persistLog();
    result4Text = latestOutput;
  } else {
    console.log(`[Inference] Step 5: Core intent refinement (thinking=${cfg5.thinking})...`);
    const prompt4 = buildInference4Prompt(inferenceCtx, result3Text);
    const result4 = await callLLM(prompt4, { temperature: cfg5.temperature, maxTokens: cfg5.max_tokens, inferenceModel });
    result4Text = result4.text;
    latestOutput = result4Text;
    inferenceLog.push({
      step: 5, label: 'Creative Synthesis', prompt: prompt4, response: result4.text,
      tokens_in: result4.tokens_in, tokens_out: result4.tokens_out,
      duration_ms: result4.duration_ms, thinking: cfg5.thinking,
      temperature: cfg5.temperature, max_tokens: cfg5.max_tokens,
    });
    await persistLog();
    console.log(`[Inference] Step 5 complete (${result4.text.length} chars, ${result4.duration_ms}ms)`);
  }

  // Step 6: Reference image vision analysis
  const cfg6 = resolveStepConfig(6);
  const visionOutputs: string[] = [];
  if (!cfg6.enabled) {
    console.log('[Inference] Step 6: Skipped (disabled)');
    logSkipped(6, 'Vision Analysis');
    await persistLog();
  } else if (context.initialImages.length > 0) {
    const imagesToAnalyze = context.initialImages.slice(0, maxRefImages);
    console.log(`[Inference] Step 6: Vision analysis on ${imagesToAnalyze.length} reference images...`);
    const supabase = await createClient();
    const visionPrompt = buildVisionPrompt();

    for (let i = 0; i < imagesToAnalyze.length; i++) {
      const imageId = imagesToAnalyze[i];
      try {
        const image = await getImageByIdServer(imageId);
        const imageBase64 = await fetchImageAsBase64(image.storage_path, supabase);
        const visionResult = await callVisionLLM(visionPrompt, imageBase64, { temperature: cfg6.temperature, maxTokens: cfg6.max_tokens, inferenceModel });
        visionOutputs.push(visionResult.text);
        inferenceLog.push({
          step: 6, label: `Vision Analysis (image ${i + 1}/${imagesToAnalyze.length})`,
          prompt: visionPrompt, response: visionResult.text,
          tokens_in: visionResult.tokens_in, tokens_out: visionResult.tokens_out,
          duration_ms: visionResult.duration_ms, thinking: false,
          temperature: cfg6.temperature, max_tokens: cfg6.max_tokens,
        });
        await persistLog();
        console.log(`[Inference] Step 6: Analyzed image ${imageId} (${visionResult.text.length} chars, ${visionResult.duration_ms}ms)`);
      } catch (error) {
        console.warn(`[Inference] Step 6: Failed to analyze image ${imageId}:`, error);
        visionOutputs.push(`[Image ${imageId}: Analysis failed]`);
      }
    }
  } else {
    console.log('[Inference] Step 6: Skipped (no reference images)');
    inferenceLog.push({
      step: 6, label: 'Vision Analysis', prompt: '', response: 'Skipped (no reference images)',
      tokens_in: null, tokens_out: null, duration_ms: 0, thinking: false,
    });
    await persistLog();
  }

  // Step 7: Final director vision synthesis
  const cfg7 = resolveStepConfig(7);
  if (!cfg7.enabled) {
    console.log('[Inference] Step 7: Skipped (disabled) — using latest output as final prompt');
    logSkipped(7, 'Final Prompt Synthesis');
    await persistLog();
    return latestOutput;
  }

  console.log(`[Inference] Step 7: Final synthesis (thinking=${cfg7.thinking})...`);
  const prompt6 = buildInference6Prompt(inferenceCtx, result4Text, visionOutputs);
  const result6 = await callLLM(prompt6, { temperature: cfg7.temperature, maxTokens: cfg7.max_tokens, inferenceModel });
  inferenceLog.push({
    step: 7, label: 'Final Prompt Synthesis', prompt: prompt6, response: result6.text,
    tokens_in: result6.tokens_in, tokens_out: result6.tokens_out,
    duration_ms: result6.duration_ms, thinking: cfg7.thinking,
    temperature: cfg7.temperature, max_tokens: cfg7.max_tokens,
  });
  await persistLog();
  console.log(`[Inference] Step 7 complete (${result6.text.length} chars, ${result6.duration_ms}ms)`);

  return result6.text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM HELPER FUNCTIONS: Gemini API calls
// ═══════════════════════════════════════════════════════════════════════════════

interface LLMResult {
  text: string;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number;
}

/**
 * Call a Gemini model for text generation.
 *
 * Uses the Google Generative AI REST API directly (same pattern as
 * gemini-multimodal.ts) to support thinking-capable models.
 *
 * @param prompt - The prompt text
 * @param options - Temperature, maxTokens, and model configuration
 */
async function callLLM(
  prompt: string,
  options: { temperature: number; maxTokens: number; inferenceModel: string }
): Promise<LLMResult> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured for inference pipeline');
  }

  const requestBody: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.inferenceModel}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[callLLM] API error (${response.status}):`, errorText.slice(0, 300));
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini inference model');
  }

  const usageMetadata = result.usageMetadata;

  return {
    text: text.trim(),
    tokens_in: usageMetadata?.promptTokenCount ?? null,
    tokens_out: usageMetadata?.candidatesTokenCount ?? null,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Call a Gemini model for vision (image + text) analysis.
 *
 * @param prompt - The text prompt to accompany the image
 * @param imageBase64 - Base64-encoded image data
 * @param options - Temperature, maxTokens, and model configuration
 */
async function callVisionLLM(
  prompt: string,
  imageBase64: string,
  options: { temperature: number; maxTokens: number; inferenceModel: string }
): Promise<LLMResult> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured for vision analysis');
  }

  // Vision analysis uses a non-thinking model (fast analysis)
  const visionModel = 'gemini-2.0-flash';

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[callVisionLLM] API error (${response.status}):`, errorText.slice(0, 300));
    throw new Error(`Gemini Vision API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from Gemini vision model');
  }

  const usageMetadata = result.usageMetadata;

  return {
    text: text.trim(),
    tokens_in: usageMetadata?.promptTokenCount ?? null,
    tokens_out: usageMetadata?.candidatesTokenCount ?? null,
    duration_ms: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE LOADING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load reference images from storage as base64 strings.
 *
 * @param imageIds - Array of cog_images IDs to load
 * @param supabase - Supabase server client instance
 * @returns Array of base64-encoded image data
 */
async function loadReferenceImagesAsBase64(
  imageIds: string[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  const imageData: string[] = [];
  for (const imageId of imageIds) {
    try {
      const image = await getImageByIdServer(imageId);
      const base64 = await fetchImageAsBase64(image.storage_path, supabase);
      imageData.push(base64);
    } catch (error) {
      console.warn(`[loadReferenceImages] Failed to load image ${imageId}:`, error);
      // Skip failed images rather than failing the whole pipeline
    }
  }
  return imageData;
}

/**
 * Fetch an image from Supabase storage and return as base64.
 *
 * @param storagePath - The storage path within the cog-images bucket
 * @param supabase - Supabase server client instance
 * @returns Base64-encoded image data
 */
async function fetchImageAsBase64(
  storagePath: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: imageBlob, error: downloadError } = await supabase.storage
    .from('cog-images')
    .download(storagePath);

  if (downloadError) throw downloadError;
  if (!imageBlob) throw new Error(`No data returned for image at ${storagePath}`);

  const arrayBuffer = await imageBlob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOUNDATION IMAGE GENERATION: Generate a single base candidate image
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a single candidate base image for the foundation phase.
 * Supports I2I: passes reference images to the generation model.
 */
async function executeFoundationGenerate(params: {
  prompt: string;
  referenceImages: string[]; // base64-encoded reference image data
  model: CogImageModel;
  aspectRatio: CogAspectRatio;
  seriesId: string;
  jobId: string;
  candidateIndex: number;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  const { prompt, referenceImages, model, aspectRatio, seriesId, jobId, candidateIndex, supabase } = params;
  const imageSize: CogImageSize = '2K';

  const resolvedModel = selectImageModel(model, referenceImages.length > 0, referenceImages.length);

  let imageBase64: string;
  const generationMetadata: Record<string, unknown> = {
    model: resolvedModel,
    prompt,
    size: imageSize,
    aspectRatio,
    phase: 'foundation',
    candidateIndex,
  };

  // Build reference image objects for models that support them
  const refImageObjects = referenceImages.map((base64) => ({
    base64,
    mimeType: 'image/png',
  }));

  if (resolvedModel === 'gemini-3-pro-image' && isGemini3ProConfigured()) {
    const result = await generateImageWithGemini3Pro({
      prompt,
      referenceImages: refImageObjects.length > 0 ? refImageObjects : undefined,
      aspectRatio,
      imageSize,
      thinking: true,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'gemini-3-pro';
    if (result.thinkingChain) {
      generationMetadata.thinkingChain = result.thinkingChain;
    }
  } else if (
    (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') &&
    isFluxConfigured()
  ) {
    const fluxAspectRatio = mapAspectRatioToFlux(aspectRatio);
    const fluxResolution = mapSizeToFluxResolution(imageSize, resolvedModel);
    const result = await generateWithFlux({
      prompt,
      referenceImages: refImageObjects.length > 0 ? refImageObjects : undefined,
      model: resolvedModel,
      aspectRatio: fluxAspectRatio,
      resolution: fluxResolution,
    });
    imageBase64 = result.buffer.toString('base64');
    generationMetadata.provider = 'replicate-flux';
  } else if (resolvedModel === 'imagen-3-capability' && isVertexConfigured()) {
    const result = await generateImageWithVertex({
      prompt,
      referenceImages: refImageObjects.length > 0 ? refImageObjects : undefined,
      aspectRatio,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'vertex-imagen';
  } else {
    // Default to Imagen via Vercel AI SDK (no I2I support)
    const google = getGoogle();
    const { image } = await generateImage({
      model: google.image('imagen-3.0-generate-002'),
      prompt,
      aspectRatio,
    });
    imageBase64 = image.base64;
    generationMetadata.provider = 'google-imagen';
  }

  // Upload to storage
  const imageData = Buffer.from(imageBase64, 'base64');
  const filename = `pipeline-${jobId}-foundation-${candidateIndex}-${Date.now()}.png`;
  const storagePath = `${seriesId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, imageData, { contentType: 'image/png' });

  if (uploadError) throw uploadError;

  // Create image record
  const image = await createImageServer({
    series_id: seriesId,
    job_id: jobId,
    storage_path: storagePath,
    filename,
    mime_type: 'image/png',
    source: 'generated',
    prompt,
    metadata: generationMetadata,
  });

  return {
    imageId: image.id,
    metadata: generationMetadata,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP EXECUTORS: Used by both sequence phase and legacy pipeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a single pipeline step, dispatching by step type.
 */
async function executeStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  switch (step.step_type) {
    case 'generate':
      return executeGenerateStep(step, context, seriesId, jobId, supabase);
    case 'refine':
      return executeRefineStep(step, context, seriesId, jobId, supabase);
    case 'eval':
      return executeEvalStep(step, context, seriesId, jobId, supabase);
    case 'inpaint':
      return executeInpaintStep(step, context, seriesId, jobId, supabase);
    case 'upscale':
      return executeUpscaleStep(step, context, seriesId, jobId, supabase);
    default:
      throw new Error(`Unknown step type: ${step.step_type}`);
  }
}

/**
 * Execute a generate step - creates new image from prompt
 */
async function executeGenerateStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  // Build the full prompt
  let fullPrompt = context.basePrompt;

  // Add step-specific prompt if present
  const stepPrompt = step.config.prompt as string | undefined;
  if (stepPrompt) {
    fullPrompt = `${fullPrompt}\n\n${stepPrompt}`;
  }

  // Get model and settings from config
  const model = step.model as CogImageModel;
  const imageSize = (step.config.imageSize as CogImageSize) || '2K';
  const aspectRatio = (step.config.aspectRatio as CogAspectRatio) || '1:1';

  // Determine which image generation service to use
  const resolvedModel = selectImageModel(model, false, 0);

  let imageBase64: string;
  const generationMetadata: Record<string, unknown> = {
    model: resolvedModel,
    prompt: fullPrompt,
    size: imageSize,
    aspectRatio,
  };

  // Generate image based on model
  if (resolvedModel === 'gemini-3-pro-image' && isGemini3ProConfigured()) {
    const result = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      aspectRatio,
      imageSize,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'gemini-3-pro';
  } else if (
    (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') &&
    isFluxConfigured()
  ) {
    const fluxAspectRatio = mapAspectRatioToFlux(aspectRatio);
    const fluxResolution = mapSizeToFluxResolution(imageSize, resolvedModel);
    const result = await generateWithFlux({
      prompt: fullPrompt,
      model: resolvedModel,
      aspectRatio: fluxAspectRatio,
      resolution: fluxResolution,
    });
    imageBase64 = result.buffer.toString('base64');
    generationMetadata.provider = 'replicate-flux';
  } else if (resolvedModel === 'imagen-3-capability' && isVertexConfigured()) {
    const result = await generateImageWithVertex({
      prompt: fullPrompt,
      aspectRatio,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'vertex-imagen';
  } else {
    // Default to Imagen 4
    const google = getGoogle();
    const { image } = await generateImage({
      model: google.image('imagen-3.0-generate-002'),
      prompt: fullPrompt,
      aspectRatio,
    });
    imageBase64 = image.base64;
    generationMetadata.provider = 'google-imagen';
  }

  // Convert base64 to buffer
  const imageData = Buffer.from(imageBase64, 'base64');
  const filename = `pipeline-${jobId}-step-${step.step_order}-${Date.now()}.png`;
  const storagePath = `${seriesId}/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, imageData, {
      contentType: 'image/png',
    });

  if (uploadError) throw uploadError;

  // Create image record
  const image = await createImageServer({
    series_id: seriesId,
    job_id: jobId,
    storage_path: storagePath,
    filename,
    mime_type: 'image/png',
    source: 'generated',
    prompt: fullPrompt,
    metadata: generationMetadata,
  });

  return {
    imageId: image.id,
    metadata: generationMetadata,
  };
}

/**
 * Execute a refine step - modifies previous output using it as reference
 */
async function executeRefineStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  // Get the most recent output image
  if (context.previousOutputs.length === 0) {
    throw new Error('Refine step requires a previous output image');
  }

  const previousImageId = context.previousOutputs[context.previousOutputs.length - 1];

  // Fetch the previous image from storage
  const { data: previousImage } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', previousImageId)
    .single();

  if (!previousImage) {
    throw new Error(`Previous image ${previousImageId} not found`);
  }

  // Download image from storage
  const { data: imageBlob, error: downloadError } = await supabase.storage
    .from('cog-images')
    .download(previousImage.storage_path);

  if (downloadError) throw downloadError;

  // Convert to base64
  const arrayBuffer = await imageBlob.arrayBuffer();
  const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

  // Build refinement prompt
  let fullPrompt = context.basePrompt;

  const refinementPrompt = step.config.refinementPrompt as string;
  if (refinementPrompt) {
    fullPrompt = `${fullPrompt}\n\nRefinement instructions: ${refinementPrompt}`;
  }

  // Get settings
  const model = step.model as CogImageModel;
  const imageSize = (step.config.imageSize as CogImageSize) || '2K';
  const aspectRatio = (step.config.aspectRatio as CogAspectRatio) || '1:1';

  // Generate refined image using reference
  const resolvedModel = selectImageModel(model, true, 1);
  let imageResult: string;
  const generationMetadata: Record<string, unknown> = {
    model: resolvedModel,
    prompt: fullPrompt,
    size: imageSize,
    aspectRatio,
    refinedFrom: previousImageId,
  };

  // Use models that support reference images
  if (resolvedModel === 'gemini-3-pro-image' && isGemini3ProConfigured()) {
    const result = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      aspectRatio,
      imageSize,
    });
    imageResult = result.base64;
    generationMetadata.provider = 'gemini-3-pro';
  } else if (
    (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') &&
    isFluxConfigured()
  ) {
    const fluxAspectRatio = mapAspectRatioToFlux(aspectRatio);
    const fluxResolution = mapSizeToFluxResolution(imageSize, resolvedModel);
    const result = await generateWithFlux({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      model: resolvedModel,
      aspectRatio: fluxAspectRatio,
      resolution: fluxResolution,
    });
    imageResult = result.buffer.toString('base64');
    generationMetadata.provider = 'replicate-flux';
  } else if (resolvedModel === 'imagen-3-capability' && isVertexConfigured()) {
    const result = await generateImageWithVertex({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      aspectRatio,
    });
    imageResult = result.base64;
    generationMetadata.provider = 'vertex-imagen';
  } else {
    throw new Error('Refine step requires a model that supports reference images (Gemini 3 Pro, Flux, or Imagen 3)');
  }

  // Store refined image
  const imageData = Buffer.from(imageResult, 'base64');
  const filename = `pipeline-${jobId}-step-${step.step_order}-${Date.now()}.png`;
  const storagePath = `${seriesId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, imageData, { contentType: 'image/png' });

  if (uploadError) throw uploadError;

  const image = await createImageServer({
    series_id: seriesId,
    job_id: jobId,
    parent_image_id: previousImageId,
    storage_path: storagePath,
    filename,
    mime_type: 'image/png',
    source: 'generated',
    prompt: fullPrompt,
    metadata: generationMetadata,
  });

  return {
    imageId: image.id,
    metadata: generationMetadata,
  };
}

/**
 * Execute an eval step - evaluates previous outputs and selects winner
 */
async function executeEvalStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  if (context.previousOutputs.length === 0) {
    throw new Error('Eval step requires at least one previous output');
  }

  const candidateIds = context.previousOutputs.slice(-3); // Evaluate last 3 outputs
  const evalCriteria = (step.config.evalCriteria as string) || 'overall quality and adherence to prompt';

  // Fetch candidate images
  const { data: candidates } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .in('id', candidateIds);

  if (!candidates || candidates.length === 0) {
    throw new Error('No candidate images found for evaluation');
  }

  // Download and score each candidate
  const scores: { imageId: string; score: number; reasoning: string }[] = [];

  for (const candidate of candidates) {
    // Download image
    const { data: imageBlob } = await supabase.storage
      .from('cog-images')
      .download(candidate.storage_path);

    if (!imageBlob) continue;

    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    // Use LLM to evaluate
    const evalModel = getModel('gemini-flash');
    const result = await generateText({
      model: evalModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:image/png;base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: `Evaluate this image based on the following criteria: ${evalCriteria}\n\nProvide a score from 1-10 and brief reasoning. Format: SCORE: X\nREASONING: ...`,
            },
          ],
        },
      ],
    });

    // Parse score
    const scoreMatch = result.text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    const reasoning = result.text.replace(/SCORE:\s*\d+/i, '').trim();

    scores.push({
      imageId: candidate.id,
      score,
      reasoning,
    });
  }

  // Select winner (highest score)
  const winner = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return {
    imageId: winner.imageId,
    metadata: {
      evalCriteria,
      scores,
      winner: winner.imageId,
    },
  };
}

/**
 * Execute an inpaint step - applies mask and fills region
 */
async function executeInpaintStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  if (context.previousOutputs.length === 0) {
    throw new Error('Inpaint step requires a previous output image');
  }

  throw new Error(
    'Inpaint step requires inpainting API integration (e.g., Vertex Imagen EditImage). ' +
    'This feature is not yet implemented. ' +
    'As a workaround, use the Refine step with detailed instructions about what to change.'
  );
}

/**
 * Execute an upscale step - increases image resolution
 */
async function executeUpscaleStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: Record<string, unknown> }> {
  if (context.previousOutputs.length === 0) {
    throw new Error('Upscale step requires a previous output image');
  }

  throw new Error(
    'Upscale step requires upscaling API integration (e.g., Replicate Real-ESRGAN). ' +
    'This feature is not yet implemented. ' +
    'As a workaround, use image size settings in Generate or Refine steps to control resolution.'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL SELECTION AND MAPPING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select image model (simplified for pipeline)
 */
function selectImageModel(
  jobModel: CogImageModel,
  hasReferenceImages: boolean,
  referenceCount: number = 0
): 'imagen-4' | 'imagen-3-capability' | 'gemini-3-pro-image' | 'flux-2-pro' | 'flux-2-dev' {
  if (jobModel !== 'auto') {
    return jobModel;
  }

  // For pipeline, default to Flux or Gemini if available
  if (isFluxConfigured()) {
    return 'flux-2-dev';
  }

  if (isGemini3ProConfigured()) {
    return 'gemini-3-pro-image';
  }

  return 'imagen-4';
}

/**
 * Map aspect ratio to Flux format
 */
function mapAspectRatioToFlux(ratio: CogAspectRatio): FluxAspectRatio {
  const supported: FluxAspectRatio[] = [
    '1:1',
    '16:9',
    '3:2',
    '2:3',
    '4:5',
    '5:4',
    '9:16',
    '3:4',
    '4:3',
    '21:9',
  ];
  if (supported.includes(ratio as FluxAspectRatio)) {
    return ratio as FluxAspectRatio;
  }
  return '1:1';
}

/**
 * Map size to Flux resolution
 */
function mapSizeToFluxResolution(
  size: CogImageSize,
  model: 'flux-2-pro' | 'flux-2-dev'
): FluxResolution {
  const maxRes = model === 'flux-2-pro' ? 4 : 2;

  switch (size) {
    case '1K':
      return '1';
    case '2K':
      return '2';
    case '4K':
      return maxRes === 4 ? '4' : '2';
    default:
      return '1';
  }
}
