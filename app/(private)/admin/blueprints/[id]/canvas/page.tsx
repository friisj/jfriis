import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BlueprintCanvasView } from './blueprint-canvas-view'
import type {
  BlueprintStep,
  BlueprintCell,
  LayerType,
  CostImplication,
  FailureRisk,
} from '@/lib/boundary-objects/blueprint-cells'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BlueprintCanvasPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch blueprint with steps
  const { data: blueprint, error: blueprintError } = await supabase
    .from('service_blueprints')
    .select(`
      *,
      steps:blueprint_steps(
        id,
        service_blueprint_id,
        name,
        description,
        sequence,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .single()

  if (blueprintError || !blueprint) {
    notFound()
  }

  // Transform steps to match BlueprintStep type
  const steps: BlueprintStep[] = (blueprint.steps || []).map((s: {
    id: string
    service_blueprint_id: string
    name: string
    description: string | null
    sequence: number
  }) => ({
    id: s.id,
    service_blueprint_id: s.service_blueprint_id,
    name: s.name,
    description: s.description,
    sequence: s.sequence,
  }))

  // Fetch cells separately (for all steps)
  const stepIds = steps.map((s) => s.id)
  let cells: BlueprintCell[] = []

  if (stepIds.length > 0) {
    const { data: cellsData } = await supabase
      .from('blueprint_cells')
      .select('*')
      .in('step_id', stepIds)

    // Transform cells to match BlueprintCell type
    cells = (cellsData || []).map((c) => ({
      id: c.id,
      step_id: c.step_id,
      layer_type: c.layer_type as LayerType,
      content: c.content,
      actors: c.actors,
      duration_estimate: c.duration_estimate,
      cost_implication: c.cost_implication as CostImplication | null,
      failure_risk: c.failure_risk as FailureRisk | null,
      sequence: c.sequence ?? 0,
      created_at: c.created_at ?? new Date().toISOString(),
      updated_at: c.updated_at ?? new Date().toISOString(),
    }))
  }

  return (
    <BlueprintCanvasView
      blueprint={blueprint}
      steps={steps}
      cells={cells}
    />
  )
}
