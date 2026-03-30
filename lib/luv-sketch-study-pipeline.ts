/**
 * Sketch Study Pipeline
 *
 * Generates pencil sketch studies of Luv's chassis anatomy via Flux 2 Dev.
 * Style-locked to graphite/pencil aesthetic. Supports i2i from existing
 * sketches for iterative refinement.
 *
 * Unlike chassis studies (which use multi-agent deliberation), sketch studies
 * are simpler: the agent composes a subject description, the pipeline
 * prepends a locked style prefix, and Flux generates the image.
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { generateWithFlux, type FluxAspectRatio } from './ai/replicate-flux';
import { createLuvCogImageServer } from './luv/cog-integration-server';
import { resolveImageAsBase64 } from './luv-image-utils';
import { getCogImageUrl } from './cog/images';

const COG_IMAGES_BUCKET = 'cog-images';

// Medium lock — pencil/graphite only. The drawing approach is agent-controlled via subject + styleNotes.
const SKETCH_STYLE_PREFIX = `Pencil sketch on paper, graphite drawing, traditional media.`;

export interface SketchStudyInput {
  /** What to draw — the subject description */
  subject: string;
  /** Focus type: assembly (full body/region), detail (close-up), dynamics (motion/gesture) */
  focus: 'assembly' | 'detail' | 'dynamics';
  /** Chassis module slugs relevant to this sketch */
  moduleSlugs?: string[];
  /** Aspect ratio */
  aspectRatio?: FluxAspectRatio;
  /** Existing image ID to use as i2i input for refinement */
  referenceSketchId?: string;
  /** Additional exemplar IDs for style consistency (max 3 — total including primary ref capped at 4 by Flux Dev) */
  exemplarIds?: string[];
  /** Agent-composed style direction layered on the pencil base */
  styleNotes?: string;
}

