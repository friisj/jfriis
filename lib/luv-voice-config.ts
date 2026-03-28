/**
 * Luv: Voice Configuration
 *
 * Persistent voice settings stored in luv_heartbeat_config.voice_config JSONB.
 * Read by the TTS route, written by the adjust_voice agent tool.
 */

import { createClient } from './supabase-server';

export interface VoiceConfig {
  voiceId?: string;
  speed?: number;
  stability?: number;
  style?: number;
}

const DEFAULT_CONFIG: VoiceConfig = {};

/**
 * Get the current voice config for a user.
 */
export async function getVoiceConfig(userId: string): Promise<VoiceConfig> {
  try {
    const client = await createClient();
    const { data } = await (client as any)
      .from('luv_heartbeat_config')
      .select('voice_config')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.voice_config && typeof data.voice_config === 'object') {
      return data.voice_config as VoiceConfig;
    }
  } catch {
    // Table may not exist or no row — use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Update voice config for a user. Merges with existing config.
 */
export async function updateVoiceConfig(
  userId: string,
  updates: Partial<VoiceConfig>,
): Promise<VoiceConfig> {
  const client = await createClient();

  // Load existing
  const current = await getVoiceConfig(userId);
  const merged = { ...current, ...updates };

  // Remove undefined/null values
  for (const key of Object.keys(merged) as (keyof VoiceConfig)[]) {
    if (merged[key] === undefined || merged[key] === null) {
      delete merged[key];
    }
  }

  // Upsert into heartbeat config
  await (client as any)
    .from('luv_heartbeat_config')
    .upsert({
      user_id: userId,
      voice_config: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  return merged;
}
