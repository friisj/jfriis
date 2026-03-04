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

  // Fetch recent versions
  const { data: versions, error: vErr } = await (client as any)
    .from('luv_chassis_module_versions')
    .select('id, module_id, version, parameters, change_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (vErr) throw vErr;
  if (!versions || versions.length === 0) return [];

  // Fetch module names for joining
  const moduleIds = [...new Set(versions.map((v: { module_id: string }) => v.module_id))];
  const { data: modules, error: mErr } = await (client as any)
    .from('luv_chassis_modules')
    .select('id, name, slug')
    .in('id', moduleIds);

  if (mErr) throw mErr;

  const moduleMap = new Map(
    (modules ?? []).map((m: { id: string; name: string; slug: string }) => [m.id, m])
  );

  return versions.map((v: { id: string; module_id: string; version: number; parameters: Record<string, unknown>; change_summary: string | null; created_at: string }) => {
    const mod = moduleMap.get(v.module_id) ?? { name: 'Unknown', slug: 'unknown' };
    return {
      version_id: v.id,
      module_id: v.module_id,
      module_name: (mod as { name: string }).name,
      module_slug: (mod as { slug: string }).slug,
      version: v.version,
      change_summary: v.change_summary,
      created_at: v.created_at,
      parameters: v.parameters,
    };
  });
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

  if (error) throw error;
  return data as LuvChassisStudy | null;
}
