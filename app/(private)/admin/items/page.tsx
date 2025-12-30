export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { ItemsListView } from '@/components/admin/views/items-list-view'

export default async function AdminItemsPage() {
  const supabase = await createClient()

  // Fetch items with aggregated counts using LEFT JOINs
  // This avoids N+1 query problem by using a single query with GROUP BY
  const { data: items, error } = await supabase.rpc('get_canvas_items_with_counts')

  if (error) {
    console.error('Error fetching canvas items:', error)

    // Fallback to basic query without counts if RPC doesn't exist yet
    const { data: fallbackItems } = await supabase
      .from('canvas_items')
      .select(`
        id,
        title,
        description,
        item_type,
        importance,
        validation_status,
        tags,
        created_at,
        updated_at,
        studio_project_id,
        studio_project:studio_projects(name)
      `)
      .order('updated_at', { ascending: false })

    // Add zero counts
    const itemsWithCounts = (fallbackItems || []).map((item) => ({
      ...item,
      placement_count: 0,
      assumption_count: 0,
      evidence_count: 0,
    }))

    return (
      <AdminListLayout
        title="Canvas Items"
        description="First-class entities that can be placed across multiple canvases and linked to assumptions"
        actionHref="/admin/items/new"
        actionLabel="New Item"
      >
        <ItemsListView items={itemsWithCounts} />
      </AdminListLayout>
    )
  }

  const itemsWithCounts = items || []

  return (
    <AdminListLayout
      title="Canvas Items"
      description="First-class entities that can be placed across multiple canvases and linked to assumptions"
      actionHref="/admin/items/new"
      actionLabel="New Item"
    >
      <ItemsListView items={itemsWithCounts} />
    </AdminListLayout>
  )
}
