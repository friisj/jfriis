/**
 * Sampler: Server-side data operations
 *
 * Server equivalents for SSR pages. Uses createClient() for cookie-based auth.
 */

import { createClient } from './supabase-server';
import type {
  SamplerCollection,
  SamplerSound,
  CollectionWithPads,
  PadWithSound,
} from './types/sampler';

// NOTE: sampler_* tables not in generated Supabase types - using type assertions

export async function getCollectionsServer(): Promise<SamplerCollection[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('sampler_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SamplerCollection[];
}

export async function getCollectionBySlugServer(slug: string): Promise<SamplerCollection> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('sampler_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as SamplerCollection;
}

export async function getCollectionWithPadsServer(slug: string): Promise<CollectionWithPads> {
  const client = await createClient();

  const { data: collection, error: collError } = await (client as any)
    .from('sampler_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (collError) throw collError;

  const { data: pads, error: padsError } = await (client as any)
    .from('sampler_pads')
    .select('*, sound:sampler_sounds(*)')
    .eq('collection_id', (collection as SamplerCollection).id)
    .order('row')
    .order('col');

  if (padsError) throw padsError;

  return {
    ...(collection as SamplerCollection),
    pads: (pads as PadWithSound[]) ?? [],
  };
}

export async function getSoundsServer(): Promise<SamplerSound[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('sampler_sounds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SamplerSound[];
}
