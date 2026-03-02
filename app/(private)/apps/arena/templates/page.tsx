import { getSkills } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'

export default async function TemplatesPage() {
  const templates = await getSkills({ tier: 'template' })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Base skill templates for seeding new projects
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-slate-500 dark:text-slate-400">No templates found.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Seed base templates to get started with common design skill patterns.
          </p>
          <SeedTemplatesButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}
