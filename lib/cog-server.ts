/**
 * Cog: Image Generation Pipeline - Server-side operations
 * These functions use the server-side Supabase client and can only be used in Server Components
 */

import { createClient } from './supabase-server';
import type {
  CogSeries,
  CogImage,
  CogImageInsert,
  CogJob,
  CogJobUpdate,
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
  CogImageWithGroupInfo,
  CogPipelineStep,
  CogPipelineStepOutput,
  CogPipelineStepOutputInsert,
  CogPipelineJobWithSteps,
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
  CogPipelineBaseCandidate,
  CogBenchmarkRound,
  CogBenchmarkImage,
  CogBenchmarkRoundWithImages,
  CogBenchmarkConfigType,
  CogBenchmarkRoundStatus,
  CogBenchmarkImageRating,
  CogCalibrationSeed,
  CogRemixJob,
  CogRemixJobFull,
  CogRemixJobUpdate,
  CogRemixSearchIteration,
  CogRemixCandidate,
  CogRemixAugmentStep,
  CogRemixTraceEntry,
  CogEvalProfile,
  CogRemixEvalRun,
  CogRemixEvalResult,
  CogRemixEvalRunFull,
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
// Image Grouping Operations (Server)
// ============================================================================

/**
 * Get group primary images (one per group) with group counts for a series - server-side
 * Returns one image per group, ordered by creation date.
 *
 * If primaryImageId is provided and exists in a group, that image will be shown
 * as the cover for that group instead of the default group primary.
 */
export async function getGroupPrimaryImagesServer(
  seriesId: string,
  primaryImageId?: string | null
): Promise<CogImageWithGroupInfo[]> {
  const client = await createClient();

  // Get all images for the series
  const { data: allImages, error: imagesError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId);

  if (imagesError) throw imagesError;
  if (!allImages || allImages.length === 0) return [];

  // Count images per group and track group primaries
  const groupCountMap = new Map<string, number>();
  const groupPrimaryMap = new Map<string, CogImage>(); // group_id -> default group primary
  let seriesPrimaryGroupId: string | null = null;
  let seriesPrimaryImage: CogImage | null = null;

  for (const img of allImages) {
    const groupId = img.group_id || img.id;

    // Count images per group
    const count = groupCountMap.get(groupId) || 0;
    groupCountMap.set(groupId, count + 1);

    // Track default group primaries (id === group_id)
    const isGroupPrimary = img.id === groupId || (!img.group_id && !img.parent_image_id);
    if (isGroupPrimary && !groupPrimaryMap.has(groupId)) {
      groupPrimaryMap.set(groupId, img);
    }

    // Track if series primary is in this group
    if (primaryImageId && img.id === primaryImageId) {
      seriesPrimaryGroupId = groupId;
      seriesPrimaryImage = img;
    }
  }

  // Build the list of representative images (one per group)
  const representatives: CogImageWithGroupInfo[] = [];

  for (const [groupId, defaultPrimary] of groupPrimaryMap) {
    // If series primary is in this group, use it instead of default primary
    const representativeImage =
      seriesPrimaryGroupId === groupId && seriesPrimaryImage
        ? seriesPrimaryImage
        : defaultPrimary;

    representatives.push({
      ...representativeImage,
      group_count: groupCountMap.get(groupId) || 1,
    });
  }

  // Sort by creation date (newest first)
  representatives.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return representatives;
}

/**
 * Get all images in the same group - server-side
 * Returns images in the group ordered by group_position (if set), then by created_at
 */
export async function getImageGroupServer(imageId: string): Promise<CogImage[]> {
  const client = await createClient();

  // First get the image to find its group_id
  const { data: image, error: imageError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  const groupId = image.group_id || image.id;

  // Get all images in this group
  const { data: groupImages, error: groupError } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('group_id', groupId);

  if (groupError) throw groupError;

  // If no images found with group_id, fallback to legacy parent chain
  if (!groupImages || groupImages.length === 0) {
    return await getImageVersionChainServerLegacy(imageId, image);
  }

  // Sort by group_position (if set), then by created_at
  const sorted = (groupImages as CogImage[]).sort((a, b) => {
    // If both have positions, sort by position
    if (a.group_position !== null && b.group_position !== null) {
      return a.group_position - b.group_position;
    }
    // If only a has position, a comes first
    if (a.group_position !== null) return -1;
    // If only b has position, b comes first
    if (b.group_position !== null) return 1;
    // Neither has position, sort by created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted;
}

/**
 * Legacy: Get the full version chain for an image using parent_image_id
 * Used as fallback for images created before group_id migration
 */
async function getImageVersionChainServerLegacy(imageId: string, image: CogImage): Promise<CogImage[]> {
  const client = await createClient();

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

  // Build chain from root following creation time
  const chain: CogImage[] = [root];
  let current = root;
  while (true) {
    const children = childrenMap.get(current.id) || [];
    if (children.length === 0) break;
    const latestChild = children.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    chain.push(latestChild);
    current = latestChild;
  }

  return chain;
}

// Legacy aliases for backwards compatibility
export const getRootImagesWithVersionCountsServer = getGroupPrimaryImagesServer;
export const getImageVersionChainServer = getImageGroupServer;

// ============================================================================
// Pipeline Job Operations (Server)
// ============================================================================

/**
 * Get pipeline steps for a job - server-side
 */
export async function getPipelineStepsServer(jobId: string): Promise<CogPipelineStep[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('step_order', { ascending: true });

  if (error) throw error;
  return data as CogPipelineStep[];
}

/**
 * Get pipeline job with steps and configs - server-side
 */
export async function getPipelineJobWithStepsServer(jobId: string): Promise<CogPipelineJobWithSteps> {
  const client = await createClient();

  const [jobResult, stepsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', jobId).single(),
    (client as any)
      .from('cog_pipeline_steps')
      .select('*, outputs:cog_pipeline_step_outputs(*)')
      .eq('job_id', jobId)
      .order('step_order', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;

  const job = jobResult.data as CogJob;

  // Fetch pipeline configs if present
  const [photographerConfig, directorConfig, productionConfig] = await Promise.all([
    job.photographer_config_id
      ? getPhotographerConfigByIdServer(job.photographer_config_id).catch(() => null)
      : null,
    job.director_config_id
      ? getDirectorConfigByIdServer(job.director_config_id).catch(() => null)
      : null,
    job.production_config_id
      ? getProductionConfigByIdServer(job.production_config_id).catch(() => null)
      : null,
  ]);

  // Process steps with their outputs
  const steps = stepsResult.data.map((step: any) => ({
    ...step,
    output: step.outputs && step.outputs.length > 0 ? step.outputs[0] : null,
  }));

  return {
    ...job,
    steps,
    photographer_config: photographerConfig,
    director_config: directorConfig,
    production_config: productionConfig,
  } as CogPipelineJobWithSteps;
}

// ============================================================================
// Photographer Config Operations (Server)
// ============================================================================

/**
 * Get a single photographer config by ID - server-side
 */
export async function getPhotographerConfigByIdServer(id: string): Promise<CogPhotographerConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_photographer_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Get all photographer configs (global library) - server-side
 */
export async function getAllPhotographerConfigsServer(): Promise<CogPhotographerConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_photographer_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogPhotographerConfig[];
}

// ============================================================================
// Director Config Operations (Server)
// ============================================================================

/**
 * Get a single director config by ID - server-side
 */
export async function getDirectorConfigByIdServer(id: string): Promise<CogDirectorConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_director_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Get all director configs (global library) - server-side
 */
export async function getAllDirectorConfigsServer(): Promise<CogDirectorConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_director_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogDirectorConfig[];
}

// ============================================================================
// Production Config Operations (Server)
// ============================================================================

/**
 * Get a single production config by ID - server-side
 */
export async function getProductionConfigByIdServer(id: string): Promise<CogProductionConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_production_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Get all production configs (global library) - server-side
 */
export async function getAllProductionConfigsServer(): Promise<CogProductionConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_production_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogProductionConfig[];
}

// ============================================================================
// Base Candidate Operations (Server)
// ============================================================================

/**
 * Get base candidates for a pipeline job - server-side
 */
export async function getBaseCandidatesForJobServer(jobId: string): Promise<CogPipelineBaseCandidate[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_base_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('candidate_index', { ascending: true });

  if (error) throw error;
  return data as CogPipelineBaseCandidate[];
}

// ============================================================================
// Server-side Write Operations (for server actions)
// ============================================================================

/**
 * Update a job - server-side (for use in server actions)
 */
export async function updateJobServer(id: string, updates: CogJobUpdate): Promise<CogJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Create an image record - server-side (for use in server actions)
 */
export async function createImageServer(input: CogImageInsert): Promise<CogImage> {
  const client = await createClient();

  // If parent_image_id is provided but group_id isn't, fetch parent's group_id
  let groupId = input.group_id;
  if (!groupId && input.parent_image_id) {
    const { data: parent } = await (client as any)
      .from('cog_images')
      .select('group_id')
      .eq('id', input.parent_image_id)
      .single();
    if (parent?.group_id) {
      groupId = parent.group_id;
    }
  }

  const { data, error } = await (client as any)
    .from('cog_images')
    .insert({
      series_id: input.series_id,
      job_id: input.job_id || null,
      parent_image_id: input.parent_image_id || null,
      group_id: groupId || null,
      storage_path: input.storage_path,
      filename: input.filename,
      mime_type: input.mime_type || 'image/png',
      width: input.width || null,
      height: input.height || null,
      file_size: input.file_size || null,
      source: input.source,
      prompt: input.prompt || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Create a pipeline step output - server-side (for use in server actions)
 */
export async function createPipelineStepOutputServer(input: CogPipelineStepOutputInsert): Promise<CogPipelineStepOutput> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_step_outputs')
    .insert({
      step_id: input.step_id,
      image_id: input.image_id,
      metadata: input.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineStepOutput;
}

/**
 * Create a base candidate - server-side (for use in server actions)
 */
export async function createBaseCandidateServer(input: {
  job_id: string;
  image_id: string;
  candidate_index: number;
}): Promise<CogPipelineBaseCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_base_candidates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineBaseCandidate;
}

// ============================================================================
// Benchmark / Calibration Operations (Server)
// ============================================================================

/**
 * Get all benchmark rounds for a config, with images, ordered by round_number desc
 */
export async function getBenchmarkRoundsForConfigServer(
  configId: string,
  configType: CogBenchmarkConfigType,
): Promise<CogBenchmarkRoundWithImages[]> {
  const client = await createClient();

  const { data: rounds, error: roundsError } = await (client as any)
    .from('cog_benchmark_rounds')
    .select('*')
    .eq('config_id', configId)
    .eq('config_type', configType)
    .order('round_number', { ascending: false });

  if (roundsError) throw roundsError;
  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r: CogBenchmarkRound) => r.id);
  const { data: images, error: imagesError } = await (client as any)
    .from('cog_benchmark_images')
    .select('*')
    .in('round_id', roundIds)
    .order('image_index', { ascending: true });

  if (imagesError) throw imagesError;

  const imagesByRound = new Map<string, CogBenchmarkImage[]>();
  for (const img of (images || []) as CogBenchmarkImage[]) {
    const existing = imagesByRound.get(img.round_id) || [];
    existing.push(img);
    imagesByRound.set(img.round_id, existing);
  }

  return (rounds as CogBenchmarkRound[]).map((round) => ({
    ...round,
    images: imagesByRound.get(round.id) || [],
  }));
}

/**
 * Create a benchmark round - server-side
 */
export async function createBenchmarkRoundServer(input: {
  config_type: CogBenchmarkConfigType;
  config_id: string;
  round_number: number;
  distilled_prompt: string;
}): Promise<CogBenchmarkRound> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_rounds')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkRound;
}

/**
 * Create a benchmark image - server-side
 */
export async function createBenchmarkImageServer(input: {
  round_id: string;
  image_index: number;
  storage_path: string;
}): Promise<CogBenchmarkImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_images')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkImage;
}

/**
 * Update a benchmark round's status - server-side
 */
export async function updateBenchmarkRoundStatusServer(
  roundId: string,
  status: CogBenchmarkRoundStatus,
): Promise<CogBenchmarkRound> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_rounds')
    .update({ status })
    .eq('id', roundId)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkRound;
}

/**
 * Update a benchmark image's rating and feedback - server-side
 */
export async function updateBenchmarkImageRatingServer(
  imageId: string,
  rating: CogBenchmarkImageRating | null,
  feedback: string | null,
): Promise<CogBenchmarkImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_images')
    .update({ rating, feedback })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkImage;
}

