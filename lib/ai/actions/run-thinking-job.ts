'use server';

import { generateText } from 'ai';
import { getModel } from '../models';
import { generateImageWithGemini3Pro } from '../gemini-multimodal';
import {
  buildSubjectTranslationPrompt,
  buildCreativeDirectionPrompt,
  buildImageGenerationPrompt,
} from '../prompts/thinking';
import {
  updateThinkingJobServer,
  appendThinkingTraceServer,
  createImageServer,
} from '@/lib/cog-server';
import { createClient } from '@/lib/supabase-server';
import type { CogRemixTraceEntry } from '@/lib/types/cog';

function traceEntry(
  phase: string,
  step: string,
  detail: string,
  durationMs: number,
  tokens?: { tokensIn?: number; tokensOut?: number },
): CogRemixTraceEntry {
  return {
    phase,
    step,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    tokens_in: tokens?.tokensIn,
    tokens_out: tokens?.tokensOut,
    detail,
  };
}

/**
 * Run a thinking job: 3-step linear chain
 * 1. Subject Translation (thinking)
 * 2. Creative Direction (thinking)
 * 3. Image Generation
 */
export async function runThinkingJob(
  jobId: string,
  seriesId: string,
  story: string,
  photographer: string,
  publication: string,
  aspectRatio?: string | null,
  imageSize?: string | null,
  styleHints?: string | null,
): Promise<void> {
  // Mark running
  await updateThinkingJobServer(jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
    error_message: null,
    // Clear previous outputs in case of re-run
    derived_subject: null,
    subject_thinking: null,
    creative_direction: null,
    direction_thinking: null,
    generation_prompt: null,
    generated_image_id: null,
  });

  const thinkingModel = getModel('gemini-thinking');

  try {
    // ========================================================================
    // Step 1: Subject Translation
    // ========================================================================
    const step1Start = Date.now();
    const subjectPrompt = buildSubjectTranslationPrompt(story);

    const subjectResult = await generateText({
      model: thinkingModel,
      system: subjectPrompt.system,
      prompt: subjectPrompt.prompt,
    });

    const derivedSubject = subjectResult.text.trim();
    const subjectThinking = (subjectResult as any).reasoning?.text || null;
    const step1Duration = Date.now() - step1Start;

    await updateThinkingJobServer(jobId, {
      derived_subject: derivedSubject,
      subject_thinking: subjectThinking,
    });

    const step1Trace = traceEntry(
      'thinking',
      'subject_translation',
      `Derived subject: ${derivedSubject.slice(0, 200)}`,
      step1Duration,
      {
        tokensIn: subjectResult.usage?.inputTokens,
        tokensOut: subjectResult.usage?.outputTokens,
      },
    );
    await appendThinkingTraceServer(jobId, step1Trace);

    // ========================================================================
    // Step 2: Creative Direction
    // ========================================================================
    const step2Start = Date.now();
    const directionPrompt = buildCreativeDirectionPrompt({
      subject: derivedSubject,
      photographer,
      publication,
      styleHints,
    });

    const directionResult = await generateText({
      model: thinkingModel,
      system: directionPrompt.system,
      prompt: directionPrompt.prompt,
    });

    const creativeDirection = directionResult.text.trim();
    const directionThinking = (directionResult as any).reasoning?.text || null;
    const step2Duration = Date.now() - step2Start;

    await updateThinkingJobServer(jobId, {
      creative_direction: creativeDirection,
      direction_thinking: directionThinking,
    });

    const step2Trace = traceEntry(
      'thinking',
      'creative_direction',
      `Direction: ${creativeDirection.slice(0, 200)}`,
      step2Duration,
      {
        tokensIn: directionResult.usage?.inputTokens,
        tokensOut: directionResult.usage?.outputTokens,
      },
    );
    await appendThinkingTraceServer(jobId, step2Trace);

    // ========================================================================
    // Step 3: Image Generation
    // ========================================================================
    const step3Start = Date.now();
    const genPrompt = buildImageGenerationPrompt(creativeDirection);

    await updateThinkingJobServer(jobId, {
      generation_prompt: genPrompt,
    });

    const generated = await generateImageWithGemini3Pro({
      prompt: genPrompt,
      aspectRatio: (aspectRatio as any) || '1:1',
      imageSize: (imageSize as any) || '2K',
    });

    // Upload to Supabase storage
    const imageBuffer = Buffer.from(generated.base64, 'base64');
    const filename = `thinking-${jobId}-${Date.now()}.${generated.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`;
    const storagePath = `${seriesId}/${filename}`;

    const client = await createClient();
    const { error: uploadError } = await (client as any).storage
      .from('cog-images')
      .upload(storagePath, imageBuffer, {
        contentType: generated.mimeType,
        upsert: false,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Create cog_images record
    const imageRecord = await createImageServer({
      series_id: seriesId,
      storage_path: storagePath,
      filename,
      mime_type: generated.mimeType,
      source: 'generated',
      prompt: genPrompt,
      metadata: {
        thinking_job_id: jobId,
        photographer,
        publication,
      },
    });

    const step3Duration = Date.now() - step3Start;

    await updateThinkingJobServer(jobId, {
      generated_image_id: imageRecord.id,
    });

    const step3Trace = traceEntry(
      'thinking',
      'image_generation',
      `Generated image: ${imageRecord.id}`,
      step3Duration,
    );
    await appendThinkingTraceServer(jobId, step3Trace);

    // ========================================================================
    // Mark complete
    // ========================================================================
    await updateThinkingJobServer(jobId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Thinking job failed:', err);
    await updateThinkingJobServer(jobId, {
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    }).catch(() => {});
  }
}
