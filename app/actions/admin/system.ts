'use server'

import { createClient } from '@/lib/supabase-server'
import { buildStaticGraph } from '@/lib/admin/system/static-registry'
import { computeDiagnostics } from '@/lib/admin/system/diagnostics'
import type { SystemGraphData, SystemEdge, SystemNode } from '@/lib/admin/system/types'

export async function fetchSystemGraph(): Promise<SystemGraphData> {
  const supabase = await createClient()

  // Start with static registry (tables, apps, tools, FK edges)
  const staticGraph = buildStaticGraph()
  const nodes: SystemNode[] = [...staticGraph.nodes]
  const edges: SystemEdge[] = [...staticGraph.edges]

  // Fetch studio projects from DB and merge
  const { data: studioProjects } = await supabase
    .from('studio_projects')
    .select('id, name, slug, status')
    .neq('status', 'archived')

  if (studioProjects) {
    for (const project of studioProjects) {
      // Add as a studio_project node (separate from the table node)
      nodes.push({
        id: `studio:${project.slug}`,
        label: project.name,
        kind: 'studio_project',
        domain: 'studio',
        href: `/admin/studio/${project.id}`,
        description: `Studio project (${project.status})`,
      })

      // Link studio project node to the studio_projects table
      edges.push({
        id: `struct:studio:${project.slug}:table`,
        source: `studio:${project.slug}`,
        target: 'table:studio_projects',
        type: 'structural',
        label: 'stored in',
      })
    }
  }

  // Fetch entity_links to create dynamic edges
  const { data: entityLinks } = await supabase
    .from('entity_links')
    .select('id, source_type, source_id, target_type, target_id, link_type')

  if (entityLinks) {
    // Build a lookup: entity_type + entity_id → node id
    // We need to resolve entity IDs to node IDs
    // For studio projects, we need the slug
    const studioProjectMap = new Map<string, string>()
    if (studioProjects) {
      for (const p of studioProjects) {
        studioProjectMap.set(p.id, p.slug)
      }
    }

    for (const link of entityLinks) {
      const sourceNodeId = resolveEntityToNodeId(link.source_type, link.source_id, studioProjectMap)
      const targetNodeId = resolveEntityToNodeId(link.target_type, link.target_id, studioProjectMap)

      if (sourceNodeId && targetNodeId) {
        // Only add edge if both nodes exist in our graph
        const sourceExists = nodes.some((n) => n.id === sourceNodeId)
        const targetExists = nodes.some((n) => n.id === targetNodeId)

        if (sourceExists && targetExists) {
          edges.push({
            id: `elink:${link.id}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'entity_link',
            label: link.link_type,
          })
        }
      }
    }
  }

  // Compute diagnostics
  return computeDiagnostics({ nodes, edges })
}

function resolveEntityToNodeId(
  entityType: string,
  entityId: string,
  studioProjectMap: Map<string, string>
): string | null {
  // Map entity types to node IDs
  switch (entityType) {
    case 'studio_project': {
      const slug = studioProjectMap.get(entityId)
      return slug ? `studio:${slug}` : null
    }
    case 'venture':
    case 'project':
      return 'table:ventures'
    case 'log_entry':
      return 'table:log_entries'
    case 'specimen':
      return 'table:specimens'
    case 'hypothesis':
      return 'table:studio_hypotheses'
    case 'experiment':
      return 'table:studio_experiments'
    case 'assumption':
      return 'table:assumptions'
    case 'business_model_canvas':
      return 'table:business_model_canvases'
    case 'customer_profile':
      return 'table:customer_profiles'
    case 'value_proposition_canvas':
      return 'table:value_proposition_canvases'
    case 'value_map':
      return 'table:value_maps'
    case 'canvas_item':
      return 'table:canvas_items'
    case 'user_journey':
      return 'table:user_journeys'
    case 'journey_stage':
      return 'table:journey_stages'
    case 'touchpoint':
      return 'table:touchpoints'
    case 'service_blueprint':
      return 'table:service_blueprints'
    case 'blueprint_step':
      return 'table:blueprint_steps'
    case 'story_map':
      return 'table:story_maps'
    case 'activity':
      return 'table:activities'
    case 'user_story':
      return 'table:user_stories'
    case 'story_release':
      return 'table:story_releases'
    case 'gallery_sequence':
      return 'table:gallery_sequences'
    case 'asset_spike':
      return 'table:studio_asset_spikes'
    case 'asset_prototype':
      return 'table:studio_asset_prototypes'
    default:
      return null
  }
}