export interface SketchStudyResult {
  imageUrl: string;
  cogImageId: string;
  storagePath: string;
  prompt: string;
  durationMs: number;
  referenceUsed: boolean;
  /** Warnings surfaced to the agent (e.g. missing reference) */
  warnings?: string[];
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Compose the full prompt with style lock + focus modifiers.
 *
 * Flux 2 Dev has no strength slider for i2i — conditioning is entirely
 * prompt-driven. When reference images are provided, the prompt must
 * explicitly describe how to use them (e.g. "based on the reference image",
 * "maintaining the pose and proportions from the input").
 */
function composeSketchPrompt(input: SketchStudyInput, hasReferenceImages: boolean): string {
  const focusModifiers: Record<string, string> = {
    assembly: 'Full figure or regional view.',
    detail: 'Close-up detail.',
    dynamics: 'Dynamic gesture, capturing movement.',
  };

  const parts = [
    SKETCH_STYLE_PREFIX,
    focusModifiers[input.focus] ?? '',
    input.styleNotes ? `Style: ${input.styleNotes}` : '',
    `Subject: ${input.subject}`,
    'Character: young woman, delicate refined features, natural beauty.',
  ];

  // Flux 2 Dev i2i is prompt-driven — explicitly reference input images
  if (hasReferenceImages) {
    parts.push(
      'Based on the provided reference image(s), maintain the subject\'s pose, proportions, and key features while rendering in the specified pencil sketch style.'
    );
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Run the sketch study pipeline.
 */
export async function runSketchStudyPipeline(
  input: SketchStudyInput
): Promise<SketchStudyResult> {
  const startTime = Date.now();

  // Resolve reference images for i2i conditioning
  const referenceImages: { base64: string; mimeType: string }[] = [];
  const warnings: string[] = [];

  // Primary reference (for i2i refinement)
  if (input.referenceSketchId) {
    try {
      const client = serviceClient();
      const { data: refImg } = await (client as any)
        .from('cog_images')
        .select('storage_path')
        .eq('id', input.referenceSketchId)
        .maybeSingle();

      if (refImg) {
        const { base64, mediaType } = await resolveImageAsBase64(refImg.storage_path);
        referenceImages.push({ base64, mimeType: mediaType });
      } else {
        warnings.push(`Reference image ${input.referenceSketchId} not found in cog_images — generating without i2i conditioning. Use a real Cog image ID from list_sketches or fetch_series_images.`);
        console.warn(`[sketch-study] referenceSketchId ${input.referenceSketchId} not found in cog_images`);
      }
    } catch (err) {
      warnings.push(`Failed to load reference image: ${err instanceof Error ? err.message : 'unknown error'}`);
      console.warn('[sketch-study] Failed to load reference sketch:', err);
    }
  }

  // Exemplar sketches for style consistency
  if (input.exemplarIds?.length) {
    const client = serviceClient();
    const { data: exemplars } = await (client as any)
      .from('cog_images')
      .select('storage_path')
      .in('id', input.exemplarIds.slice(0, 4));

    if (exemplars) {
      const settled = await Promise.allSettled(
        exemplars.map((e: { storage_path: string }) => resolveImageAsBase64(e.storage_path))
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          referenceImages.push({ base64: result.value.base64, mimeType: result.value.mediaType });
        }
      }
    }
  }

  // Compose prompt after reference resolution — prompt must reference
  // input images for Flux 2 Dev i2i conditioning to work
  const prompt = composeSketchPrompt(input, referenceImages.length > 0);

  console.log('[sketch-study] Generating:', {
    focus: input.focus,
    subject: input.subject.slice(0, 80),
    references: referenceImages.length,
    aspectRatio: input.aspectRatio ?? '3:4',
    prompt: prompt.slice(0, 120),
  });

  // Generate via Flux 2 Dev
  // Note: Dev only supports prompt, input_images, aspect_ratio, seed,
  // output_format, go_fast, disable_safety_checker. No guidance_scale
  // or num_inference_steps (those are Pro-only).
  const fluxResult = await generateWithFlux({
    prompt,
    referenceImages,
    aspectRatio: input.aspectRatio ?? '3:4',
    model: 'flux-2-dev',
  });

  // Upload to storage
  const storagePath = `luv/sketches/${Date.now()}-${randomUUID()}.png`;
  const client = serviceClient();

  const { error: uploadError } = await client.storage
    .from(COG_IMAGES_BUCKET)
    .upload(storagePath, fluxResult.buffer, { contentType: 'image/png', upsert: false });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  // Record in cog_images with module tags
  const cogImage = await createLuvCogImageServer({
    seriesKey: 'sketches',
    storagePath,
    filename: `sketch-${input.focus}-${Date.now()}.png`,
    mimeType: 'image/png',
    source: 'generated',
    prompt,
    moduleSlug: input.moduleSlugs?.[0],
    metadata: {
      type: 'sketch_study',
      focus: input.focus,
      subject: input.subject,
      moduleSlugs: input.moduleSlugs,
      model: 'flux-2-dev',
      referenceSketchId: input.referenceSketchId,
      exemplarIds: input.exemplarIds,
      durationMs: fluxResult.durationMs,
    },
  });

  // Tag with additional module slugs
  if (input.moduleSlugs && input.moduleSlugs.length > 1) {
    const { addTagToImageServer } = await import('./cog/server/tags');
    const { getModuleTagIdServer } = await import('./luv/cog-integration-server');
    for (const slug of input.moduleSlugs.slice(1)) {
      try {
        const tagId = await getModuleTagIdServer(slug);
        await addTagToImageServer(cogImage.id, tagId);
      } catch {
        // Non-critical
      }
    }
  }

  const imageUrl = getCogImageUrl(storagePath);
  const durationMs = Date.now() - startTime;

  console.log('[sketch-study] Complete:', {
    cogImageId: cogImage.id,
    durationMs,
    references: referenceImages.length,
  });

  return {
    imageUrl,
    cogImageId: cogImage.id,
    storagePath,
    prompt,
    durationMs,
    referenceUsed: referenceImages.length > 0,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
