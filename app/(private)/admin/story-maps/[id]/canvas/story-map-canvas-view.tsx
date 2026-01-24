'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
  CanvasMode,
} from '@/components/admin/canvas'
import { StoryMapTimelineCanvas } from '@/components/admin/canvas/story-map-timeline-canvas'
import { StoryDetailPanel } from '@/components/admin/canvas/story-detail-panel'
import { CreateStoryModal } from '@/components/admin/canvas/create-story-modal'
import {
  AIGenerateMenu,
  type AIGenerateOption,
  type GenerateSettings,
} from '@/components/admin/canvas/ai-generate-menu'
import {
  bulkCreateActivitiesAction,
  bulkCreateStoriesAction,
} from './actions'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'

interface Activity {
  id: string
  name: string
  description: string | null
  sequence: number
  user_goal: string | null
  user_stories: UserStory[]
}

interface UserStory {
  id: string
  title: string
  description: string | null
  activity_id: string
  vertical_position: number | null
  layer_id: string | null
  priority: string | null
  status: string
  story_type: string | null
  story_points: number | null
}

interface StoryMap {
  id: string
  name: string
  description: string | null
  activities: Activity[]
}

interface StoryMapCanvasViewProps {
  storyMap: StoryMap
  layers: StoryMapLayer[]
}

