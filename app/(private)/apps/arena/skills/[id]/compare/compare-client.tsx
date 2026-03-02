'use client'

import type { SkillState } from '@/lib/studio/arena/types'
import { SkillCompareView } from '@/components/studio/arena/skill-compare-view'

interface CompareClientProps {
  baseSkill: SkillState
  compareSkill: SkillState
  baseLabel: string
  compareLabel: string
}

export function CompareClient({ baseSkill, compareSkill, baseLabel, compareLabel }: CompareClientProps) {
  return (
    <SkillCompareView
      baseSkill={baseSkill}
      compareSkill={compareSkill}
      baseLabel={baseLabel}
      compareLabel={compareLabel}
    />
  )
}
