'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
  type CanvasMode,
} from '@/components/admin/canvas'
import { BlueprintCanvas } from '@/components/admin/canvas/blueprint-canvas'
import { BlueprintCellDetailPanel } from '@/components/admin/canvas/blueprint-cell-detail-panel'
import {
  AIGenerateMenu,
  type AIGenerateOption,
  type GenerateSettings,
} from '@/components/admin/canvas/ai-generate-menu'
import {
  createStepAction,
  updateStepAction,
  deleteStepAction,
  moveStepAction,
  upsertCellAction,
  bulkCreateStepsAction,
  bulkCreateCellsAction,
} from './actions'
import {
  LAYER_CONFIG,
  type BlueprintStep,
  type BlueprintCell,
  type LayerType,
} from '@/lib/boundary-objects/blueprint-cells'

interface Blueprint {
  id: string
  slug: string
  name: string
  description: string | null
  blueprint_type: string | null
  status: string
}

interface BlueprintCanvasViewProps {
  blueprint: Blueprint
  steps: BlueprintStep[]
  cells: BlueprintCell[]
}

export function BlueprintCanvasView({
  blueprint,
  steps,
  cells,
}: BlueprintCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)

  // Sort steps by sequence
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.sequence - b.sequence),
    [steps]
  )

  // Parse selected cell key to get step and layer
  const selectedCell = useMemo(() => {
    if (!selectedCellKey) return null
    const [stepId, layerType] = selectedCellKey.split(':')
    const step = sortedSteps.find((s) => s.id === stepId)
    if (!step) return null
    const cell = cells.find(
      (c) => c.step_id === stepId && c.layer_type === layerType
    )
    return {
      stepId,
      stepName: step.name,
      layerType: layerType as LayerType,
      cell: cell || null,
    }
  }, [selectedCellKey, sortedSteps, cells])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleCellSelect = useCallback((stepId: string, layerType: LayerType) => {
    setSelectedCellKey(`${stepId}:${layerType}`)
  }, [])

  const handleCellClose = useCallback(() => {
    setSelectedCellKey(null)
  }, [])

  const handleCellSave = useCallback(
    async (data: {
      content?: string | null
      actors?: string | null
      duration_estimate?: string | null
      cost_implication?: string | null
      failure_risk?: string | null
    }) => {
      if (!selectedCell) return

      const result = await upsertCellAction(
        selectedCell.stepId,
        selectedCell.layerType,
        data
      )

      if (!result.success) {
        console.error('Failed to save cell:', result.error)
        toast.error(result.error || 'Failed to save cell')
        throw new Error(result.error)
      }

      toast.success('Cell saved')
      handleRefresh()
    },
    [selectedCell, handleRefresh]
  )

  const handleStepAdd = useCallback(async () => {
    const nextSequence = sortedSteps.length
    const result = await createStepAction(
      blueprint.id,
      `Step ${nextSequence + 1}`,
      nextSequence
    )

    if (!result.success) {
      console.error('Failed to create step:', result.error)
      toast.error(result.error || 'Failed to create step')
      return
    }

    toast.success('Step created')
    handleRefresh()
  }, [blueprint.id, sortedSteps.length, handleRefresh])

  const handleStepUpdate = useCallback(
    async (stepId: string, name: string) => {
      const result = await updateStepAction(stepId, { name })

      if (!result.success) {
        console.error('Failed to update step:', result.error)
        toast.error(result.error || 'Failed to update step')
        return
      }

      handleRefresh()
    },
    [handleRefresh]
  )

  const handleStepDelete = useCallback(
    async (stepId: string) => {
      const result = await deleteStepAction(stepId)

      if (!result.success) {
        console.error('Failed to delete step:', result.error)
        toast.error(result.error || 'Failed to delete step')
        return
      }

      // Clear selection if deleted step was selected
      if (selectedCellKey?.startsWith(stepId)) {
        setSelectedCellKey(null)
      }

      toast.success('Step deleted')
      handleRefresh()
    },
    [selectedCellKey, handleRefresh]
  )

  const handleStepMove = useCallback(
    async (stepId: string, direction: 'left' | 'right') => {
      const result = await moveStepAction(stepId, direction)

      if (!result.success) {
        console.error('Failed to move step:', result.error)
        toast.error(result.error || 'Failed to move step')
        return
      }

      handleRefresh()
    },
    [handleRefresh]
  )

  // AI Generation options
  const aiGenerateOptions: AIGenerateOption[] = useMemo(() => {
    const options: AIGenerateOption[] = [
      {
        id: 'steps',
        label: 'Steps',
        description: 'Generate service blueprint steps',
        defaultCount: 5,
      },
    ]

    // Add cell content generation if a cell is selected
    if (selectedCell) {
      const layerName = LAYER_CONFIG[selectedCell.layerType].name
      options.push({
        id: 'cell_content',
        label: 'Cell Content',
        description: `Generate content for ${selectedCell.stepName} / ${layerName}`,
        defaultCount: 1,
      })
    }

    // Add fill column option if a step is selected
    if (selectedCell) {
      options.push({
        id: 'fill_column',
        label: 'Fill Column',
        description: `Generate content for all layers in ${selectedCell.stepName}`,
        defaultCount: 4,
      })
    }

    return options
  }, [selectedCell])

  // AI Generation handler
  const handleAIGenerate = useCallback(
    async (option: AIGenerateOption, settings: GenerateSettings) => {
      if (option.id === 'steps') {
        // Build context for step generation
        const sourceData = {
          blueprint_name: blueprint.name,
          blueprint_description: blueprint.description || '',
          blueprint_type: blueprint.blueprint_type || 'service',
          existing_steps: sortedSteps.map((s) => s.name).join(', '),
        }

        // Call AI generation API
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-entity',
            input: {
              sourceType: 'service_blueprints',
              sourceData,
              targetType: 'blueprint_steps',
              existingItems: sortedSteps.map((s) => ({ name: s.name })),
              pendingItems: [],
              count: settings.count,
              temperature: settings.temperature,
              model: settings.model,
              instructions: settings.instructions,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to generate steps')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }

        // Insert generated steps
        const generatedSteps = result.data.entities as Array<{
          name: string
          description?: string
        }>

        const insertResult = await bulkCreateStepsAction(
          blueprint.id,
          generatedSteps
        )

        if (!insertResult.success) {
          throw new Error(insertResult.error)
        }

        toast.success(`Generated ${generatedSteps.length} steps`)
        handleRefresh()
      } else if (option.id === 'cell_content' && selectedCell) {
        // Generate content for a single cell
        const layerConfig = LAYER_CONFIG[selectedCell.layerType]
        const sourceData = {
          step_name: selectedCell.stepName,
          layer_type: selectedCell.layerType,
          layer_name: layerConfig.name,
          layer_description: layerConfig.description,
          blueprint_context: blueprint.description || blueprint.name,
        }

        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-entity',
            input: {
              sourceType: 'blueprint_steps',
              sourceData,
              targetType: 'blueprint_cells',
              existingItems: selectedCell.cell
                ? [{ content: selectedCell.cell.content }]
                : [],
              pendingItems: [],
              count: 1,
              temperature: settings.temperature,
              model: settings.model,
              instructions: settings.instructions,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to generate content')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }

        const generatedCell = result.data.entities[0] as { content: string }
        if (generatedCell) {
          await handleCellSave({ content: generatedCell.content })
        }
      } else if (option.id === 'fill_column' && selectedCell) {
        // Generate content for all layers in a step
        const cellsToGenerate = Object.keys(LAYER_CONFIG).map((layerType) => {
          const layerConfig = LAYER_CONFIG[layerType as LayerType]
          return {
            layer_type: layerType,
            layer_name: layerConfig.name,
            layer_description: layerConfig.description,
          }
        })

        const sourceData = {
          step_name: selectedCell.stepName,
          blueprint_context: blueprint.description || blueprint.name,
          layers: cellsToGenerate.map((c) => c.layer_name).join(', '),
        }

        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-entity',
            input: {
              sourceType: 'blueprint_steps',
              sourceData,
              targetType: 'blueprint_cells',
              existingItems: [],
              pendingItems: [],
              count: 4, // One for each layer
              temperature: settings.temperature,
              model: settings.model,
              instructions: `Generate content for each layer of step "${selectedCell.stepName}": ${cellsToGenerate.map((c) => c.layer_name).join(', ')}. Return one object per layer with the layer_type field.`,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to generate content')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }

        const generatedCells = result.data.entities as Array<{
          layer_type?: string
          content: string
        }>

        // Map generated cells to layers and insert
        const cellsToInsert = generatedCells.map((cell, index) => ({
          layer_type: cell.layer_type || Object.keys(LAYER_CONFIG)[index],
          content: cell.content,
        }))

        const insertResult = await bulkCreateCellsAction(
          selectedCell.stepId,
          cellsToInsert
        )

        if (!insertResult.success) {
          throw new Error(insertResult.error)
        }

        toast.success('Generated cell content for all layers')
        handleRefresh()
      }
    },
    [blueprint, sortedSteps, selectedCell, handleRefresh, handleCellSave]
  )

  return (
    <CanvasViewLayout
      header={
        <CanvasHeader
          title={blueprint.name}
          backHref={`/admin/blueprints/${blueprint.id}/edit`}
          mode={mode}
          onModeChange={setMode}
          actions={
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Refresh
            </button>
          }
        />
      }
      toolbar={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''},{' '}
              {cells.length} cell{cells.length !== 1 ? 's' : ''}
            </span>
            {selectedCell && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {selectedCell.stepName} / {LAYER_CONFIG[selectedCell.layerType].name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AIGenerateMenu
              options={aiGenerateOptions}
              onGenerate={handleAIGenerate}
            />
          </div>
        </div>
      }
    >
      <CanvasSurface onBackgroundClick={handleCellClose}>
        <BlueprintCanvas
          blueprintId={blueprint.id}
          steps={sortedSteps}
          cells={cells}
          mode={mode}
          selectedCellKey={selectedCellKey}
          onCellSelect={handleCellSelect}
          onStepUpdate={handleStepUpdate}
          onStepDelete={handleStepDelete}
          onStepAdd={handleStepAdd}
          onStepMove={handleStepMove}
          onRefresh={handleRefresh}
        />
      </CanvasSurface>

      {/* Cell detail panel */}
      {selectedCell && (
        <BlueprintCellDetailPanel
          cell={selectedCell.cell}
          stepName={selectedCell.stepName}
          layerType={selectedCell.layerType}
          onSave={handleCellSave}
          onClose={handleCellClose}
        />
      )}
    </CanvasViewLayout>
  )
}
