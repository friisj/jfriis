import Link from 'next/link'
import { getSkills, getTemplateThemes } from '@/lib/studio/arena/queries'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'
import type { ArenaTheme } from '@/lib/studio/arena/db-types'

export default async function TemplatesPage() {
  const templates = await getSkills({ tier: 'template' })
  const allThemes = await getTemplateThemes()

  // Group themes by name (e.g. "default", "dark")
  const themeNames = [...new Set(allThemes.map(t => t.name))]

  if (templates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No templates yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Seed base templates to create starting-point skills for each dimension.
          </p>
        </div>
        <SeedTemplatesButton />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {templates.length} skill {templates.length === 1 ? 'template' : 'templates'}, {themeNames.length} theme {themeNames.length === 1 ? 'config' : 'configs'}
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
            <span className="text-xs text-slate-400">skill</span>
          </Link>
        ))}

        {themeNames.map((name) => (
          <Link
            key={name}
            href={`/apps/arena/themes/${name}`}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">tailwind/</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</span>
            </div>
            <span className="text-xs text-slate-400">theme</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
