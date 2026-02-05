/**
 * Cog: Image Generation Pipeline - Server-side operations
 * These functions use the server-side Supabase client and can only be used in Server Components
 */

import { createClient } from './supabase-server';
import type {
  CogSeries,
  CogImage,
  CogJob,
  CogJobStep,
  CogJobInput,
  CogSeriesWithImages,
  CogSeriesWithJobs,
  CogJobWithSteps,
  CogJobWithStepsAndInputs,
  CogJobInputWithImage,
  CogTagGroup,
  CogTag,
  CogTagWithGroup,
  CogTagGroupWithTags,
  CogImageWithTags,
  CogSeriesWithImagesAndTags,
  CogImageWithVersions,
} from './types/cog';

// ============================================================================
// Series Operations (Server)
// ============================================================================

/**
 * Get all top-level series (no parent) - server-side
 */
export async function getSeriesServer(): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .is('parent_id', null)
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get all series (including nested) - server-side
 */
export async function getAllSeriesServer(): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get child series - server-side
 */
export async function getChildSeriesServer(parentId: string): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .eq('parent_id', parentId)
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get a single series by ID - server-side
 */
export async function getSeriesByIdServer(id: string): Promise<CogSeries> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Get series with images - server-side
 */
export async function getSeriesWithImagesServer(id: string): Promise<CogSeriesWithImages> {
  const client = await createClient();

  const [seriesResult, imagesResult] = await Promise.all([
    (client as any).from('cog_series').select('*').eq('id', id).single(),
    (client as any).from('cog_images').select('*').eq('series_id', id).order('created_at', { ascending: false }),
  ]);

  if (seriesResult.error) throw seriesResult.error;
  if (imagesResult.error) throw imagesResult.error;

  return {
    ...seriesResult.data,
    images: imagesResult.data,
  } as CogSeriesWithImages;
}

/**
 * Get series with jobs - server-side
 */
export async function getSeriesWithJobsServer(id: string): Promise<CogSeriesWithJobs> {
  const client = await createClient();

  const [seriesResult, jobsResult] = await Promise.all([
    (client as any).from('cog_series').select('*').eq('id', id).single(),
    (client as any).from('cog_jobs').select('*').eq('series_id', id).order('created_at', { ascending: false }),
  ]);

  if (seriesResult.error) throw seriesResult.error;
  if (jobsResult.error) throw jobsResult.error;

  return {
    ...seriesResult.data,
    jobs: jobsResult.data,
  } as CogSeriesWithJobs;
}

// ============================================================================
// Image Operations (Server)
// ============================================================================

/**
 * Get images for a series - server-side
 */
export async function getSeriesImagesServer(seriesId: string): Promise<CogImage[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogImage[];
}

/**
 * Get a single image by ID - server-side
 */
export async function getImageByIdServer(id: string): Promise<CogImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogImage;
}

// ============================================================================
// Job Operations (Server)
// ============================================================================

/**
 * Get jobs for a series - server-side
 */
export async function getSeriesJobsServer(seriesId: string): Promise<CogJob[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogJob[];
}

/**
 * Get a single job by ID - server-side
 */
export async function getJobByIdServer(id: string): Promise<CogJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Get job with steps - server-side
 */
