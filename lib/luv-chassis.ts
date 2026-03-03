/**
 * Luv: Chassis Module Client-side CRUD
 */

import { supabase } from './supabase';
import type {
  LuvChassisModule,
  LuvChassisModuleVersion,
  CreateChassisModuleInput,
  UpdateChassisModuleInput,
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
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data as LuvChassisModule;
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
      schema_key: input.schema_key,
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
