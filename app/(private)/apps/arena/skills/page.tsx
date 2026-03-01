import Link from 'next/link'
import { getSkills } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'

interface Props {
  searchParams: Promise<{ source?: string; project_id?: string; templates?: string }>
}

export default async function SkillsPage({ searchParams }: Props) {
  const { source, project_id, templates } = await searchParams
  const showTemplates = templates === '1'

  const skills = await getSkills({
    source: source || undefined,
    project_id: project_id || undefined,
    is_template: showTemplates ? true : undefined,
  })

  // Check if any templates exist (for the seed button)
  const templateSkills = showTemplates ? skills : await getSkills({ is_template: true })
  const hasTemplates = templateSkills.length > 0

  const sources = ['figma', 'manual', 'refined', 'base'] as const

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Skills</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All persisted design skills
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Link
          href="/apps/arena/skills"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !source && !showTemplates
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          All
        </Link>
        {sources.map((s) => (
          <Link
            key={s}
            href={`/apps/arena/skills?source=${s}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              source === s
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            {s}
          </Link>
        ))}
        <span className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        <Link
          href="/apps/arena/skills?templates=1"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            showTemplates
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          Templates
        </Link>
      </div>

      {/* Seed templates button */}
      {showTemplates && !hasTemplates && <SeedTemplatesButton />}

      {skills.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">
            {showTemplates ? 'No templates found. Seed base templates to get started.' : 'No skills found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}
