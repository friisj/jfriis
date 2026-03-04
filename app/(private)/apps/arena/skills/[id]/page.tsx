import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSkillWithLineage, getThemesForSkill, getProjectThemes } from '@/lib/studio/arena/queries'
import { SkillDetailClient } from './skill-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SkillDetailPage({ params }: Props) {
  const { id } = await params
  const skill = await getSkillWithLineage(id)
  if (!skill) notFound()

  // Load associated themes: skill-linked (templates) or project-scoped
  const themes = skill.is_template
    ? await getThemesForSkill(id)
    : skill.project_id
      ? await (async () => {
          const pt = await getProjectThemes(skill.project_id!)
          return Object.entries(pt).map(([dim, { tokens, source }]) => ({
            id: '', project_id: skill.project_id, skill_id: null, is_template: false,
            dimension: dim, platform: 'tailwind', name: 'default', tokens, source,
            created_at: '', updated_at: '',
          }))
        })()
      : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            {skill.tier === 'template' ? (
              <Link href="/apps/arena/skills" className="hover:text-slate-700 dark:hover:text-slate-200">
                Skills
              </Link>
            ) : skill.project ? (
              <Link href={`/apps/arena/projects/${skill.project.id}`} className="hover:text-slate-700 dark:hover:text-slate-200">
                {skill.project.name}
              </Link>
            ) : (
              <Link href="/apps/arena" className="hover:text-slate-700 dark:hover:text-slate-200">
                Skills
              </Link>
            )}
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{skill.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs">
              {skill.tier}
            </span>
            <span>Created {new Date(skill.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/apps/arena/skills/${skill.id}/compare`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Compare
          </Link>
          <Link
            href={`/apps/arena/sessions/new?skill=${skill.id}`}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Start Gym Session
          </Link>
        </div>
      </div>

      {/* Lineage */}
      {(skill.parent_skill || (skill.children && skill.children.length > 0)) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Lineage</h2>
          <div className="space-y-2 text-sm">
            {skill.parent_skill && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Parent:</span>
                <Link
                  href={`/apps/arena/skills/${skill.parent_skill.id}`}
                  className="text-purple-600 hover:text-purple-700"
                >
                  {skill.parent_skill.name}
                </Link>
              </div>
            )}
            {skill.children && skill.children.length > 0 && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Derived skills:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {skill.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/apps/arena/skills/${child.id}`}
                      className="text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded text-xs"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project link */}
      {skill.project && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Project</h2>
          <Link
            href={`/apps/arena/projects/${skill.project.id}`}
            className="text-purple-600 hover:text-purple-700 text-sm"
          >
            {skill.project.name}
          </Link>
        </div>
      )}

      {/* Skill state + canonical previews */}
      <SkillDetailClient skill={skill} themes={themes} />
    </div>
  )
}
