/**
 * Luv Stage — Client-side scene data layer
 */

import { supabase } from '@/lib/supabase';
import { mapSceneRow, type LuvSceneRow, type SceneDescriptor } from './types';

export async function getScenes(): Promise<SceneDescriptor[]> {
  const { data, error } = await (supabase as any)
    .from('luv_scenes')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data as LuvSceneRow[]).map(mapSceneRow);
}

export async function getSceneBySlug(slug: string): Promise<SceneDescriptor | null> {
  const { data, error } = await (supabase as any)
    .from('luv_scenes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSceneRow(data as LuvSceneRow) : null;
}

/** Get scenes that reference a specific module (required or optional) */
export async function getScenesForModule(moduleSlug: string): Promise<SceneDescriptor[]> {
  const { data, error } = await (supabase as any)
    .from('luv_scenes')
    .select('*')
    .or(`required_modules.cs.{${moduleSlug}},optional_modules.cs.{${moduleSlug}}`)
    .order('name');

  if (error) throw error;
  return (data as LuvSceneRow[]).map(mapSceneRow);
}
