/**
 * Luv: Image Management Agent Tools
 *
 * Tools for Luv's agent to browse, organize, tag, and manage images
 * across cog series linked to Luv.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createClient } from './supabase-server';
import { getLuvSeriesServer } from './luv/cog-integration-server';
import { getSeriesImagesServer, getImageByIdServer, moveImageToSeriesServer, copyImageToSeriesServer } from './cog/server/images';
import { createSeriesServer, setSeriesPrimaryImageServer } from './cog/server/series';
import { addTagToImageServer, removeTagFromImageServer, getImageTagsServer } from './cog/server/tags';
import { resolveImageAsBase64 } from './luv-image-utils';

// ============================================================================
// Series browsing
// ============================================================================

export const listImageSeries = tool({
  description:
    'List all image series linked to Luv. Returns series names, IDs, and image counts.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const client = await createClient();

    // Discover Luv series via entity_links (not tag matching)
    const { data: links, error: linkError } = await (client as any)
      .from('entity_links')
      .select('source_id, target_id')
      .eq('source_type', 'luv')
      .eq('target_type', 'cog_series');

    if (linkError) return { error: linkError.message };

    const seriesIds = (links ?? []).map((l: { target_id: string }) => l.target_id);
    if (seriesIds.length === 0) return { series: [] };

    const { data: seriesData, error } = await (client as any)
      .from('cog_series')
      .select('id, title, description')
      .in('id', seriesIds)
      .order('title', { ascending: true });

    if (error) return { error: error.message };

    const series = seriesData ?? [];
    const { data: counts } = await (client as any)
      .from('cog_images')
      .select('series_id')
      .in('series_id', seriesIds);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.series_id, (countMap.get(row.series_id) ?? 0) + 1);
    }

    return {
      series: series.map((s: { id: string; title: string; description: string | null }) => ({
        id: s.id,
        title: s.title,
        imageCount: countMap.get(s.id) ?? 0,
      })),
    };
  },
});

export const fetchSeriesImages = tool({
  description:
    'Fetch images from a Luv series. Use seriesKey (e.g. "references", "generations", "module:face") or seriesId. Returns image metadata and renders up to 4 inline.',
  inputSchema: zodSchema(
    z.object({
      seriesKey: z.string().optional().describe('Series key like "references", "generations", "module:face"'),
      seriesId: z.string().optional().describe('Direct series UUID (alternative to seriesKey)'),
      limit: z.number().optional().default(10).describe('Max images to return (default 10)'),
    })
  ),
  execute: async ({ seriesKey, seriesId: directId, limit }) => {
    let resolvedId = directId;
    if (!resolvedId && seriesKey) {
      resolvedId = await getLuvSeriesServer(seriesKey);
    }
    if (!resolvedId) return { error: 'Provide either seriesKey or seriesId' };

    const images = await getSeriesImagesServer(resolvedId);
    const sliced = images.slice(0, limit ?? 10);

    return {
      seriesId: resolvedId,
      total: images.length,
      images: sliced.map((img) => ({
        id: img.id,
        filename: img.filename,
        prompt: img.prompt,
        storagePath: img.storage_path,
        seriesId: img.series_id,
        source: img.source,
        createdAt: img.created_at,
      })),
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; images?: Array<{ storagePath: string; filename: string }> };
    if (result.error || !result.images?.length) {
      return { type: 'text' as const, value: JSON.stringify(output) };
    }

    const toShow = result.images.slice(0, 4);
    const parts: Array<{ type: 'text'; text: string } | { type: 'file-data'; data: string; mediaType: string }> = [];

    for (const img of toShow) {
      try {
        const { base64, mediaType } = await resolveImageAsBase64(img.storagePath);
        parts.push({ type: 'text', text: `[${img.filename}]` });
        parts.push({ type: 'file-data', data: base64, mediaType });
      } catch {
        parts.push({ type: 'text', text: `[${img.filename} — could not load]` });
      }
    }

    if (result.images.length > 4) {
      parts.push({ type: 'text', text: `... and ${result.images.length - 4} more images` });
    }

    return { type: 'content' as const, value: parts };
  },
});

// ============================================================================
// Image organization
// ============================================================================

export const moveImage = tool({
  description:
    'Move an image to a different Luv series. Use targetSeriesKey (e.g. "module:face") or targetSeriesId.',
  inputSchema: zodSchema(
    z.object({
      imageId: z.string().describe('Image UUID to move'),
      targetSeriesKey: z.string().optional().describe('Target series key (e.g. "module:face", "references")'),
      targetSeriesId: z.string().optional().describe('Target series UUID (alternative to key)'),
    })
  ),
  execute: async ({ imageId, targetSeriesKey, targetSeriesId: directId }) => {
    let resolvedId = directId;
    if (!resolvedId && targetSeriesKey) {
      resolvedId = await getLuvSeriesServer(targetSeriesKey);
    }
    if (!resolvedId) return { error: 'Provide either targetSeriesKey or targetSeriesId' };

    const image = await moveImageToSeriesServer(imageId, resolvedId);
    return { success: true, imageId: image.id, newSeriesId: image.series_id };
  },
});

export const copyImage = tool({
  description:
    'Copy an image to a different Luv series (keeps original). Use targetSeriesKey or targetSeriesId.',
  inputSchema: zodSchema(
    z.object({
      imageId: z.string().describe('Image UUID to copy'),
      targetSeriesKey: z.string().optional().describe('Target series key'),
      targetSeriesId: z.string().optional().describe('Target series UUID'),
    })
  ),
  execute: async ({ imageId, targetSeriesKey, targetSeriesId: directId }) => {
    let resolvedId = directId;
    if (!resolvedId && targetSeriesKey) {
      resolvedId = await getLuvSeriesServer(targetSeriesKey);
    }
    if (!resolvedId) return { error: 'Provide either targetSeriesKey or targetSeriesId' };

    const newImage = await copyImageToSeriesServer(imageId, resolvedId);
    return { success: true, originalId: imageId, newImageId: newImage.id, newSeriesId: newImage.series_id };
  },
});

// ============================================================================
// Tagging
// ============================================================================

export const tagImage = tool({
  description:
    'Add or remove a tag from an image. Resolves tag by name.',
  inputSchema: zodSchema(
    z.object({
      imageId: z.string().describe('Image UUID'),
      tagName: z.string().describe('Tag name to add or remove'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
    })
  ),
  execute: async ({ imageId, tagName, action }) => {
    const client = await createClient();

    // Resolve tag by name
    const { data: tag, error: tagError } = await (client as any)
      .from('cog_tags')
      .select('id, name')
      .eq('name', tagName)
      .limit(1)
      .maybeSingle();

    if (tagError) return { error: tagError.message };
    if (!tag) return { error: `Tag "${tagName}" not found` };

    if (action === 'add') {
      await addTagToImageServer(imageId, tag.id);
    } else {
      await removeTagFromImageServer(imageId, tag.id);
    }

    const currentTags = await getImageTagsServer(imageId);
    return {
      success: true,
      action,
      tagName,
      currentTags: currentTags.map((t) => t.name),
    };
  },
});

// ============================================================================
// Series management
// ============================================================================

export const createImageSeries = tool({
  description:
    'Create a new image series for Luv. The series will be tagged with "luv" and appear in the media library.',
  inputSchema: zodSchema(
    z.object({
      name: z.string().describe('Display name for the series (without "Luv — " prefix)'),
      description: z.string().optional().describe('Optional description'),
    })
  ),
  execute: async ({ name, description }) => {
    const series = await createSeriesServer({
      title: `Luv — ${name}`,
      description: description ?? null,
      tags: ['luv'],
    });
    return { success: true, seriesId: series.id, title: series.title };
  },
});

export const setSeriesCover = tool({
  description:
    'Set an image as the cover/primary image for a Luv series.',
  inputSchema: zodSchema(
    z.object({
      imageId: z.string().describe('Image UUID to set as cover'),
      seriesKey: z.string().optional().describe('Series key (e.g. "references")'),
      seriesId: z.string().optional().describe('Series UUID (alternative to key)'),
    })
  ),
  execute: async ({ imageId, seriesKey, seriesId: directId }) => {
    let resolvedId = directId;
    if (!resolvedId && seriesKey) {
      resolvedId = await getLuvSeriesServer(seriesKey);
    }
    if (!resolvedId) return { error: 'Provide either seriesKey or seriesId' };

    await setSeriesPrimaryImageServer(resolvedId, imageId);
    return { success: true, seriesId: resolvedId, coverImageId: imageId };
  },
});

// ============================================================================
// Export bundle
// ============================================================================

export const luvImageMgmtTools = {
  list_image_series: listImageSeries,
  fetch_series_images: fetchSeriesImages,
  move_image: moveImage,
  copy_image: copyImage,
  tag_image: tagImage,
  create_image_series: createImageSeries,
  set_series_cover: setSeriesCover,
};