export function StoryMapCanvasView({ storyMap, layers }: StoryMapCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [createStoryCell, setCreateStoryCell] = useState<{
    activityId: string
    layer: StoryMapLayer
  } | null>(null)
  // P2-10: Track selected cell for AI generation
  const [selectedCellForGeneration, setSelectedCellForGeneration] = useState<{
    activityId: string
    layerId: string
  } | null>(null)

  // Sort activities by sequence
  const activities = useMemo(
    () => [...(storyMap.activities || [])].sort((a, b) => a.sequence - b.sequence),
    [storyMap.activities]
  )

  // Count all stories
  const allStories = useMemo(
    () => activities.flatMap((a) => a.user_stories || []),
    [activities]
  )

  const handleBackgroundClick = useCallback(() => {
    setSelectedStoryId(null)
    setSelectedCellForGeneration(null)
  }, [])

  const handleCellClick = useCallback((activityId: string, layer: StoryMapLayer) => {
    setCreateStoryCell({ activityId, layer })
    // P2-10: Also set as target for AI generation
    setSelectedCellForGeneration({ activityId, layerId: layer.id })
  }, [])

  const handleStorySelect = useCallback((storyId: string) => {
    setSelectedStoryId(storyId)
  }, [])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  // P2-10: Build AI generation options dynamically based on state
  const aiGenerateOptions: AIGenerateOption[] = useMemo(() => {
    const options: AIGenerateOption[] = [
      {
        id: 'activities',
        label: 'Activities',
        description: 'Generate activity columns for the story map',
        defaultCount: 5,
      },
    ]

    // Only show stories option if a cell is selected
    if (selectedCellForGeneration) {
      const targetActivity = activities.find(
        (a) => a.id === selectedCellForGeneration.activityId
      )
      const targetLayer = layers.find(
        (l) => l.id === selectedCellForGeneration.layerId
      )
      const cellLabel = targetActivity && targetLayer
        ? `${targetActivity.name} / ${targetLayer.name}`
        : 'selected cell'

      options.push({
        id: 'stories',
        label: 'Stories',
        description: `Generate stories for ${cellLabel}`,
        defaultCount: 3,
      })
    } else if (activities.length > 0 && layers.length > 0) {
      options.push({
        id: 'stories',
        label: 'Stories',
        description: 'Click a cell first to select where to generate stories',
        defaultCount: 3,
      })
    }

    return options
  }, [selectedCellForGeneration, activities, layers])

  // AI Generation handler
  const handleAIGenerate = useCallback(
    async (option: AIGenerateOption, settings: GenerateSettings) => {
      if (option.id === 'activities') {
        // Build context for activity generation
        const sourceData = {
          story_map_name: storyMap.name,
          story_map_description: storyMap.description || '',
          existing_activities: activities.map((a) => a.name).join(', '),
        }

        // Call AI generation API
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-entity',
            input: {
              sourceType: 'story_maps',
              sourceData,
              targetType: 'activities',
              existingItems: activities.map((a) => ({ name: a.name })),
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
          throw new Error(errorData.error || 'Failed to generate activities')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }

        // Insert generated activities
        const generatedActivities = result.data.entities as Array<{
          name: string
          description?: string
          user_goal?: string
        }>

        const insertResult = await bulkCreateActivitiesAction(
          storyMap.id,
          generatedActivities
        )

        if (!insertResult.success) {
          throw new Error(insertResult.error)
        }

        router.refresh()
      } else if (option.id === 'stories') {
        // P2-10: Force cell selection before story generation
        if (!selectedCellForGeneration) {
          throw new Error('Please click on a cell first to select where to generate stories')
        }

        if (activities.length === 0) {
          throw new Error('Please add activities first before generating stories')
        }

        if (layers.length === 0) {
          throw new Error('Please add layers first before generating stories')
        }

        const targetActivity = activities.find(
          (a) => a.id === selectedCellForGeneration.activityId
        )
        const targetLayer = layers.find((l) => l.id === selectedCellForGeneration.layerId)

        if (!targetActivity || !targetLayer) {
          throw new Error('Selected cell is no longer valid. Please select a cell again.')
        }

        // Get existing stories in this cell
        const cellStories = (targetActivity.user_stories || []).filter(
          (s) => s.layer_id === targetLayer.id
        )

        // Build context
        const sourceData = {
          activity_name: targetActivity.name,
          activity_description: targetActivity.description || '',
          layer_name: targetLayer.name,
          layer_type: targetLayer.layer_type || '',
          existing_stories: cellStories.map((s) => s.title).join(', '),
        }

        // Call AI generation API
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-entity',
            input: {
              sourceType: 'activities',
              sourceData,
              targetType: 'user_stories',
              existingItems: cellStories.map((s) => ({ title: s.title })),
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
          throw new Error(errorData.error || 'Failed to generate stories')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Generation failed')
        }

        // Insert generated stories
        const generatedStories = result.data.entities as Array<{
          title: string
          description?: string
          acceptance_criteria?: string
          story_type?: string
        }>

        const insertResult = await bulkCreateStoriesAction(
          selectedCellForGeneration.activityId,
          selectedCellForGeneration.layerId,
          generatedStories
        )

        if (!insertResult.success) {
          throw new Error(insertResult.error)
        }

        router.refresh()
      }
    },
    [storyMap, activities, layers, selectedCellForGeneration, router]
  )

  // P2-10: Show selected cell indicator in toolbar
  const selectedCellLabel = useMemo(() => {
    if (!selectedCellForGeneration) return null
    const activity = activities.find((a) => a.id === selectedCellForGeneration.activityId)
    const layer = layers.find((l) => l.id === selectedCellForGeneration.layerId)
    if (!activity || !layer) return null
    return `${activity.name} / ${layer.name}`
  }, [selectedCellForGeneration, activities, layers])

  return (
    <CanvasViewLayout
      header={
        <CanvasHeader
          title={storyMap.name}
          backHref={`/admin/story-maps/${storyMap.id}`}
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
              {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'},{' '}
              {allStories.length} stor{allStories.length !== 1 ? 'ies' : 'y'},{' '}
              {layers.length} layer{layers.length !== 1 ? 's' : ''}
            </span>
            {/* P2-10: Show selected cell for AI generation */}
            {selectedCellLabel && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                Target: {selectedCellLabel}
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
      <CanvasSurface onBackgroundClick={handleBackgroundClick}>
        <StoryMapTimelineCanvas
          storyMapId={storyMap.id}
          activities={activities}
          layers={layers}
          mode={mode}
          selectedStoryId={selectedStoryId}
          onStorySelect={handleStorySelect}
          onCellClick={handleCellClick}
          onRefresh={handleRefresh}
        />
      </CanvasSurface>

      {/* Story detail panel */}
      {selectedStoryId && (
        <StoryDetailPanel
          storyId={selectedStoryId}
          activities={activities}
          layers={layers}
          onClose={() => setSelectedStoryId(null)}
          onUpdate={() => {
            handleRefresh()
          }}
          onDelete={() => {
            setSelectedStoryId(null)
            handleRefresh()
          }}
        />
      )}

      {/* Create story modal */}
      {createStoryCell && (
        <CreateStoryModal
          activityId={createStoryCell.activityId}
          activities={activities}
          layer={createStoryCell.layer}
          layers={layers}
          onClose={() => setCreateStoryCell(null)}
          onCreate={() => {
            setCreateStoryCell(null)
            handleRefresh()
          }}
        />
      )}
    </CanvasViewLayout>
  )
}
