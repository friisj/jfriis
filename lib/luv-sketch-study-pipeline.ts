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

// Style prefix locked for all sketch generations
const SKETCH_STYLE_PREFIX = `Detailed pencil sketch, anatomical study drawing, graphite on white paper, fine hatching and cross-hatching, technical illustration quality, proportional figure drawing, clean linework with subtle shading, art school life drawing study style.`;

export interface SketchStudyInput {
  /** What to draw — the subject description */
  subject: string;
  /** Focus type: assembly (full body/region), detail (close-up), dynamics (motion/gesture) */
  focus: 'assembly' | 'detail' | 'dynamics';
  /** Chassis module slugs relevant to this sketch */
  moduleSlugs?: string[];
  /** Aspect ratio */
  aspectRatio?: FluxAspectRatio;
  /** Guidance scale (how strictly to follow prompt). Default: 3.5 */
  guidanceScale?: number;
  /** Inference steps (quality vs speed). Default: 28 */
  steps?: number;
  /** Existing sketch ID to use as i2i input for refinement */
  referenceSketchId?: string;
  /** Additional exemplar sketch IDs for style consistency */
  exemplarIds?: string[];
}

export interface SketchStudyResult {
  imageUrl: string;
  cogImageId: string;
  storagePath: string;
  prompt: string;
  durationMs: number;
  referenceUsed: boolean;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Compose the full prompt with style lock + focus modifiers.
 */
function composeSketchPrompt(input: SketchStudyInput): string {
  const focusModifiers: Record<string, string> = {
    assembly: 'Full figure or regional anatomy study, showing structural relationships between body parts.',
    detail: 'Close-up anatomical detail study, emphasis on form, proportion, and surface quality.',
    dynamics: 'Dynamic gesture drawing, capturing movement, weight, and energy. Loose but intentional lines.',
  };

  const parts = [
    SKETCH_STYLE_PREFIX,
    focusModifiers[input.focus] ?? '',
    `Subject: ${input.subject}`,
    'Character: young woman, delicate refined features, natural beauty.',
  ];

  return parts.filter(Boolean).join(' ');
}

/**
 * Run the sketch study pipeline.
 */
export async function runSketchStudyPipeline(
  input: SketchStudyInput
): Promise<SketchStudyResult> {
  const startTime = Date.now();

  const prompt = composeSketchPrompt(input);

  // Resolve reference images for i2i conditioning
  const referenceImages: { base64: string; mimeType: string }[] = [];

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
      }
    } catch (err) {
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

  console.log('[sketch-study] Generating:', {
    focus: input.focus,
    subject: input.subject.slice(0, 80),
    references: referenceImages.length,
    aspectRatio: input.aspectRatio ?? '3:4',
  });

  // Generate via Flux 2 Dev
  const fluxResult = await generateWithFlux({
    prompt,
    referenceImages,
    aspectRatio: input.aspectRatio ?? '3:4',
    resolution: '2',
    model: 'flux-2-dev',
    guidanceScale: input.guidanceScale ?? 3.5,
    numInferenceSteps: input.steps ?? 28,
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
      guidanceScale: input.guidanceScale ?? 3.5,
      steps: input.steps ?? 28,
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
  };
}
