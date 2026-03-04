/**
 * Luv: Chassis Module Server-side reads
 */

import { createClient } from './supabase-server';
import type { LuvChassisModule } from './types/luv-chassis';

// NOTE: luv_chassis_* tables not in generated Supabase types

export async function getChassisModulesServer(): Promise<LuvChassisModule[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_modules')
    .select('*')
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data as LuvChassisModule[];
}

export async function getChassisModuleServer(
  id: string
): Promise<LuvChassisModule | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data as LuvChassisModule;
}

export async function getChassisModuleBySlugServer(
  slug: string
): Promise<LuvChassisModule | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_modules')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as LuvChassisModule | null;
}
