'use client'

import { ReactNode, useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { ViewErrorBoundary } from './view-error-boundary'

export interface KanbanGroup {
  id: string
  label: string
  color?: string
}

export interface KanbanViewConfig<T> {
  groupBy: keyof T | ((item: T) => string)
  groups: KanbanGroup[]
  renderCard: (item: T) => ReactNode
  onMove?: (item: T, fromGroup: string, toGroup: string) => Promise<void>
}

interface KanbanViewProps<T extends { id: string }> {
  data: T[]
  groupBy: keyof T | ((item: T) => string)
  groups: KanbanGroup[]
  renderCard: (item: T) => ReactNode
  onMove?: (item: T, fromGroup: string, toGroup: string) => Promise<void>
}

interface SortableCardProps {
  id: string
  children: ReactNode
}

function SortableCard({ id, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

interface KanbanColumnProps<T> {
  group: KanbanGroup
  items: T[]
  renderCard: (item: T) => ReactNode
}

function KanbanColumn<T extends { id: string }>({
  group,
  items,
  renderCard,
}: KanbanColumnProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: group.id,
  })

  return (
    <div className="flex-1 min-w-[280px] max-w-[400px]">
      <div className="flex flex-col h-full">
        {/* Column header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            {group.color && (
              <div
                className={`w-2 h-2 rounded-full ${group.color}`}
                aria-hidden="true"
              />
            )}
            <h3 className="text-sm font-semibold">{group.label}</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>

        {/* Column content - now a proper droppable zone */}
        <div
          ref={setNodeRef}
          className={`flex-1 min-h-[200px] rounded-lg border-2 border-dashed p-2 transition-colors ${
            isOver
              ? 'border-primary bg-primary/5'
              : 'border-muted bg-muted/20'
          }`}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SortableCard key={item.id} id={item.id}>
                  <ViewErrorBoundary viewType="card">
                    {renderCard(item)}
                  </ViewErrorBoundary>
                </SortableCard>
              ))}
              {items.length === 0 && (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Drop items here
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

export function KanbanView<T extends { id: string }>({
  data,
  groupBy,
  groups,
  renderCard,
  onMove,
}: KanbanViewProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string>('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  )

  // Helper to get group for an item
  const getItemGroup = (item: T): string => {
    if (typeof groupBy === 'function') {
      return groupBy(item)
    }
    return String(item[groupBy])
  }

  // Group items by their status/group (memoized for performance)
  const groupedItems = useMemo(
    () =>
      groups.reduce(
        (acc, group) => {
          acc[group.id] = data.filter((item) => getItemGroup(item) === group.id)
          return acc
        },
        {} as Record<string, T[]>
      ),
    [data, groups, groupBy]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)

    // Announce to screen readers
    const item = data.find((d) => d.id === id)
    if (item) {
      const fromGroup = getItemGroup(item)
      const groupLabel = groups.find((g) => g.id === fromGroup)?.label || fromGroup
      setAnnouncement(`Picked up item from ${groupLabel}`)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      setAnnouncement('Drag cancelled')
      return
    }

    // Find the item being dragged
    const item = data.find((d) => d.id === active.id)
    if (!item) return

    // Determine the target group
    let targetGroupId: string | null = null

    // Check if dropped over a group container
    const overGroup = groups.find((g) => g.id === over.id)
    if (overGroup) {
      targetGroupId = overGroup.id
    } else {
      // Dropped over another item - find which group that item belongs to
      const overItem = data.find((d) => d.id === over.id)
      if (overItem) {
        targetGroupId = getItemGroup(overItem)
      }
    }

    if (!targetGroupId) return

    const fromGroup = getItemGroup(item)
    if (fromGroup === targetGroupId) {
      setAnnouncement('Item returned to same column')
      return // No change
    }

    // Get group labels for announcements
    const fromLabel = groups.find((g) => g.id === fromGroup)?.label || fromGroup
    const toLabel = groups.find((g) => g.id === targetGroupId)?.label || targetGroupId

    // Call the onMove handler
    if (onMove) {
      try {
        await onMove(item, fromGroup, targetGroupId)
        toast.success('Item moved successfully')
        setAnnouncement(`Item moved from ${fromLabel} to ${toLabel}`)
      } catch (error) {
        console.error('Failed to move item:', error)
        toast.error('Failed to move item. Please try again.')
        setAnnouncement(`Failed to move item from ${fromLabel} to ${toLabel}`)
      }
    }
  }

  const activeItem = activeId ? data.find((item) => item.id === activeId) : null

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {groups.map((group) => (
            <KanbanColumn
              key={group.id}
              group={group}
              items={groupedItems[group.id] || []}
              renderCard={renderCard}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-80 rotate-3 scale-105 shadow-lg">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>

      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </DndContext>
  )
}
