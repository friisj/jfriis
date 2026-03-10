/**
 * Luv: Review Sessions Server-Side Operations
 *
 * CRUD for luv_review_sessions and luv_review_items — the reinforcement
 * review system for visual identity calibration.
 */

import { createClient } from './supabase-server';
import type {
  LuvReviewSession,
  LuvReviewItem,
  CreateReviewSessionInput,
  UpdateReviewSessionInput,
  UpdateReviewItemInput,
} from './types/luv';

// ============================================================================
// Sessions
// ============================================================================

export async function listReviewSessionsServer(): Promise<LuvReviewSession[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvReviewSession[];
}

export async function getReviewSessionServer(
  id: string
): Promise<LuvReviewSession | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LuvReviewSession | null;
}

export async function createReviewSessionServer(
  input: CreateReviewSessionInput
): Promise<LuvReviewSession> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_sessions')
    .insert({ title: input.title })
    .select()
    .single();

  if (error) throw error;
  return data as LuvReviewSession;
}

export async function updateReviewSessionServer(
  id: string,
  updates: UpdateReviewSessionInput
): Promise<LuvReviewSession> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvReviewSession;
}

// ============================================================================
// Items
// ============================================================================

export async function listReviewItemsServer(
  sessionId: string
): Promise<LuvReviewItem[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_items')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data as LuvReviewItem[];
}

export async function getReviewItemServer(
  id: string
): Promise<LuvReviewItem | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LuvReviewItem | null;
}

export async function createReviewItemServer(
  sessionId: string,
  storagePath: string,
  sequence: number
): Promise<LuvReviewItem> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_items')
    .insert({
      session_id: sessionId,
      storage_path: storagePath,
      sequence,
    })
    .select()
    .single();

  if (error) throw error;

  // Update session image count
  await (client as any)
    .from('luv_review_sessions')
    .update({ image_count: sequence + 1 })
    .eq('id', sessionId);

  return data as LuvReviewItem;
}

export async function updateReviewItemServer(
  id: string,
  updates: UpdateReviewItemInput
): Promise<LuvReviewItem> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_review_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvReviewItem;
}

export async function getSessionWithItemsServer(
  sessionId: string
): Promise<{ session: LuvReviewSession; items: LuvReviewItem[] } | null> {
  const [session, items] = await Promise.all([
    getReviewSessionServer(sessionId),
    listReviewItemsServer(sessionId),
  ]);

  if (!session) return null;
  return { session, items };
}

// ============================================================================
// Promotion — create reference + module media links
// ============================================================================

export async function promoteToReferenceServer(
  itemId: string,
  moduleSlugs: string[],
  description?: string
): Promise<{ referenceId: string; mediaIds: string[] }> {
  const client = await createClient();

  // Get the review item
  const item = await getReviewItemServer(itemId);
  if (!item) throw new Error('Review item not found');
  if (item.promoted_to_reference_id) {
    throw new Error('Item already promoted to reference');
  }

  // Create reference
  const { data: ref, error: refError } = await (client as any)
    .from('luv_references')
    .insert({
      type: 'canonical',
      storage_path: item.storage_path,
      description: description ?? null,
      parameters: {},
      tags: item.module_links,
    })
    .select()
    .single();

  if (refError) throw refError;

  // Link to chassis modules
  const mediaIds: string[] = [];
  if (moduleSlugs.length > 0) {
    // Resolve module IDs from slugs
    const { data: modules, error: modError } = await (client as any)
      .from('luv_chassis_modules')
      .select('id, slug')
      .in('slug', moduleSlugs);

    if (modError) throw modError;

    for (const mod of modules ?? []) {
      const { data: media, error: mediaError } = await (client as any)
        .from('luv_chassis_module_media')
        .insert({
          module_id: mod.id,
          storage_path: item.storage_path,
          parameter_key: 'reference',
          description: `From review: ${description ?? item.session_id}`,
        })
        .select()
        .single();

      if (mediaError) throw mediaError;
      mediaIds.push(media.id);
    }
  }

  // Mark item as promoted
  await updateReviewItemServer(itemId, {
    promoted_to_reference_id: ref.id,
  });

  return { referenceId: ref.id, mediaIds };
}
