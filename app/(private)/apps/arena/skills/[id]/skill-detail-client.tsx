'use client'

import type { ArenaSkillWithLineage, ArenaTheme } from '@/lib/studio/arena/db-types'
import type { SkillState, DimensionState, ProjectTheme } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'
import { skillToRaw, themeToRaw } from '@/lib/studio/arena/format'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from '@/components/studio/prototypes/arena/shared/canonical-components'

interface SkillDetailClientProps {
  skill: ArenaSkillWithLineage
  themes?: ArenaTheme[]
}

/** Get the dimensions and their states from the skill */
function getSkillDimensions(skill: ArenaSkillWithLineage): { dimension: string; state: DimensionState }[] {
  const state = skill.state
  if ('decisions' in state) {
    // Per-dimension skill: state is a DimensionState directly
    return [{ dimension: skill.dimension ?? 'unknown', state: state as DimensionState }]
  }
  // Full skill: state is Record<string, DimensionState>
  return Object.entries(state as SkillState)
    .filter(([, ds]) => ds.decisions.length > 0 || ds.rules.length > 0)
    .map(([dim, ds]) => ({ dimension: dim, state: ds }))
}

/** Convert to full SkillState for canonical component previews */
function toFullSkillState(state: SkillState | DimensionState, dimension: string | null): SkillState {
  if (!('decisions' in state)) {
    return state as SkillState
  }
  const full = emptySkillState()
  if (dimension) {
    full[dimension] = state as DimensionState
  }
  return full
}

export function SkillDetailClient({ skill, themes }: SkillDetailClientProps) {
  const dimensions = getSkillDimensions(skill)
  const fullState = toFullSkillState(skill.state, skill.dimension)

  // Build ProjectTheme from theme rows for canonical previews
  const projectTheme: ProjectTheme | undefined = themes && themes.length > 0
    ? themes.reduce<ProjectTheme>((acc, t) => {
        acc[t.dimension] = { tokens: t.tokens, source: t.source }
        return acc
      }, {})
    : undefined

  return (
    <div className="space-y-6">
      {/* Raw skill + theme blocks per dimension */}
      {dimensions.map(({ dimension, state }) => {
        const themeRow = themes?.find(t => t.dimension === dimension)
        const rawSkill = skillToRaw(state)
        const rawTheme = themeRow
          ? themeToRaw(themeRow.tokens, dimension, { name: themeRow.name, platform: themeRow.platform })
          : null

        return (
          <div key={dimension} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{dimension}/</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-2">
                  skill.yaml
                </div>
                <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {rawSkill}
                </pre>
              </div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-2">
                  theme.config
                </div>
                {rawTheme ? (
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {rawTheme}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 italic">No theme config</p>
                )}
              </div>
            </div>
          </div>
        )
      })}

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
