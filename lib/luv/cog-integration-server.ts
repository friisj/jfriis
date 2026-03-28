/**
 * Luv ↔ Cog Image Service Integration (Server-side)
 *
 * Series association uses title + luv tag lookup on cog_series.
 * Module keys (module:face) resolve to the shared 'chassis' series.
 *
 * Series taxonomy:
 *   - "chassis"      → one series for all chassis module media (tags distinguish modules)
 *   - "generations"   → images generated via chat agent
 *   - "references"    → canonical reference images
 *   - "reviews"       → reinforcement review uploads
 */

import { createClient } from '../supabase-server';
import { createImageServer } from '../cog/server/images';
import { addTagToImageServer } from '../cog/server/tags';
import { generateThumbnails } from '../cog/thumbnails';
import type { CogImage } from '../types/cog';

const seriesCache = new Map<string, string>();

/**
 * Resolve a Luv series key to its cog_series ID via title + tag lookup.
 * Creates the series and link if they don't exist.
 *
 * Module keys (module:face, module:hair) all resolve to the 'chassis' series.
 */
export async function getLuvSeriesServer(key: string): Promise<string> {
  // Module keys all map to the chassis series
  const resolvedKey = key.startsWith('module:') ? 'chassis' : key;

  const cached = seriesCache.get(resolvedKey);
  if (cached) return cached;

  const client = await createClient();
  const title = luvSeriesTitle(resolvedKey);

  // Look up by title + luv tag
  const { data: existing } = await (client as any)
    .from('cog_series')
    .select('id')
    .eq('title', title)
    .contains('tags', ['luv'])
    .limit(1)
    .maybeSingle();

  let seriesId: string;

  if (existing) {
    seriesId = existing.id;
  } else {
    const { data: created, error } = await (client as any)
      .from('cog_series')
      .insert({
        title,
        description: luvSeriesDescription(resolvedKey),
        tags: ['luv', resolvedKey],
      })
      .select()
      .single();

    if (error) throw error;
    seriesId = created.id;
  }

  seriesCache.set(resolvedKey, seriesId);
  return seriesId;
}

/**
 * Resolve a chassis module slug to its tag ID.
 * Auto-provisions the tag and tag group if needed.
 */
export async function getModuleTagIdServer(moduleSlug: string): Promise<string> {
  const client = await createClient();

  // Check for existing tag
  const { data: existing } = await (client as any)
    .from('cog_tags')
    .select('id')
    .eq('name', moduleSlug)
    .is('series_id', null) // global tag
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  // Ensure "Chassis Module" tag group exists
  let groupId: string;
  const { data: group } = await (client as any)
    .from('cog_tag_groups')
    .select('id')
    .eq('name', 'Chassis Module')
    .limit(1)
    .maybeSingle();

  if (group) {
    groupId = group.id;
  } else {
    const { data: newGroup, error: groupError } = await (client as any)
      .from('cog_tag_groups')
      .insert({ name: 'Chassis Module', position: 0 })
      .select()
      .single();
    if (groupError) throw groupError;
    groupId = newGroup.id;
  }

  // Create the tag
  const { data: tag, error: tagError } = await (client as any)
    .from('cog_tags')
    .insert({ name: moduleSlug, group_id: groupId, position: 0 })
    .select()
    .single();

  if (tagError) throw tagError;

  // Enable tag for the chassis series
  const chassisSeriesId = await getLuvSeriesServer('chassis');
  await (client as any)
    .from('cog_series_tags')
    .insert({ series_id: chassisSeriesId, tag_id: tag.id, position: 0 })
    .select()
    .maybeSingle(); // ignore conflict

  return tag.id;
}

/**
 * Create a Luv image record in cog_images (server-side).
 * If moduleSlug is provided, auto-tags the image with the module tag.
 */
export async function createLuvCogImageServer(opts: {
  seriesKey: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  source: 'upload' | 'generated';
  prompt?: string;
  metadata?: Record<string, unknown>;
  moduleSlug?: string;
}): Promise<CogImage> {
  const seriesId = await getLuvSeriesServer(opts.seriesKey);

  const image = await createImageServer({
    series_id: seriesId,
    storage_path: opts.storagePath,
    filename: opts.filename,
    mime_type: opts.mimeType,
    source: opts.source,
    prompt: opts.prompt,
    metadata: opts.metadata ?? {},
  });

  // Auto-tag with module tag if applicable
  if (opts.moduleSlug) {
    const tagId = await getModuleTagIdServer(opts.moduleSlug);
    await addTagToImageServer(image.id, tagId).catch((err) =>
      console.error('[luv-cog-server] Auto-tag failed:', err)
    );
  }

  // Generate thumbnails in background
  generateThumbnails(image.id, image.storage_path).catch((err) =>
    console.error('[luv-cog-server] Thumbnail generation failed:', err)
  );

  return image;
}

// ---------------------------------------------------------------------------
// Series taxonomy
// ---------------------------------------------------------------------------

function luvSeriesTitle(key: string): string {
  if (key === 'chassis') return 'Luv — Chassis';
  if (key === 'references') return 'Luv — References';
  if (key === 'generations') return 'Luv — Generations';
  if (key === 'reviews') return 'Luv — Reviews';
  if (key === 'studies') return 'Luv — Studies';
  if (key === 'sketches') return 'Luv — Sketches';
  if (key.startsWith('scene:')) return `Luv — Scene: ${key.slice(6)}`;
  return `Luv — ${key}`;
}

function luvSeriesDescription(key: string): string {
  if (key === 'chassis') return 'Reference media for all chassis modules';
  if (key === 'references') return 'Canonical and reference images for Luv character consistency';
  if (key === 'generations') return 'Images generated by Luv agent during chat conversations';
  if (key === 'reviews') return 'Images uploaded for reinforcement review sessions';
  if (key === 'studies') return 'Images generated by chassis study pipeline explorations';
  if (key === 'sketches') return 'Pencil sketch studies of chassis anatomy — assemblies, details, dynamics';
  if (key.startsWith('scene:')) return `Generated images for stage scene: ${key.slice(6)}`;
  return '';
}
