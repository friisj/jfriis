import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getTerm } from '@/lib/studio/verbivore/queries'
import { TermForm } from '@/components/studio/verbivore/term-form'

export default async function EditTermPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [term, entriesResult, linkedResult] = await Promise.all([
    getTerm(id),
    supabase.from('verbivore_entries').select('id, title, slug, status').order('title'),
    supabase.from('verbivore_entry_terms').select('entry_id').eq('term_id', id),
  ])

  if (!term) notFound()

  const allEntries = entriesResult.data ?? []
  const linkedEntries = (linkedResult.data ?? []).map((row) => row.entry_id)

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Edit Term: {term.term}
      </h1>
      <TermForm
        mode="edit"
        allEntries={allEntries}
        initialData={{
          id: term.id,
          term: term.term,
          slug: term.slug,
          definition: term.definition,
          pronunciation: term.pronunciation || '',
          tags: term.tags || [],
          difficulty_level: term.difficulty_level || '',
          origin: term.origin || '',
          etymology_source: term.etymology_source || '',
          usage_examples: term.usage_examples || [],
          synonyms: term.synonyms || [],
          linkedEntries,
        }}
      />
    </div>
  )
}
