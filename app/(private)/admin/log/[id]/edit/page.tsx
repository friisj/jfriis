export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { LogEntryForm } from '@/components/admin/log-entry-form'
import { notFound } from 'next/navigation'
import type { LogEntry } from '@/lib/types/database'

interface EditLogEntryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditLogEntryPage({ params }: EditLogEntryPageProps) {
  const supabase = await createClient()
  const { id } = await params

  const { data: entry, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('id', id)
    .single<LogEntry>()

  if (error || !entry) {
    notFound()
  }

  // Transform the data for the form
  const initialData = {
    title: entry.title,
    slug: entry.slug,
    content: entry.content?.markdown || '',
    entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
    type: entry.type || '',
    published: entry.published,
    tags: entry.tags?.join(', ') || '',
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Log Entry</h1>
          <p className="text-muted-foreground">
            Update your log entry content and settings
          </p>
        </div>

        <LogEntryForm entryId={id} initialData={initialData} />
      </div>
    </div>
  )
}
