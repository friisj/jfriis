import Link from 'next/link'
import type { ArenaSkill } from '@/lib/studio/arena/db-types'

const sourceColors: Record<string, string> = {
  figma: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  manual: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  refined: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  base: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

interface SkillCardProps {
  skill: ArenaSkill
}

export function SkillCard({ skill }: SkillCardProps) {
  const decisionCount = (['color', 'typography', 'spacing'] as const).reduce(
    (sum, d) => sum + (skill.state[d]?.decisions?.length ?? 0), 0
  )

  return (
    <Link
      href={`/apps/arena/skills/${skill.id}`}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow block"
    >
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {skill.name}
      </h3>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className={`px-2 py-0.5 rounded ${sourceColors[skill.source] ?? sourceColors.base}`}>
          {skill.source}
        </span>
        <span>{decisionCount} decisions</span>
        <span>{new Date(skill.updated_at).toLocaleDateString()}</span>
      </div>
    </Link>
  )
}
