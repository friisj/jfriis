'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  getFitScoreColorClass,
  getFitScoreLabel,
  getCoverageBadgeClass,
  type VPCFitAnalysis,
} from '@/lib/boundary-objects/vpc-canvas'

// ============================================================================
// Types
// ============================================================================

export interface FitScoreDisplayProps {
  score: number
  analysis?: VPCFitAnalysis | null
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// Components
// ============================================================================

/**
 * Display the overall fit score with optional breakdown
 */
export function FitScoreDisplay({
  score,
  analysis,
  showDetails = false,
  size = 'md',
}: FitScoreDisplayProps) {
  const colorClass = getFitScoreColorClass(score)
  const label = getFitScoreLabel(score)

  const sizeClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-4xl font-bold',
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="flex flex-col">
      {/* Main Score */}
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md', colorClass)}>
        <span className={sizeClasses[size]}>{score}%</span>
        <span className={cn('font-medium', labelSizeClasses[size])}>{label}</span>
        <FitTrendIcon score={score} />
      </div>

      {/* Detailed Breakdown */}
      {showDetails && analysis && (
        <div className="mt-2 space-y-1">
          <CoverageBar label="Pains" coverage={analysis.pain_coverage} />
          <CoverageBar label="Gains" coverage={analysis.gain_coverage} />
          <CoverageBar label="Jobs" coverage={analysis.job_coverage} />
        </div>
      )}
    </div>
  )
}

/**
 * Trend icon based on score
 */
function FitTrendIcon({ score }: { score: number }) {
  if (score >= 60) {
    return <TrendingUp className="w-4 h-4" />
  }
  if (score >= 40) {
    return <Minus className="w-4 h-4" />
  }
  return <TrendingDown className="w-4 h-4" />
}

/**
 * Get coverage colors for bar and text separately
 */
function getCoverageColors(coverage: number): { bar: string; text: string } {
  if (coverage >= 80) return { bar: 'bg-green-600', text: 'text-green-800' }
  if (coverage >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-800' }
  return { bar: 'bg-red-500', text: 'text-red-800' }
}

/**
 * Coverage progress bar
 */
function CoverageBar({ label, coverage }: { label: string; coverage: number }) {
  const colors = getCoverageColors(coverage)

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colors.bar)}
          style={{ width: `${coverage}%` }}
        />
      </div>
      <span className={cn('w-10 text-right font-medium', colors.text)}>{coverage}%</span>
    </div>
  )
}

/**
 * Compact fit score badge for use in headers
 */
export function FitScoreBadge({ score }: { score: number }) {
  const colorClass = getFitScoreColorClass(score)

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium', colorClass)}>
      <span>Fit:</span>
      <span>{score}%</span>
    </span>
  )
}

/**
 * Gap indicator showing unaddressed items count
 */
export function GapIndicator({
  unaddressedPains,
  unaddressedGains,
  unaddressedJobs,
}: {
  unaddressedPains: number
  unaddressedGains: number
  unaddressedJobs: number
}) {
  const totalGaps = unaddressedPains + unaddressedGains + unaddressedJobs

  if (totalGaps === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        All needs addressed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
      {totalGaps} gaps
      <span className="text-yellow-500">
        ({unaddressedPains}P / {unaddressedGains}G / {unaddressedJobs}J)
      </span>
    </span>
  )
}
