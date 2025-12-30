export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { ItemsListView } from '@/components/admin/views/items-list-view'

export default async function AdminItemsPage() {
  const supabase = await createClient()

  // Fetch items with counts from aggregated views if available
  // For now, we'll fetch basic data and join counts separately
  const { data: items, error } = await supabase
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

  if (error) {
    console.error('Error fetching canvas items:', error)
    return <div className="p-8">Error loading canvas items</div>
  }

  // Fetch placement counts for each item
  const itemsWithCounts = await Promise.all(
    (items || []).map(async (item) => {
      const [placementResult, assumptionResult, evidenceResult] = await Promise.all([
        supabase
          .from('canvas_item_placements')
          .select('id', { count: 'exact', head: true })
          .eq('canvas_item_id', item.id),
        supabase
          .from('canvas_item_assumptions')
          .select('id', { count: 'exact', head: true })
          .eq('canvas_item_id', item.id),
        supabase
          .from('canvas_item_evidence')
          .select('id', { count: 'exact', head: true })
          .eq('canvas_item_id', item.id),
      ])

      return {
        ...item,
        placement_count: placementResult.count || 0,
        assumption_count: assumptionResult.count || 0,
        evidence_count: evidenceResult.count || 0,
      }
    })
  )

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