export async function getJobWithStepsServer(id: string): Promise<CogJobWithSteps> {
  const client = await createClient();

  const [jobResult, stepsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_job_steps').select('*').eq('job_id', id).order('sequence', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;

  return {
    ...jobResult.data,
    steps: stepsResult.data,
  } as CogJobWithSteps;
}

/**
 * Get job with steps and inputs (including images) - server-side
 */
export async function getJobWithStepsAndInputsServer(id: string): Promise<CogJobWithStepsAndInputs> {
  const client = await createClient();

  const [jobResult, stepsResult, inputsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_job_steps').select('*').eq('job_id', id).order('sequence', { ascending: true }),
    (client as any).from('cog_job_inputs').select('*, image:cog_images(*)').eq('job_id', id).order('reference_id', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;
  if (inputsResult.error) throw inputsResult.error;

  return {
    ...jobResult.data,
    steps: stepsResult.data,
    inputs: inputsResult.data as CogJobInputWithImage[],
  } as CogJobWithStepsAndInputs;
}

// ============================================================================
// Job Step Operations (Server)
// ============================================================================

/**
 * Get steps for a job - server-side
 */
export async function getJobStepsServer(jobId: string): Promise<CogJobStep[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_job_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data as CogJobStep[];
}

// ============================================================================
// Tag Operations (Server)
// ============================================================================

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

// ============================================================================
// Image Versioning Operations (Server)
// ============================================================================

/**
 * Get root images (no parent) with version counts for a series - server-side
 * Returns images ordered by creation date, newest first
 */
export async function getRootImagesWithVersionCountsServer(seriesId: string): Promise<CogImageWithVersions[]> {
  const client = await createClient();

  // Get all images for the series
  const { data: allImages, error: imagesError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId);

  if (imagesError) throw imagesError;
  if (!allImages || allImages.length === 0) return [];

  // Build a map of parent_id -> count of children
  // Note: parent_image_id may be undefined if migration hasn't run yet
  const childCountMap = new Map<string, number>();
  for (const img of allImages) {
    if (img.parent_image_id) {
      const count = childCountMap.get(img.parent_image_id) || 0;
      childCountMap.set(img.parent_image_id, count + 1);
    }
  }

  // For version count, we need to count the full chain depth
  // Build parent -> children map for traversal
  const childrenMap = new Map<string, CogImage[]>();
  for (const img of allImages) {
    if (img.parent_image_id) {
      const children = childrenMap.get(img.parent_image_id) || [];
      children.push(img);
      childrenMap.set(img.parent_image_id, children);
    }
  }

  // Count total versions in chain (including root)
  function countVersions(imageId: string): number {
    const children = childrenMap.get(imageId) || [];
    if (children.length === 0) return 1;
    // Take max depth of any child path
    return 1 + Math.max(...children.map((c) => countVersions(c.id)));
  }

  // Filter to root images and add version count
  // Note: parent_image_id may be undefined if migration hasn't run yet
  const rootImages = allImages
    .filter((img: CogImage) => !img.parent_image_id) // handles null, undefined, and empty string
    .map((img: CogImage) => ({
      ...img,
      version_count: countVersions(img.id),
    }))
    .sort((a: CogImageWithVersions, b: CogImageWithVersions) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return rootImages as CogImageWithVersions[];
}

/**
 * Get the full version chain for an image - server-side
 * Returns array from root to latest descendant (chronological order)
 */
export async function getImageVersionChainServer(imageId: string): Promise<CogImage[]> {
  const client = await createClient();

  // First get the image to find its series
  const { data: image, error: imageError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  // Get all images in this series to build the chain
  const { data: allImages, error: allError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', image.series_id);

  if (allError) throw allError;

  // Build parent lookup
  const imageMap = new Map<string, CogImage>();
  const childrenMap = new Map<string, CogImage[]>();

  for (const img of allImages) {
    imageMap.set(img.id, img);
    if (img.parent_image_id) {
      const children = childrenMap.get(img.parent_image_id) || [];
      children.push(img);
      childrenMap.set(img.parent_image_id, children);
    }
  }

  // Find the root of the chain containing this image
  let root = image;
  while (root.parent_image_id) {
    const parent = imageMap.get(root.parent_image_id);
    if (!parent) break;
    root = parent;
  }

  // Build chain from root, following the path that leads to our target image
  // If the image IS the root or a direct ancestor, build the full chain
  const chain: CogImage[] = [root];

  // Check if target image is in the chain starting from root
  function findPathToTarget(currentId: string, targetId: string, path: CogImage[]): CogImage[] | null {
    if (currentId === targetId) return path;

    const children = childrenMap.get(currentId) || [];
    for (const child of children) {
      const result = findPathToTarget(child.id, targetId, [...path, child]);
      if (result) return result;
    }
    return null;
  }

  const pathToTarget = findPathToTarget(root.id, imageId, chain);

  if (pathToTarget) {
    // Now extend from target to latest descendant
    let current = imageMap.get(imageId)!;
    const result = [...pathToTarget];

    while (true) {
      const children = childrenMap.get(current.id) || [];
      if (children.length === 0) break;
      // Follow the most recent child
      const latestChild = children.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      result.push(latestChild);
      current = latestChild;
    }

    return result;
  }

  // Fallback: just return the full chain from root
  const fullChain: CogImage[] = [root];
  let current = root;
  while (true) {
    const children = childrenMap.get(current.id) || [];
    if (children.length === 0) break;
    const latestChild = children.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    fullChain.push(latestChild);
    current = latestChild;
  }

  return fullChain;
}
