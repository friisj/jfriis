export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { IdeasListView } from '@/components/admin/views/ideas-list-view'

export default async function AdminIdeasPage() {
  const supabase = await createClient()

  // Fetch all idea-typed log entries
  const { data: ideas, error } = await supabase
    .from('log_entries')
    .select(`
      id,
      title,
      slug,
      content,
      entry_date,
      type,
      idea_stage,
      published,
      is_private,
      tags,
      created_at,
      updated_at
    `)
    .eq('type', 'idea')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching ideas:', error)
    return <div className="p-8">Error loading ideas</div>
  }

  const ideaIds = ideas?.map((e: any) => e.id) || []

  // Fetch entity links for these ideas (both as source and target)
  let studioProjectLinks: any[] = []
  const ventureLinks: any[] = []

  if (ideaIds.length > 0) {
    const { data: spLinks } = await supabase
      .from('entity_links')
      .select('source_id, target_id, target_type, link_type')
      .eq('source_type', 'log_entry')
      .in('target_type', ['studio_project', 'project', 'venture'])
      .in('source_id', ideaIds)

    studioProjectLinks = spLinks || []

    // Also check if ideas are targets (studio project evolved_from idea)
    const { data: reverseSpLinks } = await supabase
      .from('entity_links')
      .select('source_id, target_id, source_type, link_type')
      .eq('target_type', 'log_entry')
      .in('source_type', ['studio_project', 'project', 'venture'])
      .in('target_id', ideaIds)

    if (reverseSpLinks) {
      for (const link of reverseSpLinks) {
        if (link.source_type === 'studio_project') {
          studioProjectLinks.push({
            source_id: link.target_id,
            target_id: link.source_id,
            target_type: 'studio_project',
            link_type: link.link_type,
          })
        } else {
          ventureLinks.push({
            source_id: link.target_id,
            target_id: link.source_id,
            target_type: 'venture',
            link_type: link.link_type,
          })
        }
      }
    }
  }

  // Fetch names for linked studio projects
  const linkedStudioProjectIds = [
    ...new Set(studioProjectLinks.filter(l => l.target_type === 'studio_project').map(l => l.target_id)),
  ]
  const linkedVentureIds = [
    ...new Set([
      ...studioProjectLinks.filter(l => l.target_type === 'project' || l.target_type === 'venture').map(l => l.target_id),
      ...ventureLinks.map(l => l.target_id),
    ]),
  ]

  let studioProjectNames: Record<string, string> = {}
  let ventureNames: Record<string, string> = {}

  if (linkedStudioProjectIds.length > 0) {
    const { data: projects } = await supabase
      .from('studio_projects')
      .select('id, name')
      .in('id', linkedStudioProjectIds)
    if (projects) {
      studioProjectNames = Object.fromEntries(projects.map(p => [p.id, p.name]))
    }
  }

  if (linkedVentureIds.length > 0) {
    const { data: ventures } = await supabase
      .from('ventures')
      .select('id, title')
      .in('id', linkedVentureIds)
    if (ventures) {
      ventureNames = Object.fromEntries(ventures.map(v => [v.id, v.title]))
    }
  }

  // Build enriched idea objects
  const ideasWithLinks = (ideas || []).map((idea: any) => {
    const linkedProjects = studioProjectLinks
      .filter(l => l.source_id === idea.id && l.target_type === 'studio_project')
      .map(l => ({ id: l.target_id, name: studioProjectNames[l.target_id] || 'Unknown' }))

    const linkedVentures = [
      ...studioProjectLinks
        .filter(l => l.source_id === idea.id && (l.target_type === 'project' || l.target_type === 'venture'))
        .map(l => ({ id: l.target_id, name: ventureNames[l.target_id] || 'Unknown' })),
      ...ventureLinks
        .filter(l => l.source_id === idea.id)
        .map(l => ({ id: l.target_id, name: ventureNames[l.target_id] || 'Unknown' })),
    ]

    return {
      ...idea,
      idea_stage: idea.idea_stage || 'captured',
      linkedStudioProjects: linkedProjects,
      linkedVentures: linkedVentures,
    }
  })

  // Compute pipeline counts
  const stageCounts = {
    captured: 0,
    exploring: 0,
    validated: 0,
    graduated: 0,
    parked: 0,
  }
  for (const idea of ideasWithLinks) {
    const stage = idea.idea_stage as keyof typeof stageCounts
    if (stage in stageCounts) {
      stageCounts[stage]++
    }
  }

  return (
    <AdminListLayout
      title="Ideas"
      description="Capture, shape, and graduate ideas into studio projects and ventures"
      actionHref="/admin/log/new?type=idea"
      actionLabel="Capture Idea"
    >
      <IdeasListView ideas={ideasWithLinks} stageCounts={stageCounts} />
    </AdminListLayout>
  )
}
