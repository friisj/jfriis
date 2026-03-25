/**
 * Luv: Chassis Module Server-side reads
 */

import { createClient } from './supabase-server';
import type { LuvChassisModule, LuvChassisModuleMedia, LuvChassisStudy, CreateStudyInput, UpdateStudyInput } from './types/luv-chassis';

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

export async function getStudiesServer(limit = 50): Promise<LuvChassisStudy[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

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

export async function getStudiesByModuleSlugsServer(
  slugs: string[],
  limit = 50,
): Promise<LuvChassisStudy[]> {
  if (slugs.length === 0) return [];
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .overlaps('module_slugs', slugs)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error?.code === 'PGRST205') return [];
  if (error) throw error;
  return data as LuvChassisStudy[];
}

export async function createStudyServer(
  input: CreateStudyInput
): Promise<LuvChassisStudy> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .insert({
      title: input.title,
      slug: input.slug,
      module_id: input.module_id ?? null,
      module_slugs: input.module_slugs ?? [],
      focus_area: input.focus_area ?? '',
      goal: input.goal ?? null,
      style: input.style ?? null,
      dynamics: input.dynamics ?? null,
      user_prompt: input.user_prompt ?? null,
      aspect_ratio: input.aspect_ratio ?? '3:4',
      image_size: input.image_size ?? '2K',
      model: input.model ?? 'nano-banana-pro',
      findings: input.findings ?? [],
      parameter_constraints: input.parameter_constraints ?? {},
      status: input.status ?? 'briefing',
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisStudy;
}

export async function updateStudyServer(
  id: string,
  input: UpdateStudyInput
): Promise<LuvChassisStudy> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisStudy;
}

export async function getStudyServer(
  id: string
): Promise<LuvChassisStudy | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LuvChassisStudy | null;
}

/**
 * Fetch canonical/reference images for given chassis module slugs.
 * Looks in luv_chassis_module_media and luv_references tagged with module slugs.
 */
export async function getCanonicalImagesForModulesServer(
  moduleSlugs: string[]
): Promise<{ storagePath: string; moduleSlug: string; description: string | null }[]> {
  if (moduleSlugs.length === 0) return [];
  const client = await createClient();

  // Get modules by slug to find IDs
  const { data: modules, error: modErr } = await (client as any)
    .from('luv_chassis_modules')
    .select('id, slug')
    .in('slug', moduleSlugs);

  if (modErr) throw modErr;
  if (!modules || modules.length === 0) return [];

  const moduleIdToSlug = new Map<string, string>();
  for (const m of modules) {
    moduleIdToSlug.set(m.id, m.slug);
  }

  // Fetch module media (canonical images attached to modules)
  const moduleIds = modules.map((m: { id: string }) => m.id);
  const { data: media, error: mediaErr } = await (client as any)
    .from('luv_chassis_module_media')
    .select('storage_path, module_id, description')
    .in('module_id', moduleIds)
    .eq('type', 'image');

  if (mediaErr && mediaErr.code !== 'PGRST205') throw mediaErr;

  const results: { storagePath: string; moduleSlug: string; description: string | null }[] = [];
  for (const item of media ?? []) {
    results.push({
      storagePath: item.storage_path,
      moduleSlug: moduleIdToSlug.get(item.module_id) ?? 'unknown',
      description: item.description,
    });
  }

  // Also fetch luv_references tagged with module slugs
  const { data: refs, error: refErr } = await (client as any)
    .from('luv_references')
    .select('storage_path, tags, description')
    .eq('type', 'canonical')
    .overlaps('tags', moduleSlugs);

  if (refErr && refErr.code !== 'PGRST205') {
    console.warn('[chassis-study] Failed to fetch references:', refErr);
  } else if (refs) {
    for (const ref of refs) {
      const matchingSlug = moduleSlugs.find((s) => ref.tags?.includes(s)) ?? moduleSlugs[0];
      results.push({
        storagePath: ref.storage_path,
        moduleSlug: matchingSlug,
        description: ref.description,
      });
    }
  }

  return results;
}
