import { createClient } from '../../supabase-server';
import type {
  CogTag,
  CogTagGroup,
  CogTagWithGroup,
  CogTagGroupWithTags,
  CogImage,
  CogImageWithTags,
  CogSeriesWithImagesAndTags,
} from '../../types/cog';

/**
 * Get all tag groups with their tags - server-side
 */
export async function getTagGroupsWithTagsServer(): Promise<CogTagGroupWithTags[]> {
  const client = await createClient();

  const [groupsResult, tagsResult] = await Promise.all([
    (client as any)
      .from('cog_tag_groups')
      .select('*')
      .order('position', { ascending: true }),
    (client as any)
      .from('cog_tags')
      .select('*')
      .is('series_id', null)  // Global tags only
      .order('position', { ascending: true }),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (tagsResult.error) throw tagsResult.error;

  const groups = groupsResult.data as CogTagGroup[];
  const tags = tagsResult.data as CogTag[];

  // Organize tags by group
  return groups.map((group) => ({
    ...group,
    tags: tags.filter((tag) => tag.group_id === group.id),
  }));
}

/**
 * Get all global tags (not series-specific) - server-side
 */
export async function getGlobalTagsServer(): Promise<CogTag[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_tags')
    .select('*')
    .is('series_id', null)
    .order('position', { ascending: true });

  if (error) throw error;
  return data as CogTag[];
}

/**
 * Get all tags for a series (both enabled global tags and series-local tags) - server-side
 */
export async function getEnabledTagsForSeriesServer(seriesId: string): Promise<CogTagWithGroup[]> {
  const client = await createClient();

  // Get enabled global tags via cog_series_tags
  const { data: enabledGlobal, error: enabledError } = await (client as any)
    .from('cog_series_tags')
    .select(`
      position,
      tag:cog_tags(
        *,
        group:cog_tag_groups(*)
      )
    `)
    .eq('series_id', seriesId)
    .order('position', { ascending: true });

  if (enabledError) throw enabledError;

  // Get series-local tags
  const { data: localTags, error: localError } = await (client as any)
    .from('cog_tags')
    .select(`
      *,
      group:cog_tag_groups(*)
    `)
    .eq('series_id', seriesId)
    .order('position', { ascending: true });

  if (localError) throw localError;

  // Combine: enabled global tags first, then local tags
  const globalTagsWithGroup = (enabledGlobal || []).map((row: { tag: CogTagWithGroup }) => row.tag);
  const localTagsWithGroup = (localTags || []) as CogTagWithGroup[];

  return [...globalTagsWithGroup, ...localTagsWithGroup];
}

/**
 * Get series with images and enabled tags - server-side
 */
export async function getSeriesWithImagesAndTagsServer(id: string): Promise<CogSeriesWithImagesAndTags> {
  const client = await createClient();

  const [seriesResult, imagesResult, tagsResult] = await Promise.all([
    (client as any).from('cog_series').select('*').eq('id', id).single(),
    (client as any).from('cog_images').select('*').eq('series_id', id).order('created_at', { ascending: false }),
    getEnabledTagsForSeriesServer(id),
  ]);

  if (seriesResult.error) throw seriesResult.error;
  if (imagesResult.error) throw imagesResult.error;

  return {
    ...seriesResult.data,
    images: imagesResult.data,
    enabled_tags: tagsResult,
  } as CogSeriesWithImagesAndTags;
}

/**
 * Get images with their tags for a series - server-side
 */
export async function getImagesWithTagsServer(seriesId: string): Promise<CogImageWithTags[]> {
  const client = await createClient();

  // Get all images for the series
  const { data: images, error: imagesError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (imagesError) throw imagesError;
  if (!images || images.length === 0) return [];

  // Get all image-tag relationships for these images
  const imageIds = images.map((img: CogImage) => img.id);
  const { data: imageTags, error: tagsError } = await (client as any)
    .from('cog_image_tags')
    .select(`
      image_id,
      tag:cog_tags(*)
    `)
    .in('image_id', imageIds);

  if (tagsError) throw tagsError;

  // Build a map of image_id -> tags
  const tagsByImage = new Map<string, CogTag[]>();
  for (const row of imageTags || []) {
    const existing = tagsByImage.get(row.image_id) || [];
    existing.push(row.tag);
    tagsByImage.set(row.image_id, existing);
  }

  // Combine images with their tags
  return images.map((image: CogImage) => ({
    ...image,
    tags: tagsByImage.get(image.id) || [],
  }));
}

/**
 * Get ungrouped global tags - server-side
 */
export async function getUngroupedTagsServer(): Promise<CogTag[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_tags')
    .select('*')
    .is('series_id', null)
    .is('group_id', null)
    .order('position', { ascending: true });

  if (error) throw error;
  return data as CogTag[];
}
