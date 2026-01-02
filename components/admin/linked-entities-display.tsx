'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type {
  LinkableEntityType,
  LinkType,
  EntityLink,
} from '@/lib/types/entity-relationships'
import { getLinkedEntitiesWithData } from '@/lib/entity-links'
import { getTableNameForType } from '@/lib/types/entity-relationships'

interface LinkedEntity {
  link: EntityLink
  entity: Record<string, unknown>
}

interface LinkedEntitiesDisplayProps {
  sourceType: LinkableEntityType
  sourceId: string
  targetType: LinkableEntityType
  linkType?: LinkType
  displayField?: string
  subtitleField?: string
  emptyMessage?: string
  showStrength?: boolean
  linkTo?: (entityId: string) => string
  className?: string
  compact?: boolean
}

/**
 * Read-only display of linked entities.
 * Use in detail views or read-only sections.
 */
export function LinkedEntitiesDisplay({
  sourceType,
  sourceId,
  targetType,
  linkType,
  displayField = 'name',
  subtitleField,
  emptyMessage = 'No linked items',
  showStrength = false,
  linkTo,
  className = '',
  compact = false,
}: LinkedEntitiesDisplayProps) {
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLinkedEntities = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getLinkedEntitiesWithData(
          { type: sourceType, id: sourceId },
          targetType,
          linkType
        )
        setLinkedEntities(data)
      } catch (err) {
        console.error('Error loading linked entities:', err)
        setError('Failed to load linked items')
      } finally {
        setLoading(false)
      }
    }

    loadLinkedEntities()
  }, [sourceType, sourceId, targetType, linkType])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <p className={`text-sm text-red-500 ${className}`}>{error}</p>
    )
  }

  if (!linkedEntities.length) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>{emptyMessage}</p>
    )
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {linkedEntities.map(({ link, entity }) => {
          const label = (entity[displayField] as string) || (entity.id as string)
          const href = linkTo?.(link.target_id)

          if (href) {
            return (
              <Link
                key={link.id}
                href={href}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
              >
                {label}
              </Link>
            )
          }

          return (
            <span
              key={link.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted"
            >
              {label}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {linkedEntities.map(({ link, entity }) => {
        const label = (entity[displayField] as string) || (entity.id as string)
        const subtitle = subtitleField ? (entity[subtitleField] as string) : undefined
        const href = linkTo?.(link.target_id)

        return (
          <li key={link.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {href ? (
                <Link
                  href={href}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              ) : (
                <span className="text-sm font-medium">{label}</span>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
              {link.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{link.notes}</p>
              )}
            </div>
            {showStrength && link.strength && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${getStrengthClasses(link.strength)}`}
              >
                {link.strength}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function getStrengthClasses(strength: string): string {
  switch (strength) {
    case 'strong':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'moderate':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'weak':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'tentative':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Display linked entity counts (for list views)
 */
interface LinkedEntityCountsProps {
  sourceType: LinkableEntityType
  sourceId: string
  targetTypes: LinkableEntityType[]
  className?: string
}

export function LinkedEntityCounts({
  sourceType,
  sourceId,
  targetTypes,
  className = '',
}: LinkedEntityCountsProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCounts = async () => {
      setLoading(true)
      try {
        const countPromises = targetTypes.map(async (targetType) => {
          const data = await getLinkedEntitiesWithData(
            { type: sourceType, id: sourceId },
            targetType
          )
          return { type: targetType, count: data.length }
        })

        const results = await Promise.all(countPromises)
        const newCounts: Record<string, number> = {}
        results.forEach(({ type, count }) => {
          if (count > 0) {
            newCounts[type] = count
          }
        })
        setCounts(newCounts)
      } catch (err) {
        console.error('Error loading counts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCounts()
  }, [sourceType, sourceId, targetTypes])

  if (loading) {
    return <span className="text-xs text-muted-foreground">...</span>
  }

  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return null
  }

  const formattedCounts = entries
    .map(([type, count]) => `${count} ${formatEntityType(type, count)}`)
    .join(', ')

  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      {formattedCounts}
    </span>
  )
}

function formatEntityType(type: string, count: number): string {
  // Convert snake_case to human-readable
  const readable = type.replace(/_/g, ' ')
  // Simple pluralization
  return count === 1 ? readable : `${readable}s`
}
