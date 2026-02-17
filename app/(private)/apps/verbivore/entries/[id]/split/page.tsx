import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { EntrySplitWizard } from '@/components/studio/verbivore/entry-split-wizard'

export default async function SplitEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from('verbivore_entries')
    .select('id, title, excerpt, content, word_count, complexity_score, verbivore_entry_terms(id)')
    .eq('id', id)
    .single()

  if (!entry) notFound()

  const entryData = {
    id: entry.id,
    title: entry.title,
    excerpt: entry.excerpt || undefined,
    content: entry.content || undefined,
    word_count: entry.word_count,
    complexity_score: entry.complexity_score,
    term_count: (entry.verbivore_entry_terms ?? []).length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href={`/apps/verbivore/entries/${id}`}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Back to Entry
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Split: {entry.title}
        </h1>
      </div>
      <EntrySplitWizard entry={entryData} />
    </div>
  )
}
