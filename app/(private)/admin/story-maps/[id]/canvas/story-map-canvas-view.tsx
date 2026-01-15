'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
  CanvasMode,
} from '@/components/admin/canvas'
import { StoryMapCanvas } from '@/components/admin/canvas/story-map-canvas'
import { StoryDetailPanel } from '@/components/admin/canvas/story-detail-panel'
import { CreateStoryModal } from '@/components/admin/canvas/create-story-modal'
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

  // Sort activities by sequence
  const activities = [...(storyMap.activities || [])].sort(
    (a, b) => a.sequence - b.sequence
  )

  // Count all stories
  const allStories = activities.flatMap((a) => a.user_stories || [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedStoryId(null)
  }, [])

  const handleCellClick = useCallback((activityId: string, layer: StoryMapLayer) => {
    setCreateStoryCell({ activityId, layer })
  }, [])

  const handleStorySelect = useCallback((storyId: string) => {
    setSelectedStoryId(storyId)
  }, [])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <CanvasViewLayout
      header={
        <CanvasHeader
          title={storyMap.name}
          backHref={`/admin/story-maps/${storyMap.id}/edit`}
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'},{' '}
            {allStories.length} stor{allStories.length !== 1 ? 'ies' : 'y'},{' '}
            {layers.length} layer{layers.length !== 1 ? 's' : ''}
          </span>
        </div>
      }
    >
      <CanvasSurface onBackgroundClick={handleBackgroundClick}>
        <StoryMapCanvas
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
