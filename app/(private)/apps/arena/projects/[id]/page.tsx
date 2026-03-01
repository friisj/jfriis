import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getSkills, getProjectAssembly } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'
import { SKILL_DIMENSIONS } from '@/lib/studio/arena/types'
import type { ArenaProjectAssemblyWithSkill } from '@/lib/studio/arena/db-types'

interface Props {
  params: Promise<{ id: string }>
}

const DIMENSION_LABELS: Record<string, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
}

const DIMENSION_COLORS: Record<string, string> = {
  color: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
  typography: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  spacing: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const [project, skills, assembly] = await Promise.all([
    getProject(id),
    getSkills({ project_id: id }),
    getProjectAssembly(id),
  ])

  if (!project) notFound()

  const assemblyByDimension: Record<string, ArenaProjectAssemblyWithSkill | undefined> = {}
  for (const entry of assembly) {
    assemblyByDimension[entry.dimension] = entry
  }

  // Separate dimension skills from legacy monolithic skills
  const dimensionSkills = skills.filter((s) => s.dimension !== null)
  const legacySkills = skills.filter((s) => s.dimension === null)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/apps/arena/projects" className="hover:text-slate-700 dark:hover:text-slate-200">
              Projects
            </Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/apps/arena/projects/${project.id}/inputs`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Edit Inputs
          </Link>
          <Link
            href={`/apps/arena/projects/${project.id}/import`}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Import from Figma
          </Link>
        </div>
      </div>

      {/* Assembly panel */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Skill Assembly</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          One active skill per dimension composes the project&apos;s design system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SKILL_DIMENSIONS.map((dim) => {
            const entry = assemblyByDimension[dim]
            const skill = entry?.skill
            return (
              <div
                key={dim}
                className={`rounded-lg border p-4 ${DIMENSION_COLORS[dim]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {DIMENSION_LABELS[dim]}
                  </span>
                  {skill && (
                    <Link
                      href={`/apps/arena/sessions/new?project=${project.id}&dimension=${dim}&skill=${skill.id}`}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Refine
                    </Link>
                  )}
                </div>
                {skill ? (
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {skill.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {skill.source} &middot; {typeof skill.state === 'object' && 'decisions' in skill.state
                        ? `${(skill.state as { decisions: unknown[] }).decisions.length} decisions`
                        : 'composite'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No skill assigned. Import from Figma to populate.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Project inputs summary */}
      {project.inputs && (project.inputs.figma_links?.length > 0 || project.inputs.fonts?.length > 0 || project.inputs.images?.length > 0 || project.inputs.urls?.length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Inputs</h2>
            <Link
              href={`/apps/arena/projects/${project.id}/inputs`}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              Edit
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            {project.inputs.fonts?.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Fonts:</span>{' '}
                {project.inputs.fonts.map(f => `${f.role}: ${f.family}`).join(', ')}
              </div>
            )}
            {project.inputs.figma_links?.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Figma links:</span>{' '}
                {project.inputs.figma_links.length}
              </div>
            )}
            {project.inputs.images?.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Images:</span>{' '}
                {project.inputs.images.length}
              </div>
            )}
            {project.inputs.urls?.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">URLs:</span>{' '}
                {project.inputs.urls.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project info */}
      {(project.figma_file_url || project.figma_file_key) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Figma</h2>
          <div className="space-y-1 text-sm">
            {project.figma_file_url && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">URL:</span>
                <a
                  href={project.figma_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 truncate"
                >
                  {project.figma_file_url}
                </a>
              </div>
            )}
            {project.figma_file_key && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Key:</span>
                <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{project.figma_file_key}</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dimension skills */}
      {dimensionSkills.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Dimension Skills ({dimensionSkills.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dimensionSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* Legacy monolithic skills */}
      {legacySkills.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Legacy Skills ({legacySkills.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {legacySkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-slate-500 dark:text-slate-400">No skills imported yet.</p>
          <Link
            href={`/apps/arena/projects/${project.id}/import`}
            className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
          >
            Import from Figma
          </Link>
        </div>
      )}
    </div>
  )
}
