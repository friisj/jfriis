import { createClient } from '../../supabase-server';
import type {
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
} from '../../types/cog';

// ============================================================================
// Photographer Config Operations (Server)
// ============================================================================

/**
 * Get a single photographer config by ID - server-side
 */
export async function getPhotographerConfigByIdServer(id: string): Promise<CogPhotographerConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_photographer_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Get all photographer configs (global library) - server-side
 */
export async function getAllPhotographerConfigsServer(): Promise<CogPhotographerConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_photographer_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogPhotographerConfig[];
}

// ============================================================================
// Director Config Operations (Server)
// ============================================================================

/**
 * Get a single director config by ID - server-side
 */
export async function getDirectorConfigByIdServer(id: string): Promise<CogDirectorConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_director_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Get all director configs (global library) - server-side
 */
export async function getAllDirectorConfigsServer(): Promise<CogDirectorConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_director_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogDirectorConfig[];
}

// ============================================================================
// Production Config Operations (Server)
// ============================================================================

/**
 * Get a single production config by ID - server-side
 */
export async function getProductionConfigByIdServer(id: string): Promise<CogProductionConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_production_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Get all production configs (global library) - server-side
 */
export async function getAllProductionConfigsServer(): Promise<CogProductionConfig[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_production_configs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogProductionConfig[];
}
