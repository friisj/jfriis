import { createClient } from '../../supabase-server';
import type { CogImage, CogImageInsert } from '../../types/cog';

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
 * Move an image to a different series - server-side
 */
export async function moveImageToSeriesServer(imageId: string, targetSeriesId: string): Promise<CogImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_images')
    .update({ series_id: targetSeriesId, group_id: imageId })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Copy an image to a different series - server-side
 */
export async function copyImageToSeriesServer(
  imageId: string,
  targetSeriesId: string,
  metadata?: Record<string, unknown>,
): Promise<CogImage> {
  const client = await createClient();
  const original = await getImageByIdServer(imageId);

  const { data: fileData, error: dlError } = await client.storage
    .from('cog-images')
    .download(original.storage_path);

  if (dlError || !fileData) throw new Error(`Download failed: ${dlError?.message}`);

  const ext = original.storage_path.split('.').pop() ?? 'png';
  const dir = original.storage_path.substring(0, original.storage_path.lastIndexOf('/'));
  const newPath = `${dir}/copy-${crypto.randomUUID()}.${ext}`;

  const { error: ulError } = await client.storage
    .from('cog-images')
    .upload(newPath, fileData, {
      contentType: original.mime_type || 'image/png',
      upsert: false,
    });

  if (ulError) throw new Error(`Upload failed: ${ulError.message}`);

  return createImageServer({
    series_id: targetSeriesId,
    parent_image_id: imageId,
    storage_path: newPath,
    filename: original.filename,
    mime_type: original.mime_type,
    width: original.width,
    height: original.height,
    file_size: original.file_size,
    source: original.source,
    prompt: original.prompt,
    metadata: { ...((original.metadata as Record<string, unknown>) ?? {}), ...(metadata ?? {}) },
  });
}
