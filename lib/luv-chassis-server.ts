/**
 * Luv: Chassis Module Server-side reads
 */

import { createClient } from './supabase-server';
import type { LuvChassisModule, LuvChassisModuleMedia, LuvChassisStudy } from './types/luv-chassis';

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

export async function getChassisModulesBySlugsServer(
  slugs: string[]
): Promise<LuvChassisModule[]> {
  if (slugs.length === 0) return [];
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_modules')
    .select('*')
    .in('slug', slugs)
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

export async function getChassisModuleMediaServer(
  moduleId: string
): Promise<LuvChassisModuleMedia[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_module_media')
    .select('*')
    .eq('module_id', moduleId)
    .order('parameter_key', { ascending: true });

  if (error) throw error;
  return data as LuvChassisModuleMedia[];
}

export interface ChassisChangeEntry {
  version_id: string;
  module_id: string;
  module_name: string;
  module_slug: string;
  version: number;
  change_summary: string | null;
  created_at: string;
  parameters: Record<string, unknown>;
}

export async function getRecentChassisChangesServer(
  limit = 50
): Promise<ChassisChangeEntry[]> {
  const client = await createClient();

  // Use Supabase foreign key join to fetch versions with module data in one query
  const { data: versions, error: vErr } = await (client as any)
    .from('luv_chassis_module_versions')
    .select('id, module_id, version, parameters, change_summary, created_at, luv_chassis_modules(name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (vErr?.code === 'PGRST205') return []; // table not yet created
  if (vErr) throw vErr;
  if (!versions || versions.length === 0) return [];

  return versions.map((v: { id: string; module_id: string; version: number; parameters: Record<string, unknown>; change_summary: string | null; created_at: string; luv_chassis_modules: { name: string; slug: string } | null }) => ({
    version_id: v.id,
    module_id: v.module_id,
    module_name: v.luv_chassis_modules?.name ?? 'Unknown',
    module_slug: v.luv_chassis_modules?.slug ?? 'unknown',
    version: v.version,
    change_summary: v.change_summary,
    created_at: v.created_at,
    parameters: v.parameters,
  }));
}

// ============================================================================
// Studies
// ============================================================================

export async function getStudiesServer(): Promise<LuvChassisStudy[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error?.code === 'PGRST205') return []; // table not yet created
  if (error) throw error;
  return data as LuvChassisStudy[];
}

export async function getStudyBySlugServer(
  slug: string
): Promise<LuvChassisStudy | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error?.code === 'PGRST205') return null; // table not yet created
  if (error) throw error;
  return data as LuvChassisStudy | null;
}

export async function getStudiesForModuleServer(
  moduleId: string
): Promise<LuvChassisStudy[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('module_id', moduleId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });

  if (error?.code === 'PGRST205') return []; // table not yet created
  if (error) throw error;
  return data as LuvChassisStudy[];
}
