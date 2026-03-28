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

export const runSketchStudy = tool({
  description:
    'Generate a pencil sketch study of Luv\'s anatomy using Flux 2 Dev. ' +
    'Style is locked to graphite/pencil drawing — you control the subject, focus type, and composition. ' +
    'Use "assembly" for full-body or regional anatomy, "detail" for close-ups of features, ' +
    '"dynamics" for gesture/motion studies. Optionally pass referenceSketchId to refine an existing sketch ' +
    'via i2i conditioning, or exemplarIds for style consistency with previous sketches.',
  inputSchema: zodSchema(
    z.object({
      subject: z
        .string()
        .describe('What to draw — specific anatomical subject and composition (e.g. "3/4 view of face emphasizing cheekbones and jawline", "hands in a relaxed gesture")'),
      focus: z
        .enum(['assembly', 'detail', 'dynamics'])
        .describe('assembly = full body/region showing structure, detail = close-up of features, dynamics = movement/gesture'),
      moduleSlugs: z
        .array(z.string())
        .optional()
        .describe('Chassis module slugs relevant to this sketch (e.g. ["eyes", "nose"] for face detail)'),
      aspectRatio: z
        .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'])
        .optional()
        .describe('Aspect ratio (default: 3:4 portrait)'),
      guidanceScale: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('How strictly to follow the prompt (1=loose, 10=strict, default: 3.5)'),
      steps: z
        .number()
        .int()
        .min(10)
        .max(50)
        .optional()
        .describe('Inference steps — higher = better quality but slower (default: 28)'),
      referenceSketchId: z
        .string()
        .optional()
        .describe('Existing sketch image ID for i2i refinement — generates a refined version based on this sketch'),
      exemplarIds: z
        .array(z.string())
        .max(4)
        .optional()
        .describe('Up to 4 existing sketch IDs to use as style exemplars for consistency'),
    })
  ),
  execute: async ({ subject, focus, moduleSlugs, aspectRatio, guidanceScale, steps, referenceSketchId, exemplarIds }) => {
    try {
      const result = await runSketchStudyPipeline({
        subject,
        focus,
        moduleSlugs,
        aspectRatio: aspectRatio as import('./ai/replicate-flux').FluxAspectRatio | undefined,
        guidanceScale,
        steps,
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
