'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import type {
  SeverityLevel,
  ImportanceLevel,
  JobType,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  getSeverityBadgeClass,
  getImportanceBadgeClass,
  getJobTypeBadgeClass,
} from '@/lib/boundary-objects/customer-profile-canvas'
import type {
  ProductType,
  EffectivenessLevel,
} from '@/lib/boundary-objects/value-map-canvas'
import {
  getProductTypeBadgeClass,
  getEffectivenessBadgeClass,
} from '@/lib/boundary-objects/value-map-canvas'

// ============================================================================
// Base Badge Component
// ============================================================================

interface BaseBadgeProps {
  className?: string
  children: React.ReactNode
}

const BaseBadge = memo(function BaseBadge({ className, children }: BaseBadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0',
        className
      )}
    >
      {children}
    </span>
  )
})

// ============================================================================
// Severity Badge (for Pains)
// ============================================================================

interface SeverityBadgeProps {
  severity: SeverityLevel | undefined
  className?: string
}

export const SeverityBadge = memo(function SeverityBadge({
  severity,
  className,
}: SeverityBadgeProps) {
  if (!severity) return null

  const labels: Record<SeverityLevel, string> = {
    extreme: 'Extreme',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }

  return (
    <BaseBadge className={cn(getSeverityBadgeClass(severity), className)}>
      {labels[severity]}
    </BaseBadge>
  )
})

// ============================================================================
// Importance Badge (for Jobs and Gains)
// ============================================================================

interface ImportanceBadgeProps {
  importance: ImportanceLevel | undefined
  className?: string
}

export const ImportanceBadge = memo(function ImportanceBadge({
  importance,
  className,
}: ImportanceBadgeProps) {
  if (!importance) return null

  const labels: Record<ImportanceLevel, string> = {
    critical: 'Critical',
    important: 'Important',
    nice_to_have: 'Nice to Have',
  }

  return (
    <BaseBadge className={cn(getImportanceBadgeClass(importance), className)}>
      {labels[importance]}
    </BaseBadge>
  )
})

// ============================================================================
// Job Type Badge
// ============================================================================

interface JobTypeBadgeProps {
  type: JobType | undefined
  className?: string
}

export const JobTypeBadge = memo(function JobTypeBadge({
  type,
  className,
}: JobTypeBadgeProps) {
  if (!type) return null

  const labels: Record<JobType, string> = {
    functional: 'Functional',
    social: 'Social',
    emotional: 'Emotional',
  }

  return (
    <BaseBadge className={cn(getJobTypeBadgeClass(type), className)}>
      {labels[type]}
    </BaseBadge>
  )
})

// ============================================================================
// Product Type Badge
// ============================================================================

interface ProductTypeBadgeProps {
  type: ProductType | undefined
  className?: string
}

export const ProductTypeBadge = memo(function ProductTypeBadge({
  type,
  className,
}: ProductTypeBadgeProps) {
  if (!type) return null

  const labels: Record<ProductType, string> = {
    product: 'Product',
    service: 'Service',
    feature: 'Feature',
  }

  return (
    <BaseBadge className={cn(getProductTypeBadgeClass(type), className)}>
      {labels[type]}
    </BaseBadge>
  )
})

// ============================================================================
// Effectiveness Badge (for Pain Relievers and Gain Creators)
// ============================================================================

interface EffectivenessBadgeProps {
  effectiveness: EffectivenessLevel | undefined
  className?: string
}

export const EffectivenessBadge = memo(function EffectivenessBadge({
  effectiveness,
  className,
}: EffectivenessBadgeProps) {
  if (!effectiveness) return null

  const labels: Record<EffectivenessLevel, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }

  return (
    <BaseBadge className={cn(getEffectivenessBadgeClass(effectiveness), className)}>
      {labels[effectiveness]}
    </BaseBadge>
  )
})
