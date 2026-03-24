import { createClient } from '../../supabase-server';
import type { CogSeries, CogSeriesInsert, CogSeriesWithImages } from '../../types/cog';

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

export async function getAllSeriesServer(): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

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
 * Create a new series - server-side
 */
export async function createSeriesServer(input: CogSeriesInsert): Promise<CogSeries> {
  const client = await createClient();
  const { data, error } = await (client as any)
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
 * Set the primary image for a series - server-side
 */
export async function setSeriesPrimaryImageServer(seriesId: string, imageId: string | null): Promise<CogSeries> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .update({ primary_image_id: imageId })
    .eq('id', seriesId)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}
