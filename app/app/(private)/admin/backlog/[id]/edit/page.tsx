import { createClient } from '@/lib/supabase-server'
import { BacklogItemForm } from '@/components/admin/backlog-item-form'
import { notFound } from 'next/navigation'
import type { BacklogItem } from '@/lib/types/database'

interface EditBacklogItemPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditBacklogItemPage({ params }: EditBacklogItemPageProps) {
  const supabase = await createClient()
  const { id } = await params

  const { data: item, error } = await supabase
    .from('backlog_items')
    .select('*')
    .eq('id', id)
    .single<BacklogItem>()

  if (error || !item) {
    notFound()
  }

  // Transform the data for the form
  const initialData = {
    title: item.title || '',
    content: item.content || '',
    status: item.status,
    tags: item.tags?.join(', ') || '',
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Backlog Item</h1>
          <p className="text-muted-foreground">
            Update your idea or notes
          </p>
        </div>

        <BacklogItemForm itemId={id} initialData={initialData} />
      </div>
    </div>
  )
}
