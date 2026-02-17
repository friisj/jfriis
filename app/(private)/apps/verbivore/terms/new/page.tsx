import { createClient } from '@/lib/supabase-server'
import { TermForm } from '@/components/studio/verbivore/term-form'

export default async function NewTermPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('verbivore_entries')
    .select('id, title, slug, status')
    .order('title')

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">New Term</h1>
      <TermForm mode="create" allEntries={entries ?? []} />
    </div>
  )
}
