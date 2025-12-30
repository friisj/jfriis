'use client'

import type {
  PortfolioType,
  Horizon,
  ExploreStage,
  ExploitStage,
  InnovationRisk,
  EvidenceStrength,
} from '@/lib/types/database'

export interface PortfolioFilterState {
  portfolioType: 'all' | PortfolioType
  horizon: Horizon[]
  stage: (ExploreStage | ExploitStage)[]
  riskLevel: InnovationRisk[]
  evidenceStrength: EvidenceStrength[]
  needsReview: boolean
}

interface PortfolioFiltersProps {
  filters: PortfolioFilterState
  onFiltersChange: (filters: PortfolioFilterState) => void
  projectCount: number
  totalCount: number
}

export function PortfolioFilters({ filters, onFiltersChange, projectCount, totalCount }: PortfolioFiltersProps) {
  const toggleArrayFilter = <T extends string>(
    key: keyof PortfolioFilterState,
    value: T
  ) => {
    const currentArray = filters[key] as T[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value]

    onFiltersChange({
      ...filters,
      [key]: newArray,
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      portfolioType: 'all',
      horizon: [],
      stage: [],
      riskLevel: [],
      evidenceStrength: [],
      needsReview: false,
    })
  }

  const hasActiveFilters =
    filters.portfolioType !== 'all' ||
    filters.horizon.length > 0 ||
    filters.stage.length > 0 ||
    filters.riskLevel.length > 0 ||
    filters.evidenceStrength.length > 0 ||
    filters.needsReview

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Filters</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Showing {projectCount} of {totalCount} projects
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Portfolio Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Portfolio Type</label>
          <select
            value={filters.portfolioType}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                portfolioType: e.target.value as 'all' | PortfolioType,
              })
            }
            className="w-full px-3 py-2 text-sm rounded-md border bg-background"
          >
            <option value="all">All</option>
            <option value="explore">Explore</option>
            <option value="exploit">Exploit</option>
          </select>
        </div>

        {/* Horizon */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Horizon</label>
          <div className="space-y-1">
            {(['h1', 'h2', 'h3'] as Horizon[]).map((horizon) => (
              <label key={horizon} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.horizon.includes(horizon)}
                  onChange={() => toggleArrayFilter('horizon', horizon)}
                  className="rounded"
                />
                <span>{horizon.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Stage (Explore) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Explore Stage</label>
          <div className="space-y-1">
            {(['ideation', 'discovery', 'validation', 'acceleration'] as ExploreStage[]).map((stage) => (
              <label key={stage} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.stage.includes(stage)}
                  onChange={() => toggleArrayFilter('stage', stage)}
                  className="rounded"
                />
                <span className="capitalize">{stage}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Stage (Exploit) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Exploit Stage</label>
          <div className="space-y-1">
            {(['launch', 'sustaining', 'mature', 'declining'] as ExploitStage[]).map((stage) => (
              <label key={stage} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.stage.includes(stage)}
                  onChange={() => toggleArrayFilter('stage', stage)}
                  className="rounded"
                />
                <span className="capitalize">{stage}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Risk Level */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Risk Level</label>
          <div className="space-y-1">
            {(['low', 'medium', 'high'] as InnovationRisk[]).map((risk) => (
              <label key={risk} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.riskLevel.includes(risk)}
                  onChange={() => toggleArrayFilter('riskLevel', risk)}
                  className="rounded"
                />
                <span className="capitalize">{risk}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Evidence Strength */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Evidence</label>
          <div className="space-y-1">
            {(['strong', 'moderate', 'weak', 'none'] as EvidenceStrength[]).map((evidence) => (
              <label key={evidence} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evidenceStrength.includes(evidence)}
                  onChange={() => toggleArrayFilter('evidenceStrength', evidence)}
                  className="rounded"
                />
                <span className="capitalize">{evidence}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2 border-t">
              <input
                type="checkbox"
                checked={filters.needsReview}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    needsReview: e.target.checked,
                  })
                }
                className="rounded"
              />
              <span>Needs Review</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
