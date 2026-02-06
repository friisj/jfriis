/**
 * Cog: Image Generation Pipeline - Client-side operations
 * These functions use the browser-side Supabase client and can be used in Client Components
 */

import { supabase } from './supabase';
import type {
  CogSeries,
  CogSeriesInsert,
  CogSeriesUpdate,
  CogImage,
  CogImageInsert,
  CogImageUpdate,
  CogJob,
  CogJobInsert,
  CogJobUpdate,
  CogJobStep,
  CogJobStepInsert,
  CogJobStepUpdate,
  CogJobInput,
  CogJobInputInsert,
  CogTagGroup,
  CogTagGroupInsert,
  CogTagGroupUpdate,
  CogTag,
  CogTagInsert,
  CogTagUpdate,
  CogSeriesTag,
  CogSeriesTagInsert,
  CogImageTag,
  CogImageTagInsert,
} from './types/cog';

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Get the public URL for a cog image stored in Supabase
 */
export function getCogImageUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/cog-images/${storagePath}`;
}

// ============================================================================
// Series Operations (Client)
// ============================================================================

/**
 * Create a new series - client-side
 */
export async function createSeries(input: CogSeriesInsert): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .insert({
      parent_id: input.parent_id || null,
      title: input.title,
      description: input.description || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Update a series - client-side
 */
export async function updateSeries(id: string, updates: CogSeriesUpdate): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Delete a series - client-side
 */
export async function deleteSeries(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_series')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Set the primary image for a series - client-side
 * When set, this image is displayed in grids instead of the root.
 * Pass null to clear and revert to showing the root image.
 */
export async function setSeriesPrimaryImage(seriesId: string, imageId: string | null): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .update({ primary_image_id: imageId })
    .eq('id', seriesId)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Delete a series with full cleanup - removes storage files first, then DB records
 * Returns count of deleted images for confirmation
 */
export async function deleteSeriesWithCleanup(id: string): Promise<{ deletedImages: number }> {
  // First, get all images in this series to clean up storage
  const { data: images, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('storage_path')
    .eq('series_id', id);

  if (fetchError) throw fetchError;

  const imagePaths = (images || [])
    .map((img: { storage_path: string }) => img.storage_path)
    .filter(Boolean);

  // Delete images from storage (batch delete)
  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('cog-images')
      .remove(imagePaths);

    if (storageError) {
      console.error('Storage cleanup error (continuing anyway):', storageError);
      // Continue even if storage cleanup fails - DB cascade will handle records
    }
  }

  // Delete the series - CASCADE will handle all related DB records
  const { error: deleteError } = await (supabase as any)
    .from('cog_series')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  return { deletedImages: imagePaths.length };
}

// ============================================================================
// Image Operations (Client)
// ============================================================================

/**
 * Create an image record - client-side
 */
export async function createImage(input: CogImageInsert): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .insert({
      series_id: input.series_id,
      job_id: input.job_id || null,
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
 * Update an image - client-side
 */
export async function updateImage(id: string, updates: CogImageUpdate): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Delete an image - client-side (simple, no cleanup)
 */
export async function deleteImage(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete an image with full cleanup - client-side
 * Handles:
 * - Re-parenting children to this image's parent (preserves version chain)
 * - Clearing primary_image_id if this is the primary image
 * - Removing from storage
 * - Deleting the database record
 */
export async function deleteImageWithCleanup(id: string): Promise<void> {
  // 1. Fetch the image to get storage_path, parent_image_id, and series_id
  const { data: image, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('storage_path, parent_image_id, series_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Re-parent any children to this image's parent
  const { error: reparentError } = await (supabase as any)
    .from('cog_images')
    .update({ parent_image_id: image.parent_image_id })
    .eq('parent_image_id', id);

  if (reparentError) throw reparentError;

  // 3. Clear primary_image_id if this is the primary image for the series
  const { data: series } = await (supabase as any)
    .from('cog_series')
    .select('primary_image_id')
    .eq('id', image.series_id)
    .single();

  if (series?.primary_image_id === id) {
    const { error: clearPrimaryError } = await (supabase as any)
      .from('cog_series')
      .update({ primary_image_id: null })
      .eq('id', image.series_id);

    if (clearPrimaryError) {
      console.error('Failed to clear primary image (continuing):', clearPrimaryError);
    }
  }

  // 4. Delete from storage
  if (image.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('cog-images')
      .remove([image.storage_path]);

    if (storageError) {
      console.error('Storage cleanup error (continuing):', storageError);
      // Continue even if storage cleanup fails
    }
  }

  // 5. Delete the database record
  const { error: deleteError } = await (supabase as any)
    .from('cog_images')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
}

// ============================================================================
// Job Operations (Client)
// ============================================================================

/**
 * Create a job - client-side
 */
export async function createJob(input: CogJobInsert): Promise<CogJob> {
  const { data, error } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title || null,
      base_prompt: input.base_prompt,
      negative_prompt: input.negative_prompt || null,
      // Shoot parameters
      scene: input.scene || null,
      art_direction: input.art_direction || null,
      styling: input.styling || null,
      camera: input.camera || null,
      framing: input.framing || null,
      lighting: input.lighting || null,
      // Image generation settings
      image_model: input.image_model || 'auto',
      image_size: input.image_size || '2K',
      aspect_ratio: input.aspect_ratio || '1:1',
      use_thinking: input.use_thinking || false,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Update a job - client-side
 */
export async function updateJob(id: string, updates: CogJobUpdate): Promise<CogJob> {
  const { data, error } = await (supabase as any)
    .from('cog_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Delete a job - client-side
 */
export async function deleteJob(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Retry a failed job - resets job and all steps to pending state
 */
export async function retryJob(id: string): Promise<CogJob> {
  // Reset the job status
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .update({
      status: 'ready',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (jobError) throw jobError;

  // Reset all steps to pending
  const { error: stepsError } = await (supabase as any)
    .from('cog_job_steps')
    .update({
      status: 'pending',
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', id);

  if (stepsError) throw stepsError;

  return job as CogJob;
}

// ============================================================================
// Job Step Operations (Client)
// ============================================================================

/**
 * Create a job step - client-side
 */
export async function createJobStep(input: CogJobStepInsert): Promise<CogJobStep> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .insert({
      job_id: input.job_id,
      sequence: input.sequence,
      step_type: input.step_type,
      model: input.model,
      prompt: input.prompt,
      context: input.context || {},
      status: input.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJobStep;
}

/**
 * Update a job step - client-side
 */
export async function updateJobStep(id: string, updates: CogJobStepUpdate): Promise<CogJobStep> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJobStep;
}

/**
 * Delete a job step - client-side
 */
export async function deleteJobStep(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_job_steps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Batch create job steps - client-side
 */
export async function createJobSteps(steps: CogJobStepInsert[]): Promise<CogJobStep[]> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .insert(steps.map(step => ({
      job_id: step.job_id,
      sequence: step.sequence,
      step_type: step.step_type,
      model: step.model,
      prompt: step.prompt,
      context: step.context || {},
      status: step.status || 'pending',
    })))
    .select();

  if (error) throw error;
  return data as CogJobStep[];
}

// ============================================================================
// Job Input Operations (Client)
// ============================================================================

/**
 * Create a job input - client-side
 */
export async function createJobInput(input: CogJobInputInsert): Promise<CogJobInput> {
  const { data, error } = await (supabase as any)
    .from('cog_job_inputs')
    .insert({
      job_id: input.job_id,
      image_id: input.image_id,
      reference_id: input.reference_id,
      context: input.context || null,
      negative_prompt: input.negative_prompt || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJobInput;
}

/**
 * Batch create job inputs - client-side
 */
export async function createJobInputs(inputs: CogJobInputInsert[]): Promise<CogJobInput[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await (supabase as any)
    .from('cog_job_inputs')
    .insert(inputs.map(input => ({
      job_id: input.job_id,
      image_id: input.image_id,
      reference_id: input.reference_id,
      context: input.context || null,
      negative_prompt: input.negative_prompt || null,
    })))
    .select();

  if (error) throw error;
  return data as CogJobInput[];
}

/**
 * Delete a job input - client-side
 */
export async function deleteJobInput(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_job_inputs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Job Duplication
// ============================================================================

/**
 * Duplicate an existing job - creates a copy with same settings but fresh state
 * Copies: job fields, steps (prompts), and inputs (reference images)
 * Resets: status to 'draft', clears outputs/errors
 */
export async function duplicateJob(jobId: string): Promise<CogJob> {
  // Fetch the original job
  const { data: originalJob, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  // Fetch original steps
  const { data: originalSteps, error: stepsError } = await (supabase as any)
    .from('cog_job_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('sequence', { ascending: true });

  if (stepsError) throw stepsError;

  // Fetch original inputs
  const { data: originalInputs, error: inputsError } = await (supabase as any)
    .from('cog_job_inputs')
    .select('*')
    .eq('job_id', jobId)
    .order('reference_id', { ascending: true });

  if (inputsError) throw inputsError;

  // Create the new job (copy fields, reset status)
  const { data: newJob, error: createJobError } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: originalJob.series_id,
      title: originalJob.title ? `${originalJob.title} (copy)` : null,
      base_prompt: originalJob.base_prompt,
      negative_prompt: originalJob.negative_prompt,
      scene: originalJob.scene,
      art_direction: originalJob.art_direction,
      styling: originalJob.styling,
      camera: originalJob.camera,
      framing: originalJob.framing,
      lighting: originalJob.lighting,
      image_model: originalJob.image_model || 'auto',
      image_size: originalJob.image_size || '2K',
      aspect_ratio: originalJob.aspect_ratio || '1:1',
      use_thinking: originalJob.use_thinking || false,
      status: 'draft',
    })
    .select()
    .single();

  if (createJobError) throw createJobError;

  // Copy steps (reset status, clear outputs)
  if (originalSteps && originalSteps.length > 0) {
    const newSteps = originalSteps.map((step: CogJobStep) => ({
      job_id: newJob.id,
      sequence: step.sequence,
      step_type: step.step_type,
      model: step.model,
      prompt: step.prompt,
      context: step.context || {},
      status: 'pending',
    }));

    const { error: createStepsError } = await (supabase as any)
      .from('cog_job_steps')
      .insert(newSteps);

    if (createStepsError) throw createStepsError;
  }

  // Copy inputs (reference images)
  if (originalInputs && originalInputs.length > 0) {
    const newInputs = originalInputs.map((input: CogJobInput) => ({
      job_id: newJob.id,
      image_id: input.image_id,
      reference_id: input.reference_id,
      context: input.context,
      negative_prompt: input.negative_prompt,
    }));

    const { error: createInputsError } = await (supabase as any)
      .from('cog_job_inputs')
      .insert(newInputs);

    if (createInputsError) throw createInputsError;
  }

  return newJob as CogJob;
}

// ============================================================================
// Tag Group Operations (Client)
// ============================================================================

/**
 * Create a new tag group - client-side
 */
export async function createTagGroup(input: CogTagGroupInsert): Promise<CogTagGroup> {
  const { data, error } = await (supabase as any)
    .from('cog_tag_groups')
    .insert({
      name: input.name,
      color: input.color || null,
      position: input.position || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogTagGroup;
}

/**
 * Update a tag group - client-side
 */
export async function updateTagGroup(id: string, updates: CogTagGroupUpdate): Promise<CogTagGroup> {
  const { data, error } = await (supabase as any)
    .from('cog_tag_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogTagGroup;
}

/**
 * Delete a tag group - client-side
 */
export async function deleteTagGroup(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_tag_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder tag groups - client-side
 */
export async function reorderTagGroups(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('cog_tag_groups')
      .update({ position: update.position })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================================================
// Tag Operations (Client)
// ============================================================================

/**
 * Create a new tag - client-side
 */
export async function createTag(input: CogTagInsert): Promise<CogTag> {
  const { data, error } = await (supabase as any)
    .from('cog_tags')
    .insert({
      series_id: input.series_id || null,
      group_id: input.group_id || null,
      name: input.name,
      shortcut: input.shortcut || null,
      color: input.color || null,
      position: input.position || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogTag;
}

/**
 * Update a tag - client-side
 */
export async function updateTag(id: string, updates: CogTagUpdate): Promise<CogTag> {
  const { data, error } = await (supabase as any)
    .from('cog_tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogTag;
}

/**
 * Delete a tag - client-side
 */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_tags')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder tags within a group - client-side
 */
export async function reorderTags(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('cog_tags')
      .update({ position: update.position })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================================================
// Series Tag Operations (Client)
// ============================================================================

/**
 * Enable a global tag for a series - client-side
 */
export async function enableTagForSeries(seriesId: string, tagId: string, position?: number): Promise<CogSeriesTag> {
  // Get current max position if not provided
  let pos = position;
  if (pos === undefined) {
    const { data: existing } = await (supabase as any)
      .from('cog_series_tags')
      .select('position')
      .eq('series_id', seriesId)
      .order('position', { ascending: false })
      .limit(1);

    pos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
  }

  const { data, error } = await (supabase as any)
    .from('cog_series_tags')
    .insert({
      series_id: seriesId,
      tag_id: tagId,
      position: pos,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogSeriesTag;
}

/**
 * Disable a global tag for a series - client-side
 */
export async function disableTagForSeries(seriesId: string, tagId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_series_tags')
    .delete()
    .eq('series_id', seriesId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Reorder enabled tags for a series - client-side
 */
export async function reorderSeriesTags(seriesId: string, orderedTagIds: string[]): Promise<void> {
  for (let i = 0; i < orderedTagIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_series_tags')
      .update({ position: i })
      .eq('series_id', seriesId)
      .eq('tag_id', orderedTagIds[i]);

    if (error) throw error;
  }
}

// ============================================================================
// Image Tag Operations (Client)
// ============================================================================

/**
 * Add a tag to an image - client-side
 */
export async function addTagToImage(imageId: string, tagId: string): Promise<CogImageTag> {
  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .insert({
      image_id: imageId,
      tag_id: tagId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogImageTag;
}

/**
 * Remove a tag from an image - client-side
 */
export async function removeTagFromImage(imageId: string, tagId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_image_tags')
    .delete()
    .eq('image_id', imageId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Toggle a tag on/off for an image - client-side
 * Returns true if tag was added, false if removed
 */
export async function toggleImageTag(imageId: string, tagId: string): Promise<boolean> {
  // Check if tag is currently applied
  const { data: existing } = await (supabase as any)
    .from('cog_image_tags')
    .select('id')
    .eq('image_id', imageId)
    .eq('tag_id', tagId)
    .single();

  if (existing) {
    // Tag exists, remove it
    await removeTagFromImage(imageId, tagId);
    return false;
  } else {
    // Tag doesn't exist, add it
    await addTagToImage(imageId, tagId);
    return true;
  }
}

/**
 * Get all tags for an image - client-side
 */
export async function getImageTags(imageId: string): Promise<CogTag[]> {
  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .select('tag:cog_tags(*)')
    .eq('image_id', imageId);

  if (error) throw error;
  return (data || []).map((row: { tag: CogTag }) => row.tag);
}

/**
 * Batch get tags for multiple images - client-side
 */
export async function getImageTagsBatch(imageIds: string[]): Promise<Map<string, CogTag[]>> {
  if (imageIds.length === 0) return new Map();

  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .select('image_id, tag:cog_tags(*)')
    .in('image_id', imageIds);

  if (error) throw error;

  const tagsByImage = new Map<string, CogTag[]>();
  for (const row of data || []) {
    const existing = tagsByImage.get(row.image_id) || [];
    existing.push(row.tag);
    tagsByImage.set(row.image_id, existing);
  }

  return tagsByImage;
}

// ============================================================================
// Image Versioning Operations (Client)
// ============================================================================

/**
 * Get the full version chain for an image - client-side
 * Returns array from root to latest descendant
 */
export async function getImageVersionChain(imageId: string): Promise<CogImage[]> {
  // First get the image to find its series
  const { data: image, error: imageError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  // Get all images in this series
  const { data: allImages, error: allError } = await (supabase as any)
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

  // Find the root
  let root = image;
  while (root.parent_image_id) {
    const parent = imageMap.get(root.parent_image_id);
    if (!parent) break;
    root = parent;
  }

  // Build chain from root through this image to latest
  function findPathToTarget(currentId: string, targetId: string, path: CogImage[]): CogImage[] | null {
    if (currentId === targetId) return path;
    const children = childrenMap.get(currentId) || [];
    for (const child of children) {
      const result = findPathToTarget(child.id, targetId, [...path, child]);
      if (result) return result;
    }
    return null;
  }

  const pathToTarget = findPathToTarget(root.id, imageId, [root]);

  if (pathToTarget) {
    // Extend from target to latest
    let current = imageMap.get(imageId)!;
    const result = [...pathToTarget];
    while (true) {
      const children = childrenMap.get(current.id) || [];
      if (children.length === 0) break;
      const latestChild = children.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      result.push(latestChild);
      current = latestChild;
    }
    return result;
  }

  // Fallback: full chain from root
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

/**
 * Get a single image by ID - client-side
 */
export async function getImageById(id: string): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogImage;
}
