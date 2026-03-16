/**
 * Luv: Changelog Server Functions
 *
 * Server-side database access for luv_changelog entries.
 * Uses the Supabase service-role client (server-only).
 */

import { createClient } from '@/lib/supabase-server';
import type { LuvChangelogEntry } from '@/lib/types/luv';

/**
 * Fetch recent changelog entries, newest first.
 */
export async function getLuvChangelogServer(limit = 10): Promise<LuvChangelogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('luv_changelog')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch luv_changelog: ${error.message}`);
  return (data ?? []) as LuvChangelogEntry[];
}

/**
 * Create a new changelog entry.
 */
export async function createLuvChangelogEntryServer(
  entry: Omit<LuvChangelogEntry, 'id' | 'created_at'>
): Promise<LuvChangelogEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('luv_changelog')
    .insert(entry)
    .select()
    .single();

  if (error) throw new Error(`Failed to create luv_changelog entry: ${error.message}`);
  return data as LuvChangelogEntry;
}
