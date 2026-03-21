/**
 * Luv: Soul Modulation Server Functions
 *
 * Server-side database access for luv_soul_configs and luv_soul_presets.
 * Uses the Supabase service-role client (server-only).
 */

import { createClient } from '@/lib/supabase-server';
import { DEFAULT_TRAITS, type SoulTraits, type SoulConfig, type SoulPreset } from '@/lib/luv/soul-modulation';

/**
 * Fetch the current soul trait config for a character.
 * Returns DEFAULT_TRAITS if no history exists.
 */
export async function getCurrentSoulConfigServer(
  characterId: string,
  sessionId?: string
): Promise<{ traits: SoulTraits; preset: Pick<SoulPreset, 'slug' | 'name'> | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('luv_soul_configs')
    .select('traits, luv_soul_presets(slug, name)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`Failed to fetch soul config: ${error.message}`);

  if (!data) {
    return { traits: DEFAULT_TRAITS, preset: null };
  }

  return {
    traits: data.traits as SoulTraits,
    preset: data.luv_soul_presets ?? null,
  };
}

/**
 * Insert a new soul config snapshot (append-only).
 */
export async function insertSoulConfigServer(
  config: Omit<SoulConfig, 'id' | 'created_at'>
): Promise<SoulConfig> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('luv_soul_configs')
    .insert(config)
    .select()
    .single();

  if (error) throw new Error(`Failed to insert soul config: ${error.message}`);
  return data as SoulConfig;
}

/**
 * List all available soul presets.
 */
export async function listSoulPresetsServer(): Promise<SoulPreset[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('luv_soul_presets')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch soul presets: ${error.message}`);
  return (data ?? []) as SoulPreset[];
}
