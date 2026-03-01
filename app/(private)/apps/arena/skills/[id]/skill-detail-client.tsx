'use client'

import type { ArenaSkillWithLineage } from '@/lib/studio/arena/db-types'
import { InferredSkillPanel } from '@/components/studio/prototypes/arena/shared/skill-panel'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from '@/components/studio/prototypes/arena/shared/canonical-components'

interface SkillDetailClientProps {
  skill: ArenaSkillWithLineage
}

export function SkillDetailClient({ skill }: SkillDetailClientProps) {
  return (
    <div className="space-y-6">
      {/* Token panel */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Decisions &amp; Rules</h2>
        <InferredSkillPanel skill={skill.state} />
      </div>

      {/* Canonical previews */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Canonical Previews</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Card</h3>
            <CanonicalCard skill={skill.state} label={skill.name} />
          </div>
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Form</h3>
            <CanonicalForm skill={skill.state} label={skill.name} />
          </div>
          <div>
            <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-2">Dashboard</h3>
            <CanonicalDashboard skill={skill.state} label={skill.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
