/**
 * Luv Stage — Server-side scene data layer
 *
 * Read-only functions for fetching scene descriptors from the database.
 */

import { createClient } from '@/lib/supabase-server';
import { mapSceneRow, type LuvSceneRow, type SceneDescriptor, type SceneCategory } from './types';

export async function getScenesServer(): Promise<SceneDescriptor[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_scenes')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data as LuvSceneRow[]).map(mapSceneRow);
}

export async function getSceneBySlugServer(slug: string): Promise<SceneDescriptor | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_scenes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSceneRow(data as LuvSceneRow) : null;
}

export async function getScenesByCategoryServer(category: SceneCategory): Promise<SceneDescriptor[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_scenes')
    .select('*')
    .eq('category', category)
    .order('name');

  if (error) throw error;
  return (data as LuvSceneRow[]).map(mapSceneRow);
}
