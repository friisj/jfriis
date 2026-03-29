/**
 * Luv: Sketch Study Tool Definitions
 *
 * Agent tools for generating pencil sketch studies of chassis anatomy
 * via Flux 2 Dev. Style-locked to graphite/pencil aesthetic.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { runSketchStudyPipeline } from './luv-sketch-study-pipeline';
import { getCogImageUrl } from './cog/images';
import { resolveImageAsBase64 } from './luv-image-utils';

export const runSketchStudy = tool({
  description:
    'Generate a pencil/graphite drawing using Flux 2 Dev. The medium is locked (pencil on paper) ' +
    'but you control the drawing approach entirely through subject and styleNotes. ' +
    'IMPORTANT: Always compose styleNotes with specific rendering direction for each sketch — ' +
    'e.g. "loose gestural lines, emphasis on weight distribution" or "precise contour drawing, ' +
    'minimal shading, clean outlines." Keep subject descriptions simple and focused — over-specifying ' +
    'anatomy terms causes hallucinated structures. Let the model interpret form naturally. ' +
    'Use referenceSketchId for i2i refinement of an existing image (any Cog image ID works). ' +
    'Use exemplarIds for style consistency — call list_sketches first to get real IDs. ' +
    'After generation, critically evaluate the result before presenting — flag anatomical errors honestly.',
  inputSchema: zodSchema(
    z.object({
      subject: z
        .string()
        .describe('What to draw — keep it simple and focused. Overly specific anatomy terms cause hallucinations. Good: "posterior view, natural standing pose". Bad: "posterior showing sacral dimples, iliac crest, and gluteal fold"'),
      focus: z
        .enum(['assembly', 'detail', 'dynamics'])
        .describe('assembly = full body/region, detail = close-up, dynamics = movement/gesture'),
      styleNotes: z
        .string()
        .optional()
        .describe('ALWAYS provide this. Drawing approach layered on the pencil base — e.g. "loose gestural lines", "precise contour drawing", "fashion illustration silhouette", "architectural geometric breakdown", "minimal line art". This is your creative control over how the sketch looks.'),
      moduleSlugs: z
        .array(z.string())
        .optional()
        .describe('Chassis module slugs for tagging (e.g. ["eyes", "nose"])'),
      aspectRatio: z
        .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'])
        .optional()
        .describe('Aspect ratio (default: 3:4 portrait)'),
      guidanceScale: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Prompt adherence (1=loose, 10=strict, default: 3.5)'),
      steps: z
        .number()
        .int()
        .min(10)
        .max(50)
        .optional()
        .describe('Quality/speed tradeoff (default: 28)'),
      referenceSketchId: z
        .string()
        .optional()
        .describe('Any Cog image ID for i2i refinement — generates a new version conditioned on this image. Can be a sketch, photo, study, or any image from any Luv series.'),
      exemplarIds: z
        .array(z.string())
        .max(4)
        .optional()
        .describe('Up to 4 Cog image IDs as style exemplars. IMPORTANT: use real IDs from list_sketches or fetch_series_images — do not fabricate UUIDs.'),
    })
  ),
  execute: async ({ subject, focus, styleNotes, moduleSlugs, aspectRatio, guidanceScale, steps, referenceSketchId, exemplarIds }) => {
    try {
      const result = await runSketchStudyPipeline({
        subject,
        focus,
        moduleSlugs,
        aspectRatio: aspectRatio as import('./ai/replicate-flux').FluxAspectRatio | undefined,
        guidanceScale,
        steps,
        styleNotes,
        referenceSketchId,
        exemplarIds,
      });

      return {
        type: 'sketch_study_result' as const,
        success: true,
        imageUrl: result.imageUrl,
        cogImageId: result.cogImageId,
        prompt: result.prompt,
        durationMs: result.durationMs,
        referenceUsed: result.referenceUsed,
        moduleSlugs: moduleSlugs ?? [],
        focus,
      };
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Sketch study failed';
      console.error('[sketch-study] Tool execution failed:', message);
      return {
        type: 'sketch_study_result' as const,
        success: false,
        error: message,
      };
    }
  },
  toModelOutput: async ({ output }) => {
    const result = output as { success?: boolean; imageUrl?: string; prompt?: string; cogImageId?: string; error?: string };
    if (!result.success || !result.imageUrl) {
      return { type: 'text' as const, value: result.error ?? JSON.stringify(output) };
    }

    // Resolve the generated image so the agent can actually see what was produced
    try {
      // Extract storage path from the cog image URL
      const urlParts = result.imageUrl.split('/cog-images/');
      const storagePath = urlParts[1] ?? '';
      const { base64, mediaType } = await resolveImageAsBase64(storagePath);
      return {
        type: 'content' as const,
        value: [
          { type: 'text' as const, text: `Sketch generated (${result.cogImageId}). Examine the image critically before presenting — flag any anatomical errors, hallucinated structures, or artifacts honestly.` },
          { type: 'file-data' as const, data: base64, mediaType },
        ],
      };
    } catch {
      return { type: 'text' as const, value: `Sketch generated but could not load for review. Image URL: ${result.imageUrl}` };
    }
  },
});

export const listSketches = tool({
  description:
    'List recent sketch studies from the Luv Sketches series. Returns image IDs, URLs, and metadata. ' +
    'Use this to find exemplar sketches for style consistency or to select a sketch for i2i refinement.',
  inputSchema: zodSchema(
    z.object({
      moduleSlugs: z
        .array(z.string())
        .optional()
        .describe('Filter by module tags (e.g. ["eyes"])'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Max results (default: 10)'),
    })
  ),
  execute: async ({ moduleSlugs, limit }) => {
    const { createClient } = await import('./supabase-server');
    const { getLuvSeriesServer } = await import('./luv/cog-integration-server');

    const seriesId = await getLuvSeriesServer('sketches');
    if (!seriesId) return { sketches: [], total: 0 };

    const client = await createClient();

    // Get all images in sketches series
    let query = (client as any)
      .from('cog_images')
      .select('id, storage_path, filename, prompt, metadata, created_at')
      .eq('series_id', seriesId)
      .order('created_at', { ascending: false })
      .limit(limit ?? 10);

    const { data: images } = await query;
    if (!images || images.length === 0) return { sketches: [], total: 0 };

    // Filter by module tags if requested
    let filteredImages = images;
    if (moduleSlugs?.length) {
      const { data: tags } = await (client as any)
        .from('cog_tags')
        .select('id, name')
        .in('name', moduleSlugs);

      if (tags?.length) {
        const tagIds = tags.map((t: { id: string }) => t.id);
        const { data: taggedRows } = await (client as any)
          .from('cog_image_tags')
          .select('image_id')
          .in('tag_id', tagIds);

        const taggedIds = new Set((taggedRows ?? []).map((r: { image_id: string }) => r.image_id));
        filteredImages = images.filter((img: { id: string }) => taggedIds.has(img.id));
      }
    }

    return {
      sketches: filteredImages.map((img: { id: string; storage_path: string; filename: string; prompt: string; metadata: Record<string, unknown>; created_at: string }) => ({
        id: img.id,
        url: getCogImageUrl(img.storage_path),
        filename: img.filename,
        focus: (img.metadata as Record<string, unknown>)?.focus ?? 'unknown',
        subject: (img.metadata as Record<string, unknown>)?.subject ?? '',
        moduleSlugs: (img.metadata as Record<string, unknown>)?.moduleSlugs ?? [],
        createdAt: img.created_at,
      })),
      total: filteredImages.length,
    };
  },
});
