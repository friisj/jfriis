/**
 * Luv: Artifacts Server-Side Operations
 *
 * CRUD for the luv_artifacts table — markdown documents
 * created by Luv's agent (character briefs, style guides, etc.).
 */

import { createClient } from './supabase-server';
import type {
  LuvArtifact,
  LuvArtifactStatus,
  CreateLuvArtifactInput,
  UpdateLuvArtifactInput,
} from './types/luv';

export interface ArtifactFilters {
  status?: LuvArtifactStatus;
  tag?: string;
}

export async function listLuvArtifactsServer(
  filters?: ArtifactFilters
): Promise<LuvArtifact[]> {
  const client = await createClient();
  let query = (client as any)
    .from('luv_artifacts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.tag) query = query.contains('tags', [filters.tag]);

  const { data, error } = await query;
  if (error) throw error;
  return data as LuvArtifact[];
}

export async function getLuvArtifactServer(
  id: string
): Promise<LuvArtifact | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_artifacts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LuvArtifact | null;
}

export async function getLuvArtifactBySlugServer(
  slug: string
): Promise<LuvArtifact | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_artifacts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as LuvArtifact | null;
}

export async function createLuvArtifactServer(
  input: CreateLuvArtifactInput
): Promise<LuvArtifact> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_artifacts')
    .insert({
      title: input.title,
      slug: input.slug,
      content: input.content,
      tags: input.tags ?? [],
      status: input.status ?? 'draft',
      conversation_id: input.conversation_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvArtifact;
}

export async function updateLuvArtifactServer(
  id: string,
  updates: UpdateLuvArtifactInput
): Promise<LuvArtifact> {
  const client = await createClient();

  // Auto-increment version on content changes
  const payload: Record<string, unknown> = { ...updates };
  if (updates.content !== undefined && updates.version === undefined) {
    // Fetch current version to increment
    const current = await getLuvArtifactServer(id);
    if (current) {
      payload.version = current.version + 1;
    }
  }

  const { data, error } = await (client as any)
    .from('luv_artifacts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvArtifact;
}

export async function deleteLuvArtifactServer(id: string): Promise<void> {
  const client = await createClient();
  const { error } = await (client as any)
    .from('luv_artifacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
