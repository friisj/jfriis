'use client'

import { useCallback, useMemo, useState } from 'react'
import { TimelineCanvas } from './timeline-canvas'
import { ActivityHeader, AddActivityButton } from './activity-header'
import { LayerHeader, AddLayerButton } from './layer-header'
import { moveStoryAction } from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import { CanvasMode } from './canvas-header'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'

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

interface Activity {
  id: string
  name: string
  description: string | null
  sequence: number
  user_goal: string | null
  user_stories: UserStory[]
}

interface StoryMapTimelineCanvasProps {
  storyMapId: string
  activities: Activity[]
  layers: StoryMapLayer[]
  mode: CanvasMode
  selectedStoryId: string | null
  onStorySelect: (storyId: string) => void
  onCellClick?: (activityId: string, layer: StoryMapLayer) => void
  onRefresh: () => void
}

/**
 * Story Map Canvas using TimelineCanvas base component
 *
 * Maps Story Map concepts to Timeline concepts:
 * - Activities → Steps (columns)
 * - Layers → Layers (rows)
 *
 * Adds Story Map-specific features:
 * - Story cards within cells
 * - Drag-and-drop between cells
 * - Dynamic layers (user-created)
 */
export function StoryMapTimelineCanvas({
  storyMapId,
  activities,
  layers,
  mode,
  selectedStoryId,
  onStorySelect,
  onCellClick,
  onRefresh,
}: StoryMapTimelineCanvasProps) {
  const [draggedStory, setDraggedStory] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{
    activityId: string
    layerId: string
  } | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Pre-compute a map of stories by cell key for O(1) lookup
  const storiesByCellMap = useMemo(() => {
    const map = new Map<string, UserStory[]>()

    // Create a sequence-to-layerId lookup for fallback matching
    const sequenceToLayerId = new Map<number, string>()
    layers.forEach((layer) => {
      sequenceToLayerId.set(layer.sequence, layer.id)
    })

    activities.forEach((activity) => {
      (activity.user_stories || []).forEach((story) => {
        let layerId = story.layer_id
        // Fallback: use vertical_position to find layer
        if (!layerId) {
          layerId = sequenceToLayerId.get(story.vertical_position ?? 0) || null
        }
        if (layerId) {
          const key = `${activity.id}:${layerId}`
          const existing = map.get(key) || []
          existing.push(story)
          map.set(key, existing)
        }
      })
    })

    return map
  }, [activities, layers])

  // Get stories for a specific cell
  const getStoriesInCell = useCallback(
    (activityId: string, layerId: string): UserStory[] => {
      return storiesByCellMap.get(`${activityId}:${layerId}`) || []
    },
    [storiesByCellMap]
  )

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, storyId: string) => {
      if (mode !== 'drag') return
      e.dataTransfer.setData('text/plain', storyId)
      setDraggedStory(storyId)
    },
    [mode]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, activityId: string, layerId: string) => {
      if (mode !== 'drag') return
      e.preventDefault()
      setDragOverCell({ activityId, layerId })
    },
    [mode]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent, activityId: string, layer: StoryMapLayer) => {
      if (mode !== 'drag' || isMoving) return
      e.preventDefault()

      const storyId = e.dataTransfer.getData('text/plain')
      if (!storyId) return

      setDraggedStory(null)
      setDragOverCell(null)
      setIsMoving(true)

      const result = await moveStoryAction(
        storyId,
        activityId,
        layer.id,
        layer.sequence
      )

      setIsMoving(false)

      if (!result.success) {
        console.error('Failed to move story:', result.error)
        return
      }

      onRefresh()
    },
    [mode, onRefresh, isMoving]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedStory(null)
    setDragOverCell(null)
  }, [])

  // Render cell content with stories and drag-drop
  const renderCell = useCallback(
    (activity: Activity, layer: StoryMapLayer) => {
      const cellStories = getStoriesInCell(activity.id, layer.id)
      const isDropTarget =
        dragOverCell?.activityId === activity.id &&
        dragOverCell?.layerId === layer.id

      const handleCellClickInner = (e: React.MouseEvent) => {
        // Only trigger if NOT clicking a story card (check for data attribute)
        const target = e.target as HTMLElement
        const isStoryCard = target.closest('[data-story-card]')
        if (!isStoryCard) {
          onCellClick?.(activity.id, layer)
        }
      }

      return (
        <div
          className={`
            w-full h-full min-h-[80px]
            ${isDropTarget ? 'bg-primary/10' : ''}
            ${mode === 'structured' && onCellClick ? 'cursor-pointer' : ''}
          `}
          onClick={mode === 'structured' ? handleCellClickInner : undefined}
          onDragOver={(e) => handleDragOver(e, activity.id, layer.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, activity.id, layer)}
        >
          <div className="space-y-2">
            {cellStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isSelected={selectedStoryId === story.id}
                isDragging={draggedStory === story.id}
                mode={mode}
                onSelect={() => onStorySelect(story.id)}
                onDragStart={(e) => handleDragStart(e, story.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
            {/* Empty cell indicator */}
            {cellStories.length === 0 && mode === 'structured' && onCellClick && (
              <div className="h-full min-h-[60px] flex items-center justify-center text-muted-foreground/50 text-sm">
                + Add Story
              </div>
            )}
          </div>
        </div>
      )
    },
    [
      getStoriesInCell,
      dragOverCell,
      mode,
      onCellClick,
      selectedStoryId,
      draggedStory,
      onStorySelect,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    ]
  )

  // Render activity (step) header
  const renderStepHeader = useCallback(
    (activity: Activity) => {
      return (
        <ActivityHeader
          activity={activity}
          onUpdate={onRefresh}
          onDelete={onRefresh}
        />
      )
    },
    [onRefresh]
  )

  // Render layer (lane) header
  const renderLaneHeader = useCallback(
    (layer: StoryMapLayer) => {
      return (
        <LayerHeader layer={layer} onUpdate={onRefresh} onDelete={onRefresh} />
      )
    },
    [onRefresh]
  )

  // Render add activity button
  const renderAddStep = useCallback(() => {
    return (
      <AddActivityButton
        storyMapId={storyMapId}
        nextSequence={activities.length}
        onAdd={onRefresh}
      />
    )
  }, [storyMapId, activities.length, onRefresh])

  return (
    <div>
      <TimelineCanvas
        steps={activities}
        layers={layers}
        mode={mode}
        getStepId={(activity) => activity.id}
        getStepName={(activity) => activity.name}
        getStepSequence={(activity) => activity.sequence}
        getLayerId={(layer) => layer.id}
        getLayerName={(layer) => layer.name}
        renderCell={renderCell}
        renderStepHeader={renderStepHeader}
        renderLaneHeader={renderLaneHeader}
        renderAddStep={renderAddStep}
        emptyStateMessage="No activities defined. Click &quot;+ Add Activity&quot; to create your first activity."
        onBackgroundClick={() => {}}
      />
      {/* Add layer button below grid */}
      <div className="px-6 pb-4">
        <AddLayerButton
          storyMapId={storyMapId}
          nextSequence={layers.length}
          onAdd={onRefresh}
        />
      </div>
    </div>
  )
}

// Story Card Component (same as original)
interface StoryCardProps {
  story: UserStory
  isSelected: boolean
  isDragging: boolean
  mode: CanvasMode
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function StoryCard({
  story,
  isSelected,
  isDragging,
  mode,
  onSelect,
  onDragStart,
  onDragEnd,
}: StoryCardProps) {
  const priorityColors: Record<string, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-gray-400',
  }

  const statusColors: Record<string, string> = {
    backlog: 'bg-gray-100',
    ready: 'bg-blue-100',
    in_progress: 'bg-yellow-100',
    review: 'bg-purple-100',
    done: 'bg-green-100',
    archived: 'bg-orange-100',
  }

  return (
    <div
      data-story-card
      draggable={mode === 'drag'}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`
        p-2 rounded border-l-4 cursor-pointer transition-all
        ${priorityColors[story.priority || 'low'] || 'border-l-gray-300'}
        ${statusColors[story.status] || 'bg-white'}
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${mode === 'drag' ? 'hover:shadow-md' : 'hover:bg-opacity-80'}
      `}
    >
      <div className="font-medium text-sm line-clamp-2">{story.title}</div>
      {story.description && (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {story.description}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        {story.story_type && (
          <span className="capitalize">{story.story_type}</span>
        )}
        {story.story_points && <span>{story.story_points} pts</span>}
      </div>
    </div>
  )
}
