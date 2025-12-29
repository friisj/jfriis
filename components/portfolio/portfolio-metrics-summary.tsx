'use client'

import type { Project } from '@/lib/types/database'

interface PortfolioMetricsSummaryProps {
  projects: Project[]
}

export function PortfolioMetricsSummary({ projects }: PortfolioMetricsSummaryProps) {
  // Calculate portfolio metrics
  const exploreCount = projects.filter((p) => p.portfolio_type === 'explore').length
  const exploitCount = projects.filter((p) => p.portfolio_type === 'exploit').length
  const uncategorizedCount = projects.filter((p) => !p.portfolio_type).length

  const h1Count = projects.filter((p) => p.horizon === 'h1').length
  const h2Count = projects.filter((p) => p.horizon === 'h2').length
  const h3Count = projects.filter((p) => p.horizon === 'h3').length
  const totalHorizonCount = h1Count + h2Count + h3Count

  const strongEvidenceCount = projects.filter((p) => p.evidence_strength === 'strong').length
  const moderateEvidenceCount = projects.filter((p) => p.evidence_strength === 'moderate').length
  const weakEvidenceCount = projects.filter((p) => p.evidence_strength === 'weak').length
  const noEvidenceCount = projects.filter((p) => !p.evidence_strength || p.evidence_strength === 'none').length

  const needsReviewCount = projects.filter((p) => {
    if (!p.next_review_due_at) return false
    const dueDate = new Date(p.next_review_due_at)
    return dueDate <= new Date()
  }).length

  const totalInvestment = projects.reduce((sum, p) => sum + (p.total_investment || 0), 0)
  const exploreInvestment = projects
    .filter((p) => p.portfolio_type === 'explore')
    .reduce((sum, p) => sum + (p.total_investment || 0), 0)
  const exploitInvestment = projects
    .filter((p) => p.portfolio_type === 'exploit')
    .reduce((sum, p) => sum + (p.total_investment || 0), 0)

  // Calculate horizon percentages (for 70-20-10 rule)
  const h1Percentage = totalHorizonCount > 0 ? Math.round((h1Count / totalHorizonCount) * 100) : 0
  const h2Percentage = totalHorizonCount > 0 ? Math.round((h2Count / totalHorizonCount) * 100) : 0
  const h3Percentage = totalHorizonCount > 0 ? Math.round((h3Count / totalHorizonCount) * 100) : 0

  // Check if horizon balance is off (too far from 70-20-10)
  const horizonImbalance =
    Math.abs(h1Percentage - 70) > 20 || Math.abs(h2Percentage - 20) > 15 || Math.abs(h3Percentage - 10) > 10

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Portfolio Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Portfolio Balance */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Portfolio Balance</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Explore</span>
                <span className="font-semibold">{exploreCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Exploit</span>
                <span className="font-semibold">{exploitCount}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm">Uncategorized</span>
                <span className="font-semibold">{uncategorizedCount}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-sm font-medium">Total</span>
                <span className="font-bold">{projects.length}</span>
              </div>
            </div>
          </div>

          {/* Horizon Balance (70-20-10 rule) */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Horizon Balance
              {horizonImbalance && (
                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">⚠️ Imbalanced</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">H1 Core</span>
                <span className="font-semibold">
                  {h1Count} <span className="text-xs text-muted-foreground">({h1Percentage}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">H2 Adjacent</span>
                <span className="font-semibold">
                  {h2Count} <span className="text-xs text-muted-foreground">({h2Percentage}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">H3 Transform</span>
                <span className="font-semibold">
                  {h3Count} <span className="text-xs text-muted-foreground">({h3Percentage}%)</span>
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t">Target: 70-20-10</div>
            </div>
          </div>

          {/* Evidence Strength */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Evidence Strength</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Strong</span>
                </div>
                <span className="font-semibold">{strongEvidenceCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm">Moderate</span>
                </div>
                <span className="font-semibold">{moderateEvidenceCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm">Weak</span>
                </div>
                <span className="font-semibold">{weakEvidenceCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-sm">None</span>
                </div>
                <span className="font-semibold">{noEvidenceCount}</span>
              </div>
            </div>
          </div>

          {/* Investment & Attention */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Investment & Attention</div>
            <div className="space-y-1">
              {totalInvestment > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Investment</span>
                    <span className="font-semibold">${(totalInvestment / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Explore</span>
                    <span className="text-sm text-muted-foreground">
                      ${(exploreInvestment / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Exploit</span>
                    <span className="text-sm text-muted-foreground">
                      ${(exploitInvestment / 1000).toFixed(0)}K
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">Needs Review</span>
                <span className={`font-semibold ${needsReviewCount > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                  {needsReviewCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
