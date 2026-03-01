'use client'

import type { SkillState } from '@/lib/studio/arena/types'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from '@/components/studio/prototypes/arena/shared/canonical-components'
import { TokenDiff } from './token-diff'

interface SkillCompareViewProps {
  baseSkill: SkillState
  compareSkill: SkillState
  baseLabel?: string
  compareLabel?: string
  fontOverrides?: { display?: string; body?: string; mono?: string }
}

export function SkillCompareView({
  baseSkill,
  compareSkill,
  baseLabel = 'Base',
  compareLabel = 'Compare',
  fontOverrides,
}: SkillCompareViewProps) {
  return (
    <div className="space-y-6">
      {/* Card comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Card</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalCard skill={baseSkill} label={baseLabel} />
          <CanonicalCard skill={compareSkill} label={compareLabel} fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Form comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Form</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalForm skill={baseSkill} label={baseLabel} />
          <CanonicalForm skill={compareSkill} label={compareLabel} fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Dashboard comparison */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanonicalDashboard skill={baseSkill} label={baseLabel} />
          <CanonicalDashboard skill={compareSkill} label={compareLabel} fontOverrides={fontOverrides} />
        </div>
      </div>

      {/* Token diff */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Token Diff</h3>
        <TokenDiff baseSkill={baseSkill} compareSkill={compareSkill} />
      </div>
    </div>
  )
}
