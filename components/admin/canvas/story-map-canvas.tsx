'use client'

import { useCallback, useMemo, useState } from 'react'
import { moveStoryAction } from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import { CanvasMode } from './canvas-header'
import { LayerHeader, AddLayerButton } from './layer-header'
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

interface StoryMapCanvasProps {
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
 * Story Map Canvas Grid
 * Displays activities as columns and layers (actors/system) as rows.
 * Stories are placed in cells based on their activity_id and layer_id.
 */
export function StoryMapCanvas({
  storyMapId,
  activities,
  layers,
  mode,
  selectedStoryId,
  onStorySelect,
  onCellClick,
  onRefresh,
}: StoryMapCanvasProps) {
  const [draggedStory, setDraggedStory] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{
    activityId: string
    layerId: string
  } | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Pre-compute a map of stories by cell key for O(1) lookup
  // Key format: "activityId:layerId" or "activityId:sequence" for fallback
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

  // Get stories for a specific cell using the pre-computed map
  const getStoriesInCell = useCallback(
    (activityId: string, layerId: string): UserStory[] => {
      return storiesByCellMap.get(`${activityId}:${layerId}`) || []
    },
    [storiesByCellMap]
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, storyId: string) => {
      if (mode !== 'drag') return
      e.dataTransfer.setData('text/plain', storyId)
      setDraggedStory(storyId)
    },
    [mode]
  )

  // Handle drag over cell
  const handleDragOver = useCallback(
    (e: React.DragEvent, activityId: string, layerId: string) => {
      if (mode !== 'drag') return
      e.preventDefault()
      setDragOverCell({ activityId, layerId })
    },
    [mode]
  )

  // Handle drop
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

  return (
    <div className="min-w-max p-6">
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Header row with activity names */}
        <div className="flex border-b bg-muted/50">
          {/* Row label column */}
          <div className="w-40 flex-shrink-0 p-3 border-r font-medium text-sm text-muted-foreground">
            Layer
          </div>
          {/* Activity columns */}
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex-1 min-w-[200px] p-3 border-r last:border-r-0"
            >
              <div className="font-medium text-sm">{activity.name}</div>
              {activity.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {activity.description}
                </div>
              )}
            </div>
          ))}
          {/* Empty column placeholder if no activities */}
          {activities.length === 0 && (
            <div className="flex-1 p-3 text-sm text-muted-foreground italic">
              No activities yet
            </div>
          )}
        </div>

        {/* Grid rows - one per layer */}
        {layers.map((layer) => (
          <div key={layer.id} className="flex border-b last:border-b-0">
            {/* Layer label with edit/delete */}
            <LayerHeader
              layer={layer}
              onUpdate={onRefresh}
              onDelete={onRefresh}
            />
            {/* Cells */}
            {activities.map((activity) => {
              const cellStories = getStoriesInCell(activity.id, layer.id)
              const isDropTarget =
                dragOverCell?.activityId === activity.id &&
                dragOverCell?.layerId === layer.id

              const handleCellClick = (e: React.MouseEvent) => {
                // Only trigger if clicking the cell background, not a story card
                if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('space-y-2')) {
                  onCellClick?.(activity.id, layer)
                }
              }

              return (
                <div
                  key={`${activity.id}-${layer.id}`}
                  className={`
                    flex-1 min-w-[200px] min-h-[100px] p-2 border-r last:border-r-0
                    ${isDropTarget ? 'bg-primary/10' : ''}
                    ${mode === 'drag' ? 'cursor-pointer' : ''}
                    ${mode === 'structured' && onCellClick ? 'cursor-pointer hover:bg-muted/30' : ''}
                  `}
                  onClick={mode === 'structured' ? handleCellClick : undefined}
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
                      <div className="h-full min-h-[80px] flex items-center justify-center text-muted-foreground/50 text-sm">
                        + Add Story
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {activities.length === 0 && (
              <div className="flex-1 p-3 text-sm text-muted-foreground" />
            )}
          </div>
        ))}

        {/* Add layer button */}
        <AddLayerButton
          storyMapId={storyMapId}
          nextSequence={layers.length}
          onAdd={onRefresh}
        />

        {/* Empty state if no layers */}
        {layers.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            No layers defined. Refresh to create default layers.
          </div>
        )}
      </div>
    </div>
  )
}

// Story Card Component
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
