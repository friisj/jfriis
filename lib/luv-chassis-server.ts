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
 * Looks up images in the Luv Chassis cog series tagged with module slugs.
 */
export async function getCanonicalImagesForModulesServer(
  moduleSlugs: string[]
): Promise<{ storagePath: string; moduleSlug: string; description: string | null }[]> {
  if (moduleSlugs.length === 0) return [];
  const client = await createClient();

  // Find the Luv Chassis series
  const { getLuvSeriesServer } = await import('./luv/cog-integration-server');
  const chassisSeriesId = await getLuvSeriesServer('chassis');
  if (!chassisSeriesId) {
    console.warn('[chassis-study] No chassis series found');
    return [];
  }

  // Find tag IDs for the requested module slugs
  const { data: tags } = await (client as any)
    .from('cog_tags')
    .select('id, name')
    .in('name', moduleSlugs);

  if (!tags || tags.length === 0) return [];

  const tagNameById = new Map<string, string>();
  for (const t of tags) {
    tagNameById.set(t.id, t.name);
  }

  // Get all image IDs tagged with any of these module tags
  const { data: taggedRows } = await (client as any)
    .from('cog_image_tags')
    .select('image_id, tag_id')
    .in('tag_id', tags.map((t: { id: string }) => t.id));

  if (!taggedRows || taggedRows.length === 0) return [];

  // Map image_id → module slug(s)
  const imageToSlug = new Map<string, string>();
  for (const row of taggedRows) {
    if (!imageToSlug.has(row.image_id)) {
      imageToSlug.set(row.image_id, tagNameById.get(row.tag_id) ?? moduleSlugs[0]);
    }
  }

  // Fetch the actual images from the chassis series
  const imageIds = [...imageToSlug.keys()];
  const { data: images } = await (client as any)
    .from('cog_images')
    .select('id, storage_path')
    .eq('series_id', chassisSeriesId)
    .in('id', imageIds)
    .order('created_at', { ascending: false });

  if (!images || images.length === 0) return [];

  return images.map((img: { id: string; storage_path: string }) => ({
    storagePath: img.storage_path,
    moduleSlug: imageToSlug.get(img.id) ?? moduleSlugs[0],
    description: null,
  }));
}
