import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSkill } from '@/lib/studio/arena/queries'
import { BASE_SKILL } from '@/lib/studio/arena/base-skill'
import { CompareClient } from './compare-client'
import type { SkillState, DimensionState } from '@/lib/studio/arena/types'
import { emptySkillState } from '@/lib/studio/arena/types'

function toFullState(state: SkillState | DimensionState | null, dimension: string | null): SkillState {
  if (!state) return BASE_SKILL
  if (!('decisions' in state)) return state as SkillState
  const full = emptySkillState()
  if (dimension === 'color' || dimension === 'typography' || dimension === 'spacing') {
    full[dimension] = state as DimensionState
  }
  return full
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ against?: string }>
}

export default async function SkillComparePage({ params, searchParams }: Props) {
  const { id } = await params
  const { against } = await searchParams

  const skill = await getSkill(id)
  if (!skill) notFound()

  // Compare against another skill or the base
  let compareSkill = null
  let compareLabel = 'Base Skill'
  if (against) {
    compareSkill = await getSkill(against)
    if (compareSkill) {
      compareLabel = compareSkill.name
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/apps/arena/skills" className="hover:text-slate-700 dark:hover:text-slate-200">Skills</Link>
          <span>/</span>
          <Link href={`/apps/arena/skills/${skill.id}`} className="hover:text-slate-700 dark:hover:text-slate-200">{skill.name}</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {compareLabel} vs. {skill.name}
        </h1>
      </div>

      <CompareClient
        baseSkill={toFullState(compareSkill?.state ?? null, compareSkill?.dimension ?? null) ?? BASE_SKILL}
        compareSkill={toFullState(skill.state, skill.dimension)}
        baseLabel={compareLabel}
        compareLabel={skill.name}
      />
    </div>
  )
}
