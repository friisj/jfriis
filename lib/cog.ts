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
  CogPipelineStep,
  CogPipelineStepInsert,
  CogPipelineStepOutput,
  CogPipelineStepOutputInsert,
  CogPhotographerConfig,
  CogPhotographerConfigInsert,
  CogPhotographerConfigUpdate,
  CogDirectorConfig,
  CogDirectorConfigInsert,
  CogDirectorConfigUpdate,
  CogProductionConfig,
  CogProductionConfigInsert,
  CogProductionConfigUpdate,
  CogPipelineBaseCandidate,
  InferenceStepConfigs,
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

/**
 * Get the appropriate thumbnail URL for an image
 * Falls back to original image if thumbnail not available
 * @param originalPath - Original image storage path
 * @param thumbnailPath - Thumbnail storage path (if available)
 * @param size - Thumbnail size to use (256, 128, or 64)
 */
export function getCogThumbnailUrl(
  originalPath: string,
  thumbnailPath?: string | null,
  size: 256 | 128 | 64 = 256
): string {
  // Use thumbnail if available, otherwise fall back to original
  const path = thumbnailPath || originalPath;
  return getCogImageUrl(path);
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
 * If group_id is not provided and parent_image_id is set, inherits parent's group_id
 * If neither is set, the DB trigger sets group_id to the new image's id
 */
export async function createImage(input: CogImageInsert): Promise<CogImage> {
  // If parent_image_id is provided but group_id isn't, fetch parent's group_id
  let groupId = input.group_id;
  if (!groupId && input.parent_image_id) {
    const { data: parent } = await (supabase as any)
      .from('cog_images')
      .select('group_id')
      .eq('id', input.parent_image_id)
      .single();
    if (parent?.group_id) {
      groupId = parent.group_id;
    }
  }

  const { data, error } = await (supabase as any)
    .from('cog_images')
    .insert({
      series_id: input.series_id,
      job_id: input.job_id || null,
      parent_image_id: input.parent_image_id || null,
      group_id: groupId || null, // null lets DB trigger set it to own id
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
 * - Re-parenting children to this image's parent (preserves provenance chain)
 * - Re-grouping: if this is the group primary, reassign group to first remaining member
 * - Clearing primary_image_id if this is the primary image for the series
 * - Removing from storage
 * - Deleting the database record
 */
export async function deleteImageWithCleanup(id: string): Promise<void> {
  // 1. Fetch the image to get storage_path, parent_image_id, group_id, and series_id
  const { data: image, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('storage_path, parent_image_id, group_id, series_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Re-parent any children to this image's parent (for provenance tracking)
  const { error: reparentError } = await (supabase as any)
    .from('cog_images')
    .update({ parent_image_id: image.parent_image_id })
    .eq('parent_image_id', id);

  if (reparentError) throw reparentError;

  // 3. Handle group reassignment if this is the group primary
  const groupId = image.group_id || id;
  if (id === groupId) {
    // This image is the group primary - find other group members
    const { data: groupMembers, error: groupError } = await (supabase as any)
      .from('cog_images')
      .select('id, created_at')
      .eq('group_id', groupId)
      .neq('id', id)
      .order('created_at', { ascending: true });

    if (!groupError && groupMembers && groupMembers.length > 0) {
      // Reassign group_id for all remaining members to the oldest one
      const newGroupPrimary = groupMembers[0].id;
      const memberIds = groupMembers.map((m: { id: string }) => m.id);

      const { error: regroupError } = await (supabase as any)
        .from('cog_images')
        .update({ group_id: newGroupPrimary })
        .in('id', memberIds);

      if (regroupError) {
        console.error('Failed to reassign group (continuing):', regroupError);
      }
    }
  }

  // 4. Clear primary_image_id if this is the primary image for the series
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

  // 5. Delete from storage (fatal - don't leave orphaned DB records)
  if (image.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('cog-images')
      .remove([image.storage_path]);

    if (storageError) {
      throw new Error(`Storage cleanup failed: ${storageError.message}`);
    }
  }

  // 6. Delete the database record
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
// Pipeline Job Operations (Client)
// ============================================================================

/**
 * Create a pipeline job with steps - client-side
 */
export async function createPipelineJob(input: {
  series_id: string;
  title: string | null;
  initial_images: string[] | null;
  base_prompt: string;
  negative_prompt?: string | null;
  // Pipeline config references
  photographer_config_id?: string | null;
  director_config_id?: string | null;
  production_config_id?: string | null;
  // Inference execution controls
  inference_model?: string | null;
  use_thinking_infer4?: boolean;
  use_thinking_infer6?: boolean;
  max_reference_images?: number;
  // Two-phase execution controls
  num_base_images?: number;
  foundation_model?: string;
  aspect_ratio?: string;
  // Inference input arrays
  colors?: string[] | null;
  themes?: string[] | null;
  // Per-step inference overrides
  inference_step_configs?: InferenceStepConfigs | null;
  steps?: CogPipelineStepInsert[];
}): Promise<{ job: CogJob; steps: CogPipelineStep[] }> {
  // Create the job first
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title,
      base_prompt: input.base_prompt,
      negative_prompt: input.negative_prompt || null,
      job_type: 'pipeline',
      initial_images: input.initial_images,
      status: 'draft',
      image_model: 'auto', // Default values for required fields
      image_size: '2K',
      aspect_ratio: input.aspect_ratio || '1:1',
      use_thinking: false,
      // Pipeline config references
      photographer_config_id: input.photographer_config_id || null,
      director_config_id: input.director_config_id || null,
      production_config_id: input.production_config_id || null,
      // Inference execution controls
      inference_model: input.inference_model || null,
      use_thinking_infer4: input.use_thinking_infer4 ?? true,
      use_thinking_infer6: input.use_thinking_infer6 ?? true,
      max_reference_images: input.max_reference_images ?? 3,
      // Two-phase execution controls
      num_base_images: input.num_base_images ?? 3,
      foundation_model: input.foundation_model || 'gemini-3-pro-image',
      // Inference input arrays
      colors: input.colors || null,
      themes: input.themes || null,
      // Per-step inference overrides
      inference_step_configs: input.inference_step_configs || null,
    })
    .select()
    .single();

  if (jobError) throw jobError;

  // Create the steps (if provided)
  if (input.steps && input.steps.length > 0) {
    const stepsToInsert = input.steps.map((step) => ({
      job_id: job.id,
      step_order: step.step_order,
      step_type: step.step_type,
      model: step.model,
      config: step.config,
      status: step.status || 'pending',
    }));

    const { data: steps, error: stepsError } = await (supabase as any)
      .from('cog_pipeline_steps')
      .insert(stepsToInsert)
      .select();

    if (stepsError) throw stepsError;

    return { job: job as CogJob, steps: steps as CogPipelineStep[] };
  }

  return { job: job as CogJob, steps: [] };
}

/**
 * Replace all pipeline steps on a job (delete existing + outputs, insert new).
 * Only allowed when the sequence is not currently running.
 */
export async function savePipelineSteps(
  jobId: string,
  steps: Array<Omit<CogPipelineStepInsert, 'job_id'>>
): Promise<CogPipelineStep[]> {
  // Delete existing step outputs first
  const { data: existingSteps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (existingSteps && existingSteps.length > 0) {
    const stepIds = existingSteps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }

  // Delete existing steps
  await (supabase as any)
    .from('cog_pipeline_steps')
    .delete()
    .eq('job_id', jobId);

  // Insert new steps
  if (steps.length === 0) return [];

  const stepsToInsert = steps.map((step, idx) => ({
    job_id: jobId,
    step_order: idx,
    step_type: step.step_type,
    model: step.model,
    config: step.config,
    status: 'pending',
  }));

  const { data: newSteps, error } = await (supabase as any)
    .from('cog_pipeline_steps')
    .insert(stepsToInsert)
    .select();

  if (error) throw error;
  return newSteps as CogPipelineStep[];
}

/**
 * Update pipeline job configuration fields. Only works on draft jobs.
 */
export async function updatePipelineJob(jobId: string, input: {
  title?: string | null;
  base_prompt?: string;
  negative_prompt?: string | null;
  initial_images?: string[] | null;
  photographer_config_id?: string | null;
  director_config_id?: string | null;
  production_config_id?: string | null;
  colors?: string[] | null;
  themes?: string[] | null;
  num_base_images?: number;
  foundation_model?: string;
  aspect_ratio?: string;
  inference_step_configs?: InferenceStepConfigs | null;
}): Promise<CogJob> {
  const { data: job, error } = await (supabase as any)
    .from('cog_jobs')
    .update(input)
    .eq('id', jobId)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) throw error;
  return job as CogJob;
}

/**
 * Create a pipeline step output - client-side
 */
export async function createPipelineStepOutput(input: CogPipelineStepOutputInsert): Promise<CogPipelineStepOutput> {
  const { data, error } = await (supabase as any)
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

// ============================================================================
// Image Grouping Operations (Client)
// ============================================================================

/**
 * Get all images in the same group - client-side
 * Returns images in the group ordered by group_position (if set), then by created_at
 */
export async function getImageGroup(imageId: string): Promise<CogImage[]> {
  // First get the image to find its group_id
  const { data: image, error: imageError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  const groupId = image.group_id || image.id;

  // Get all images in this group
  const { data: groupImages, error: groupError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('group_id', groupId);

  if (groupError) throw groupError;

  // If no images found with group_id, fallback to legacy parent chain
  if (!groupImages || groupImages.length === 0) {
    return await getImageGroupLegacy(image);
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
async function getImageGroupLegacy(image: CogImage): Promise<CogImage[]> {
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

  // Build chain from root following creation time
  const chain: CogImage[] = [root];
  let current = root;
  while (true) {
    const children = childrenMap.get(current.id) || [];
    if (children.length === 0) break;
    const oldest = children.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    chain.push(oldest);
    current = oldest;
  }
  return chain;
}

// Legacy alias for backwards compatibility
export const getImageVersionChain = getImageGroup;

/**
 * Remove an image from its group - makes it its own group
 * If removing the group primary (id === group_id), remaining members get a new primary
 * Returns the updated image
 */
export async function removeImageFromGroup(imageId: string): Promise<CogImage> {
  // Get the image to check if it's the group primary
  const { data: image, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('id, group_id')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;

  const currentGroupId = image.group_id || image.id;
  const isGroupPrimary = imageId === currentGroupId;

  // If this image is the group primary, reassign remaining members to a new primary
  if (isGroupPrimary) {
    // Find other group members
    const { data: groupMembers, error: groupError } = await (supabase as any)
      .from('cog_images')
      .select('id, created_at')
      .eq('group_id', currentGroupId)
      .neq('id', imageId)
      .order('created_at', { ascending: true });

    if (!groupError && groupMembers && groupMembers.length > 0) {
      // Reassign all remaining members to the oldest one as new primary
      const newPrimaryId = groupMembers[0].id;
      const memberIds = groupMembers.map((m: { id: string }) => m.id);

      const { error: regroupError } = await (supabase as any)
        .from('cog_images')
        .update({ group_id: newPrimaryId })
        .in('id', memberIds);

      if (regroupError) throw regroupError;
    }
  }

  // Set this image's group_id to its own id (becomes its own group)
  const { data: updatedImage, error: updateError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: imageId })
    .eq('id', imageId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedImage as CogImage;
}

/**
 * Reorder images within a group
 * Takes an array of image IDs in the desired order and updates their group_position
 */
export async function reorderGroupImages(imageIds: string[]): Promise<void> {
  // Update each image's group_position based on its index in the array
  for (let i = 0; i < imageIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_images')
      .update({ group_position: i })
      .eq('id', imageIds[i]);

    if (error) throw error;
  }
}

/**
 * Merge multiple images into a single group
 * The first image in the array becomes the group primary (group_id = its own id)
 * All other images get assigned to that group
 * Returns the new group primary ID
 */
export async function mergeImagesIntoGroup(imageIds: string[]): Promise<string> {
  if (imageIds.length === 0) {
    throw new Error('No images provided');
  }

  if (imageIds.length === 1) {
    // Single image already is its own group
    return imageIds[0];
  }

  // First image becomes the group primary
  const primaryId = imageIds[0];

  // Set the primary image's group_id to itself (in case it was part of another group)
  const { error: primaryError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: primaryId, group_position: 0 })
    .eq('id', primaryId);

  if (primaryError) throw primaryError;

  // Set all other images' group_id to the primary, with sequential positions
  for (let i = 1; i < imageIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_images')
      .update({ group_id: primaryId, group_position: i })
      .eq('id', imageIds[i]);

    if (error) throw error;
  }

  return primaryId;
}

/**
 * Add an image to an existing group
 * The image is added at the end of the group
 */
export async function addImageToGroup(imageId: string, targetGroupId: string): Promise<void> {
  // Get the current max position in the target group
  const { data: groupImages, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('group_position')
    .eq('group_id', targetGroupId)
    .order('group_position', { ascending: false, nullsFirst: false })
    .limit(1);

  if (fetchError) throw fetchError;

  // Calculate the new position (after the last one)
  let newPosition = 0;
  if (groupImages && groupImages.length > 0 && groupImages[0].group_position !== null) {
    newPosition = groupImages[0].group_position + 1;
  } else {
    // No positions set yet, count the images
    const { count } = await (supabase as any)
      .from('cog_images')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', targetGroupId);
    newPosition = count || 0;
  }

  // Update the image's group
  const { error: updateError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: targetGroupId, group_position: newPosition })
    .eq('id', imageId);

  if (updateError) throw updateError;
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

// ============================================================================
// Photographer Config Operations (Client)
// ============================================================================

/**
 * Create a photographer config - client-side
 */
export async function createPhotographerConfig(input: CogPhotographerConfigInsert): Promise<CogPhotographerConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_photographer_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      style_description: input.style_description,
      style_references: input.style_references,
      techniques: input.techniques,
      testbed_notes: input.testbed_notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Update a photographer config - client-side
 */
export async function updatePhotographerConfig(id: string, updates: CogPhotographerConfigUpdate): Promise<CogPhotographerConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_photographer_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Delete a photographer config - client-side
 */
export async function deletePhotographerConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_photographer_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Director Config Operations (Client)
// ============================================================================

/**
 * Create a director config - client-side
 */
export async function createDirectorConfig(input: CogDirectorConfigInsert): Promise<CogDirectorConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_director_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      approach_description: input.approach_description,
      methods: input.methods,
      interview_mapping: input.interview_mapping || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Update a director config - client-side
 */
export async function updateDirectorConfig(id: string, updates: CogDirectorConfigUpdate): Promise<CogDirectorConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_director_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Delete a director config - client-side
 */
export async function deleteDirectorConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_director_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Production Config Operations (Client)
// ============================================================================

/**
 * Create a production config - client-side
 */
export async function createProductionConfig(input: CogProductionConfigInsert): Promise<CogProductionConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_production_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      shoot_details: input.shoot_details,
      editorial_notes: input.editorial_notes,
      costume_notes: input.costume_notes,
      conceptual_notes: input.conceptual_notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Update a production config - client-side
 */
export async function updateProductionConfig(id: string, updates: CogProductionConfigUpdate): Promise<CogProductionConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_production_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Delete a production config - client-side
 */
export async function deleteProductionConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_production_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Base Candidate Operations (Client)
// ============================================================================

/**
 * Create a base candidate record - client-side
 */
export async function createBaseCandidate(input: {
  job_id: string;
  image_id: string;
  candidate_index: number;
}): Promise<CogPipelineBaseCandidate> {
  const { data, error } = await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineBaseCandidate;
}

/**
 * Get base candidates for a pipeline job - client-side
 */
export async function getBaseCandidatesForJob(jobId: string): Promise<CogPipelineBaseCandidate[]> {
  const { data, error } = await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('candidate_index', { ascending: true });

  if (error) throw error;
  return data as CogPipelineBaseCandidate[];
}

/**
 * Select a base image for a pipeline job - client-side
 * Stores the user's choice in cog_jobs.selected_base_image_id
 */
export async function selectBaseImage(jobId: string, imageId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_jobs')
    .update({ selected_base_image_id: imageId })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Reset a pipeline job back to draft state - client-side
 * Clears all progress: resets statuses, deletes outputs, candidates
 */
export async function resetPipelineJobToDraft(jobId: string): Promise<CogJob> {
  // Reset job statuses
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .update({
      status: 'draft',
      foundation_status: 'pending',
      sequence_status: 'pending',
      selected_base_image_id: null,
      synthesized_prompt: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (jobError) throw jobError;

  // Reset all pipeline steps
  const { error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .update({
      status: 'pending',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', jobId);

  if (stepsError) throw stepsError;

  // Delete step outputs
  const { data: steps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (steps && steps.length > 0) {
    const stepIds = steps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }

  // Delete base candidates
  await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .delete()
    .eq('job_id', jobId);

  return job as CogJob;
}

/**
 * Reset pipeline steps to pending state - client-side
 * Used when changing base selection to re-run sequence
 */
export async function resetPipelineSteps(jobId: string): Promise<void> {
  // Reset step statuses
  const { error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .update({
      status: 'pending',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', jobId);

  if (stepsError) throw stepsError;

  // Delete step outputs
  const { data: steps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (steps && steps.length > 0) {
    const stepIds = steps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }
}

/**
 * Duplicate a pipeline job - creates a copy with same config but fresh state
 */
export async function duplicatePipelineJob(jobId: string): Promise<CogJob> {
  // Fetch original job
  const { data: originalJob, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  // Fetch original pipeline steps
  const { data: originalSteps, error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('step_order', { ascending: true });

  if (stepsError) throw stepsError;

  // Create new job (copy pipeline-specific fields, reset status)
  const { data: newJob, error: createError } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: originalJob.series_id,
      title: originalJob.title ? `${originalJob.title} (copy)` : null,
      base_prompt: originalJob.base_prompt,
      negative_prompt: originalJob.negative_prompt || null,
      job_type: 'pipeline',
      initial_images: originalJob.initial_images,
      photographer_config_id: originalJob.photographer_config_id,
      director_config_id: originalJob.director_config_id,
      production_config_id: originalJob.production_config_id,
      inference_model: originalJob.inference_model,
      use_thinking_infer4: originalJob.use_thinking_infer4,
      use_thinking_infer6: originalJob.use_thinking_infer6,
      max_reference_images: originalJob.max_reference_images,
      num_base_images: originalJob.num_base_images,
      foundation_model: originalJob.foundation_model || 'gemini-3-pro-image',
      colors: originalJob.colors,
      themes: originalJob.themes,
      inference_step_configs: originalJob.inference_step_configs || null,
      image_model: 'auto',
      image_size: '2K',
      aspect_ratio: originalJob.aspect_ratio || '1:1',
      use_thinking: false,
      status: 'draft',
    })
    .select()
    .single();

  if (createError) throw createError;

  // Copy steps (reset statuses)
  if (originalSteps && originalSteps.length > 0) {
    const newSteps = originalSteps.map((step: CogPipelineStep) => ({
      job_id: newJob.id,
      step_order: step.step_order,
      step_type: step.step_type,
      model: step.model,
      config: step.config,
      status: 'pending',
    }));

    const { error: createStepsError } = await (supabase as any)
      .from('cog_pipeline_steps')
      .insert(newSteps);

    if (createStepsError) throw createStepsError;
  }

  return newJob as CogJob;
}
