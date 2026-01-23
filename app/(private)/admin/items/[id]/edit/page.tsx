import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { CanvasItemForm } from '@/components/admin/canvas-item-form'

interface EditCanvasItemPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCanvasItemPage({ params }: EditCanvasItemPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('canvas_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    notFound()
  }

  // Fetch placement count for display
  const { count: placementCount } = await supabase
    .from('canvas_item_placements')
    .select('id', { count: 'exact', head: true })
    .eq('canvas_item_id', id)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/admin/items" className="hover:text-foreground transition-colors">
              Canvas Items
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px]">{item.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Edit Canvas Item</h1>
            {placementCount && placementCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {placementCount} {placementCount === 1 ? 'placement' : 'placements'}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{item.title}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CanvasItemForm item={item as any} mode="edit" />
        </div>
      </div>
    </div>
  )
}
