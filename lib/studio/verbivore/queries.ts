import { createClient } from '@/lib/supabase-server'
import type {
  VerbivoreCategory,
  VerbivoreEntryWithCategory,
  VerbivoreEntryWithTerms,
  VerbivoreTerm,
  VerbivoreTermWithEntryCount,
  VerbivoreEntryTerm,
  VerbivoreStyleGuide,
  VerbivoreEntryRelationship,
  VerbivoreSplittingSession,
  VerbivoreSource,
} from './types'

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories(): Promise<VerbivoreCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getCategory(id: string): Promise<VerbivoreCategory | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_categories')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createCategory(category: { name: string; slug: string; description?: string; color?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_categories').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// ENTRIES
// ============================================================================

export async function getEntries(): Promise<VerbivoreEntryWithCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entries')
    .select('*, verbivore_categories(*)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    category: row.verbivore_categories ?? null,
  })) as unknown as VerbivoreEntryWithCategory[]
}

export async function getEntry(id: string): Promise<VerbivoreEntryWithTerms | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entries')
    .select(`
      *,
      verbivore_categories(*),
      verbivore_entry_terms(*, verbivore_terms(*))
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    category: data.verbivore_categories ?? null,
    terms: (data.verbivore_entry_terms ?? []).map((et: Record<string, unknown>) => ({
      ...et,
      term: et.verbivore_terms,
    })),
  } as unknown as VerbivoreEntryWithTerms
}

export async function createEntry(entry: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entries')
    .insert(entry as never)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEntry(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entries')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_entries').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// TERMS
// ============================================================================

export async function getTerms(): Promise<VerbivoreTermWithEntryCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_terms')
    .select('*, verbivore_entry_terms(id)')
    .order('term')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    entry_count: (row.verbivore_entry_terms ?? []).length,
  })) as unknown as VerbivoreTermWithEntryCount[]
}

export async function getTerm(id: string): Promise<VerbivoreTerm | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_terms')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as VerbivoreTerm
}

export async function getTermBySlug(slug: string): Promise<VerbivoreTerm | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_terms')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data as unknown as VerbivoreTerm
}

export async function createTerm(term: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_terms')
    .insert(term as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as VerbivoreTerm
}

export async function updateTerm(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_terms')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as VerbivoreTerm
}

export async function deleteTerm(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_terms').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// ENTRY-TERM LINKS
// ============================================================================

export async function getEntryTerms(entryId: string): Promise<(VerbivoreEntryTerm & { term: VerbivoreTerm })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entry_terms')
    .select('*, verbivore_terms(*)')
    .eq('entry_id', entryId)
    .order('display_order')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    term: row.verbivore_terms,
  })) as unknown as (VerbivoreEntryTerm & { term: VerbivoreTerm })[]
}

export async function linkTermToEntry(entryId: string, termId: string, isPrimary = false, displayOrder = 0) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entry_terms')
    .insert({ entry_id: entryId, term_id: termId, is_primary: isPrimary, display_order: displayOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlinkTermFromEntry(entryId: string, termId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('verbivore_entry_terms')
    .delete()
    .eq('entry_id', entryId)
    .eq('term_id', termId)
  if (error) throw error
}

export async function clearEntryTerms(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('verbivore_entry_terms')
    .delete()
    .eq('entry_id', entryId)
  if (error) throw error
}

// ============================================================================
// STYLE GUIDES
// ============================================================================

export async function getStyleGuides(): Promise<VerbivoreStyleGuide[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_style_guides')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getStyleGuide(id: string): Promise<VerbivoreStyleGuide | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_style_guides')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getDefaultStyleGuide(): Promise<VerbivoreStyleGuide | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_style_guides')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data
}

export async function createStyleGuide(guide: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_style_guides')
    .insert(guide as never)
    .select()
    .single()
  if (error) throw error
  return data as VerbivoreStyleGuide
}

export async function updateStyleGuide(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_style_guides')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as VerbivoreStyleGuide
}

export async function deleteStyleGuide(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_style_guides').delete().eq('id', id)
  if (error) throw error
}

export async function incrementStyleGuideUsage(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('increment_verbivore_style_guide_usage' as never, { guide_id: id } as never)
  // Fallback: if RPC doesn't exist, do manual increment
  if (error) {
    const guide = await getStyleGuide(id)
    if (guide) {
      await updateStyleGuide(id, { usage_count: guide.usage_count + 1 })
    }
  }
}

// ============================================================================
// ENTRY RELATIONSHIPS
// ============================================================================

export async function getEntryRelationships(entryId: string): Promise<VerbivoreEntryRelationship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entry_relationships')
    .select('*')
    .or(`parent_entry_id.eq.${entryId},child_entry_id.eq.${entryId}`)
    .order('sequence_order')
  if (error) throw error
  return (data ?? []) as unknown as VerbivoreEntryRelationship[]
}

export async function createEntryRelationship(relationship: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_entry_relationships')
    .insert(relationship as never)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================================
// SPLITTING SESSIONS
// ============================================================================

export async function createSplittingSession(entryId: string): Promise<VerbivoreSplittingSession> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_splitting_sessions')
    .insert({ entry_id: entryId })
    .select()
    .single()
  if (error) throw error
  return data as unknown as VerbivoreSplittingSession
}

export async function updateSplittingSession(
  id: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_splitting_sessions')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as VerbivoreSplittingSession
}

// ============================================================================
// SOURCES
// ============================================================================

export async function getSources(): Promise<VerbivoreSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_sources')
    .select('*')
    .order('title')
  if (error) throw error
  return (data ?? []) as unknown as VerbivoreSource[]
}

export async function createSource(source: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('verbivore_sources')
    .insert(source as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as VerbivoreSource
}
