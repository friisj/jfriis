/**
 * Luv: Research Server-Side Operations
 *
 * CRUD for the luv_research table — hypotheses, experiments,
 * decisions, insights, and evidence.
 */

import { createClient } from './supabase-server';
import type {
  LuvResearch,
  LuvResearchKind,
  LuvResearchStatus,
  CreateLuvResearchInput,
  UpdateLuvResearchInput,
} from './types/luv';

// NOTE: luv_research not in generated Supabase types — using type assertions

export interface ResearchFilters {
  kind?: LuvResearchKind;
  status?: LuvResearchStatus;
  parent_id?: string;
}

export async function listLuvResearchServer(
  filters?: ResearchFilters
): Promise<LuvResearch[]> {
  const client = await createClient();
  let query = (client as any)
    .from('luv_research')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.kind) query = query.eq('kind', filters.kind);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.parent_id) query = query.eq('parent_id', filters.parent_id);

  const { data, error } = await query;
  if (error) throw error;
  return data as LuvResearch[];
}

export async function getLuvResearchServer(
  id: string
): Promise<LuvResearch | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_research')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LuvResearch | null;
}

export async function getLuvResearchWithChildrenServer(
  id: string
): Promise<{ entry: LuvResearch; children: LuvResearch[] } | null> {
  const client = await createClient();

  const { data: entry, error: entryError } = await (client as any)
    .from('luv_research')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (entryError) throw entryError;
  if (!entry) return null;

  const { data: children, error: childError } = await (client as any)
    .from('luv_research')
    .select('*')
    .eq('parent_id', id)
    .order('created_at', { ascending: true });

  if (childError) throw childError;

  return { entry: entry as LuvResearch, children: (children ?? []) as LuvResearch[] };
}

export async function createLuvResearchServer(
  input: CreateLuvResearchInput
): Promise<LuvResearch> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_research')
    .insert({
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      status: input.status ?? 'open',
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      parent_id: input.parent_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvResearch;
}

export async function updateLuvResearchServer(
  id: string,
  updates: UpdateLuvResearchInput
): Promise<LuvResearch> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_research')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvResearch;
}

export async function deleteLuvResearchServer(id: string): Promise<void> {
  const client = await createClient();
  const { error } = await (client as any)
    .from('luv_research')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function searchLuvResearchServer(
  query: string,
  kind?: LuvResearchKind
): Promise<LuvResearch[]> {
  const client = await createClient();
  // Convert query to tsquery format
  const tsquery = query.split(/\s+/).filter(Boolean).join(' & ');

  let q = (client as any)
    .from('luv_research')
    .select('*')
    .textSearch('title_body_fts', tsquery, { config: 'english' })
    .order('created_at', { ascending: false });

  if (kind) q = q.eq('kind', kind);

  const { data, error } = await q;

  // Fall back to ilike if full-text search column doesn't exist
  if (error) {
    let fallback = (client as any)
      .from('luv_research')
      .select('*')
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (kind) fallback = fallback.eq('kind', kind);

    const { data: fbData, error: fbError } = await fallback;
    if (fbError) throw fbError;
    return fbData as LuvResearch[];
  }

  return data as LuvResearch[];
}