// ============================================================================
// Calibration Seed Operations (Server)
// ============================================================================

/**
 * Get a calibration seed by type_key - server-side
 */
export async function getCalibrationSeedByTypeServer(typeKey: string): Promise<CogCalibrationSeed | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_calibration_seeds')
    .select('*')
    .eq('type_key', typeKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as CogCalibrationSeed;
}

// ============================================================================
// Eval Profile Operations (Server)
// ============================================================================

/**
 * Get all eval profiles ordered by name - server-side
 */
export async function getAllEvalProfilesServer(): Promise<CogEvalProfile[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_eval_profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogEvalProfile[];
}

/**
 * Get a single eval profile by ID - server-side
 */
export async function getEvalProfileByIdServer(id: string): Promise<CogEvalProfile> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_eval_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogEvalProfile;
}

/**
 * Get all eval runs for a job, with profile and results - server-side
 */
export async function getRemixEvalRunsForJobServer(jobId: string): Promise<CogRemixEvalRunFull[]> {
  const client = await createClient();

  const { data: runs, error: runsError } = await (client as any)
    .from('cog_remix_eval_runs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (runsError) throw runsError;
  if (!runs || runs.length === 0) return [];

  // Fetch profiles and results for all runs
  const profileIds = [...new Set((runs as CogRemixEvalRun[]).map(r => r.eval_profile_id))];
  const runIds = (runs as CogRemixEvalRun[]).map(r => r.id);

  const [profilesResult, resultsResult] = await Promise.all([
    (client as any).from('cog_eval_profiles').select('*').in('id', profileIds),
    (client as any).from('cog_remix_eval_results').select('*').in('run_id', runIds).order('created_at', { ascending: true }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (resultsResult.error) throw resultsResult.error;

  const profileMap = new Map<string, CogEvalProfile>();
  for (const p of (profilesResult.data || []) as CogEvalProfile[]) {
    profileMap.set(p.id, p);
  }

  const resultsByRun = new Map<string, CogRemixEvalResult[]>();
  for (const r of (resultsResult.data || []) as CogRemixEvalResult[]) {
    const existing = resultsByRun.get(r.run_id) || [];
    existing.push(r);
    resultsByRun.set(r.run_id, existing);
  }

  return (runs as CogRemixEvalRun[]).map(run => ({
    ...run,
    profile: profileMap.get(run.eval_profile_id)!,
    results: resultsByRun.get(run.id) || [],
  }));
}

/**
 * Create an eval run record - server-side
 */
export async function createRemixEvalRunServer(input: {
  job_id: string;
  eval_profile_id: string;
  status?: string;
}): Promise<CogRemixEvalRun> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_runs')
    .insert({
      job_id: input.job_id,
      eval_profile_id: input.eval_profile_id,
      status: input.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalRun;
}

/**
 * Update an eval run status - server-side
 */
export async function updateRemixEvalRunServer(
  id: string,
  updates: Partial<CogRemixEvalRun>
): Promise<CogRemixEvalRun> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalRun;
}

/**
 * Create an eval result record - server-side
 */
export async function createRemixEvalResultServer(input: {
  run_id: string;
  candidate_id: string;
  score: number | null;
  reasoning: string | null;
  criterion_scores: Record<string, number> | null;
}): Promise<CogRemixEvalResult> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_results')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalResult;
}

/**
 * Get all candidates for a remix job (across all iterations) - server-side
 */
export async function getAllCandidatesForJobServer(jobId: string): Promise<CogRemixCandidate[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as CogRemixCandidate[];
}

// ============================================================================
// Remix Job Operations (Server)
// ============================================================================

/**
 * Get a single remix job by ID - server-side
 */
export async function getRemixJobByIdServer(id: string): Promise<CogRemixJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Get a full remix job with iterations, candidates, augment steps, eval profile, and eval runs - server-side
 */
export async function getRemixJobFullServer(id: string): Promise<CogRemixJobFull> {
  const client = await createClient();

  const [jobResult, iterationsResult, candidatesResult, augmentResult] = await Promise.all([
    (client as any).from('cog_remix_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_remix_search_iterations').select('*').eq('job_id', id).order('iteration_number', { ascending: true }),
    (client as any).from('cog_remix_candidates').select('*').eq('job_id', id).order('created_at', { ascending: true }),
    (client as any).from('cog_remix_augment_steps').select('*').eq('job_id', id).order('step_order', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (iterationsResult.error) throw iterationsResult.error;
  if (candidatesResult.error) throw candidatesResult.error;
  if (augmentResult.error) throw augmentResult.error;

  const job = jobResult.data as CogRemixJob;

  // Fetch eval profile and eval runs
  const [evalProfile, evalRuns] = await Promise.all([
    job.eval_profile_id
      ? getEvalProfileByIdServer(job.eval_profile_id).catch(() => null)
      : null,
    getRemixEvalRunsForJobServer(id).catch(() => [] as CogRemixEvalRunFull[]),
  ]);

  const iterations = (iterationsResult.data as CogRemixSearchIteration[]).map((iter) => ({
    ...iter,
    candidates: (candidatesResult.data as CogRemixCandidate[]).filter((c) => c.iteration_id === iter.id),
  }));

  return {
    ...job,
    iterations,
    augment_steps: augmentResult.data as CogRemixAugmentStep[],
    eval_profile: evalProfile,
    eval_runs: evalRuns,
  } as CogRemixJobFull;
}

/**
 * Get remix jobs for a series - server-side
 */
export async function getRemixJobsForSeriesServer(seriesId: string): Promise<CogRemixJob[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogRemixJob[];
}

/**
 * Update a remix job - server-side
 */
export async function updateRemixJobServer(id: string, updates: CogRemixJobUpdate): Promise<CogRemixJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Create a search iteration record - server-side
 */
export async function createRemixSearchIterationServer(input: {
  job_id: string;
  iteration_number: number;
  search_params: Record<string, unknown>;
  llm_reasoning?: string;
  status?: string;
}): Promise<CogRemixSearchIteration> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_search_iterations')
    .insert({
      job_id: input.job_id,
      iteration_number: input.iteration_number,
      search_params: input.search_params,
      llm_reasoning: input.llm_reasoning || null,
      status: input.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixSearchIteration;
}

/**
 * Update a search iteration - server-side
 */
export async function updateRemixSearchIterationServer(
  id: string,
  updates: Partial<CogRemixSearchIteration>
): Promise<CogRemixSearchIteration> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_search_iterations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixSearchIteration;
}

/**
 * Create a remix candidate record - server-side
 */
export async function createRemixCandidateServer(input: {
  job_id: string;
  iteration_id: string;
  source: string;
  source_id: string;
  source_url: string;
  thumbnail_url: string;
  photographer?: string;
  photographer_url?: string;
  width?: number;
  height?: number;
}): Promise<CogRemixCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .insert({
      job_id: input.job_id,
      iteration_id: input.iteration_id,
      source: input.source,
      source_id: input.source_id,
      source_url: input.source_url,
      thumbnail_url: input.thumbnail_url,
      photographer: input.photographer || null,
      photographer_url: input.photographer_url || null,
      width: input.width || null,
      height: input.height || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixCandidate;
}

/**
 * Update a remix candidate - server-side
 */
export async function updateRemixCandidateServer(
  id: string,
  updates: Partial<CogRemixCandidate>
): Promise<CogRemixCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixCandidate;
}

/**
 * Append a trace entry to a remix job's trace array - server-side
 * Uses JSONB concatenation to atomically append
 */
export async function appendRemixTraceServer(
  jobId: string,
  entry: CogRemixTraceEntry
): Promise<void> {
  const client = await createClient();
  // Use raw SQL via rpc for atomic JSONB append
  const { error } = await (client as any).rpc('jsonb_array_append', {
    table_name: 'cog_remix_jobs',
    row_id: jobId,
    column_name: 'trace',
    new_element: entry,
  });

  if (error) {
    // Fallback: read-modify-write if rpc not available
    const { data: job } = await (client as any)
      .from('cog_remix_jobs')
      .select('trace')
      .eq('id', jobId)
      .single();

    const currentTrace = (job?.trace || []) as CogRemixTraceEntry[];
    currentTrace.push(entry);

    const { error: updateError } = await (client as any)
      .from('cog_remix_jobs')
      .update({ trace: currentTrace })
      .eq('id', jobId);

    if (updateError) throw updateError;
  }
}
