'use server'

import { createClient } from '@/lib/supabase-server'
import { executeAction } from '@/lib/ai/actions'
import '@/lib/ai/actions/verbivore-analyze-split'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

interface ApprovedGroup {
  title: string
  theme: string
  terms: string[]
  suggested_excerpt: string
  complexity_level: number
}

interface OriginalEntryUpdate {
  new_role: string
  updated_excerpt: string
  retained_terms: string[]
}

export async function executeEntrySplit(
  sessionId: string,
  approvedGroups: ApprovedGroup[],
  originalEntryUpdate: OriginalEntryUpdate
) {
  const supabase = await createClient()

  // Get the splitting session with entry data
  const { data: session, error: sessionError } = await supabase
    .from('verbivore_splitting_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Splitting session not found')
  }

  // Get the original entry with terms
  const { data: entry, error: entryError } = await supabase
    .from('verbivore_entries')
    .select(`
      *,
      verbivore_entry_terms (
        id, term_id, display_order, is_primary,
        verbivore_terms (id, term, definition)
      )
    `)
    .eq('id', session.entry_id)
    .single()

  if (entryError || !entry) {
    throw new Error('Entry not found')
  }

  const entryTerms = (entry.verbivore_entry_terms ?? []) as Array<{
    id: string
    term_id: string
    display_order: number
    is_primary: boolean
    verbivore_terms: { id: string; term: string; definition: string }
  }>

  const createdEntries = []
  const entryRelationships = []
  let sequenceOrder = 1

  try {
    for (const group of approvedGroups) {
      const slug = generateSlug(`${entry.title}-${group.title}`)

      const { data: newEntry, error: createError } = await supabase
        .from('verbivore_entries')
        .insert({
          title: group.title,
          slug,
          excerpt: group.suggested_excerpt,
          content: '',
          category_id: entry.category_id,
          status: 'draft',
          complexity_score: group.complexity_level,
          word_count: 0,
        })
        .select()
        .single()

      if (createError) throw new Error(`Failed to create entry "${group.title}": ${createError.message}`)

      createdEntries.push(newEntry)

      entryRelationships.push({
        parent_entry_id: entry.id,
        child_entry_id: newEntry.id,
        relationship_type: 'split_from',
        sequence_order: sequenceOrder++,
        split_strategy: {
          theme: group.theme,
          term_count: group.terms.length,
          complexity_level: group.complexity_level,
        },
      })

      // Link terms to new entry
      const termIds = entryTerms
        .filter(et => group.terms.includes(et.verbivore_terms.term))
        .map(et => et.verbivore_terms.id)

      if (termIds.length > 0) {
        const termRelations = termIds.map((termId, index) => ({
          entry_id: newEntry.id,
          term_id: termId,
          display_order: index,
          is_primary: index === 0,
        }))

        const { error: termLinkError } = await supabase
          .from('verbivore_entry_terms')
          .insert(termRelations)

        if (termLinkError) throw new Error(`Failed to link terms to "${group.title}": ${termLinkError.message}`)
      }
    }

    // Create entry relationships
    if (entryRelationships.length > 0) {
      const { error: relError } = await supabase
        .from('verbivore_entry_relationships')
        .insert(entryRelationships)

      if (relError) throw new Error(`Failed to create entry relationships: ${relError.message}`)
    }

    // Update original entry: clear terms and add retained ones
    const retainedTermIds = entryTerms
      .filter(et => originalEntryUpdate.retained_terms.includes(et.verbivore_terms.term))
      .map(et => et.term_id)

    await supabase
      .from('verbivore_entry_terms')
      .delete()
      .eq('entry_id', entry.id)

    if (retainedTermIds.length > 0) {
      const retainedRelations = retainedTermIds.map((termId, index) => ({
        entry_id: entry.id,
        term_id: termId,
        display_order: index,
        is_primary: index === 0,
      }))

      await supabase
        .from('verbivore_entry_terms')
        .insert(retainedRelations)
    }

    // Update original entry excerpt
    await supabase
      .from('verbivore_entries')
      .update({ excerpt: originalEntryUpdate.updated_excerpt })
      .eq('id', entry.id)

    // Mark session as completed
    await supabase
      .from('verbivore_splitting_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    return {
      success: true,
      originalEntry: { id: entry.id, title: entry.title, retainedTerms: retainedTermIds.length },
      createdEntries: createdEntries.map((e, i) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        sequenceOrder: i + 1,
        termCount: approvedGroups[i].terms.length,
      })),
      message: `Successfully split entry into ${createdEntries.length} new entries`,
    }
  } catch (error) {
    // Mark session as cancelled on failure
    await supabase
      .from('verbivore_splitting_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    throw error
  }
}

export async function analyzeEntrySplit(entryId: string) {
  const supabase = await createClient()

  const { data: entry, error: entryError } = await supabase
    .from('verbivore_entries')
    .select(`
      *,
      verbivore_entry_terms (
        id, term_id, display_order, is_primary,
        verbivore_terms (id, term, definition, difficulty_level)
      )
    `)
    .eq('id', entryId)
    .single()

  if (entryError || !entry) {
    throw new Error('Entry not found')
  }

  const entryTerms = (entry.verbivore_entry_terms ?? []) as Array<{
    id: string
    term_id: string
    display_order: number
    is_primary: boolean
    verbivore_terms: { id: string; term: string; definition: string; difficulty_level: string | null }
  }>

  const linkedTerms = entryTerms.map(et => ({
    term: et.verbivore_terms.term,
    definition: et.verbivore_terms.definition,
    difficulty_level: et.verbivore_terms.difficulty_level || undefined,
    is_primary: et.is_primary,
  }))

  const result = await executeAction('verbivore-analyze-split', {
    entryTitle: entry.title,
    entryExcerpt: entry.excerpt || undefined,
    entryContent: entry.content || undefined,
    wordCount: entry.word_count,
    complexityScore: entry.complexity_score,
    linkedTerms,
  })

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to analyze entry')
  }

  const analysis = JSON.parse((result.data as { content: string }).content)

  const { data: session, error: sessionError } = await supabase
    .from('verbivore_splitting_sessions')
    .insert({
      entry_id: entryId,
      analysis_result: analysis,
      status: 'ready',
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    throw new Error('Failed to create splitting session')
  }

  return { analysis, sessionId: session.id }
}

// Server actions for delete operations
export async function deleteVerbivoreEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_entries').delete().eq('id', id)
  if (error) throw error
}

export async function deleteVerbivoreTerm(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_terms').delete().eq('id', id)
  if (error) throw error
}

export async function deleteVerbivoreStyleGuide(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('verbivore_style_guides').delete().eq('id', id)
  if (error) throw error
}
