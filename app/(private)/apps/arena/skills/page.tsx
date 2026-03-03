import Link from 'next/link'
import { getSkills } from '@/lib/studio/arena/queries'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'

export default async function SkillsPage() {
  const templates = await getSkills({ tier: 'template' })

  if (templates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Skills</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No skills yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Seed base skills to create starting-point decisions for each dimension.
          </p>
        </div>
        <SeedTemplatesButton />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Skills</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {templates.length} base {templates.length === 1 ? 'skill' : 'skills'}
        </p>
      </div>

      <div className="space-y-2">
        {templates.map((skill) => (
          <Link
            key={skill.id}
            href={`/apps/arena/skills/${skill.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{skill.dimension ?? 'full'}/</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{skill.name}</span>
            </div>
            <span className="text-xs text-slate-400">{skill.tier}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
