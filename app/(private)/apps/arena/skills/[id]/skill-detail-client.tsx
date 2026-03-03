'use client'

import type { ArenaSkillWithLineage, ArenaTheme } from '@/lib/studio/arena/db-types'
import type { SkillState, DimensionState, ProjectTheme } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import { InferredSkillPanel } from '@/components/studio/prototypes/arena/shared/skill-panel'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from '@/components/studio/prototypes/arena/shared/canonical-components'

interface SkillDetailClientProps {
  skill: ArenaSkillWithLineage
  themes?: ArenaTheme[]
}

/** Convert a per-dimension or monolithic skill state to a full SkillState for preview */
function toFullSkillState(state: SkillState | DimensionState, dimension: string | null): SkillState {
  if (!('decisions' in state)) {
    // Already a full SkillState
    return state as SkillState
  }
  // Per-dimension: slot into an empty shell
  const full = emptySkillState()
  if (dimension) {
    full[dimension] = state as DimensionState
  }
  return full
}

export function SkillDetailClient({ skill, themes }: SkillDetailClientProps) {
  const fullState = toFullSkillState(skill.state, skill.dimension)
  const isDimension = skill.dimension !== null

  // Build ProjectTheme from theme rows
  const projectTheme: ProjectTheme | undefined = themes && themes.length > 0
    ? themes.reduce<ProjectTheme>((acc, t) => {
        acc[t.dimension] = { tokens: t.tokens, source: t.source }
        return acc
      }, {})
    : undefined

  return (
    <div className="space-y-6">
      {isDimension && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Per-dimension skill: <span className="font-medium text-slate-800 dark:text-slate-200">{skill.dimension}</span>.
            Preview shows this dimension applied to canonical components (other dimensions empty).
          </p>
        </div>
      )}

      {/* Token panel */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Decisions &amp; Rules</h2>
        <InferredSkillPanel skill={fullState} />
      </div>

      {/* Canonical previews */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Canonical Previews</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Card</h3>
            <CanonicalCard skill={fullState} label={skill.name} theme={projectTheme} />
          </div>
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Form</h3>
            <CanonicalForm skill={fullState} label={skill.name} theme={projectTheme} />
          </div>
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Dashboard</h3>
            <CanonicalDashboard skill={fullState} label={skill.name} theme={projectTheme} />
          </div>
        </div>
      </div>
    </div>
  )
}
