/**
 * Luv: Chassis Module Client-side CRUD
 */

import { supabase } from './supabase';
import type {
  LuvChassisModule,
  LuvChassisModuleVersion,
  LuvChassisModuleMedia,
  LuvChassisContextPack,
  LuvChassisStudy,
  CreateChassisModuleInput,
  UpdateChassisModuleInput,
  CreateContextPackInput,
  UpdateContextPackInput,
  CreateStudyInput,
  UpdateStudyInput,
} from './types/luv-chassis';

// NOTE: luv_chassis_* tables not in generated Supabase types

// ============================================================================
// Modules
// ============================================================================

export async function getChassisModules(): Promise<LuvChassisModule[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_modules')
    .select('*')
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data as LuvChassisModule[];
}

export async function getChassisModule(
  id: string
): Promise<LuvChassisModule> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvChassisModule;
}

export async function getChassisModuleBySlug(
  slug: string
): Promise<LuvChassisModule | null> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_modules')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as LuvChassisModule | null;
}

export async function createChassisModule(
  input: CreateChassisModuleInput
): Promise<LuvChassisModule> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_modules')
    .insert({
      slug: input.slug,
      name: input.name,
      category: input.category ?? 'general',
      description: input.description ?? null,
      parameters: input.parameters ?? {},
      parameter_schema: input.parameter_schema ?? [],
      sequence: input.sequence ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisModule;
}

export async function updateChassisModule(
  id: string,
  updates: UpdateChassisModuleInput
): Promise<LuvChassisModule> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisModule;
}

export async function deleteChassisModule(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_chassis_modules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Versions
// ============================================================================

export async function getModuleVersions(
  moduleId: string
): Promise<LuvChassisModuleVersion[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_module_versions')
    .select('*')
    .eq('module_id', moduleId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data as LuvChassisModuleVersion[];
}

export async function createModuleVersion(
  moduleId: string,
  version: number,
  parameters: Record<string, unknown>,
  changeSummary?: string
): Promise<LuvChassisModuleVersion> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_module_versions')
    .insert({
      module_id: moduleId,
      version,
      parameters,
      change_summary: changeSummary ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisModuleVersion;
}

// ============================================================================
// Media
// ============================================================================

export async function getChassisModuleMedia(
  moduleId: string
): Promise<LuvChassisModuleMedia[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_module_media')
    .select('*')
    .eq('module_id', moduleId)
    .order('parameter_key', { ascending: true });

  if (error) throw error;
  return data as LuvChassisModuleMedia[];
}

export async function createChassisModuleMedia(input: {
  module_id: string;
  parameter_key: string;
  type: string;
  storage_path: string;
  description?: string;
}): Promise<LuvChassisModuleMedia> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_module_media')
    .insert({
      module_id: input.module_id,
      parameter_key: input.parameter_key,
      type: input.type,
      storage_path: input.storage_path,
      description: input.description ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisModuleMedia;
}

export async function deleteChassisModuleMedia(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_chassis_module_media')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Save with version snapshot
// ============================================================================

export async function saveModuleWithVersion(
  id: string,
  parameters: Record<string, unknown>,
  changeSummary?: string
): Promise<LuvChassisModule> {
  const current = await getChassisModule(id);
  const newVersion = current.current_version + 1;

  // Create version snapshot
  await createModuleVersion(id, newVersion, parameters, changeSummary);

  // Update module
  return updateChassisModule(id, {
    parameters,
    current_version: newVersion,
  });
}

// ============================================================================
// Context Packs
// ============================================================================

export async function getContextPacks(
  moduleId: string
): Promise<LuvChassisContextPack[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_context_packs')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvChassisContextPack[];
}

export async function getContextPack(
  id: string
): Promise<LuvChassisContextPack> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_context_packs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvChassisContextPack;
}

export async function createContextPack(
  input: CreateContextPackInput
): Promise<LuvChassisContextPack> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_context_packs')
    .insert({
      module_id: input.module_id,
      version: input.version,
      generation_prompt: input.generation_prompt,
      evaluation_criteria: input.evaluation_criteria ?? [],
      status: input.status ?? 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisContextPack;
}

export async function updateContextPack(
  id: string,
  updates: UpdateContextPackInput
): Promise<LuvChassisContextPack> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_context_packs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisContextPack;
}

export async function deleteContextPack(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_chassis_context_packs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Studies
// ============================================================================

export async function getStudies(): Promise<LuvChassisStudy[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as LuvChassisStudy[];
}

export async function getStudy(id: string): Promise<LuvChassisStudy> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvChassisStudy;
}

export async function getStudyBySlug(slug: string): Promise<LuvChassisStudy | null> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as LuvChassisStudy | null;
}

export async function createStudy(input: CreateStudyInput): Promise<LuvChassisStudy> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .insert({
      title: input.title,
      slug: input.slug,
      module_id: input.module_id ?? null,
      focus_area: input.focus_area ?? '',
      findings: input.findings ?? [],
      parameter_constraints: input.parameter_constraints ?? {},
      status: input.status ?? 'in_progress',
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisStudy;
}

export async function updateStudy(
  id: string,
  updates: UpdateStudyInput
): Promise<LuvChassisStudy> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvChassisStudy;
}

export async function deleteStudy(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_chassis_studies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getStudiesForModule(
  moduleId: string
): Promise<LuvChassisStudy[]> {
  const { data, error } = await (supabase as any)
    .from('luv_chassis_studies')
    .select('*')
    .eq('module_id', moduleId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as LuvChassisStudy[];
}
