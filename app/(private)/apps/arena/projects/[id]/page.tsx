import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getSkills, getProjectAssembly, getProjectThemes, getTemplateThemes, getSkill, getSessions } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'
import { SessionCard } from '@/components/studio/arena/session-card'
import { CORE_DIMENSIONS } from '@/lib/studio/arena/types'
import type { ArenaProjectAssemblyWithSkill, ArenaSkill } from '@/lib/studio/arena/db-types'
import { FoundationSection } from './foundation-section'
import { InputsSection } from './inputs-section'
import { AssemblySection } from './assembly-section'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const [project, skills, assembly, projectThemes, templateThemeRows, sessions] = await Promise.all([
    getProject(id),
    getSkills({ project_id: id }),
    getProjectAssembly(id),
    getProjectThemes(id),
    getTemplateThemes('default'),
    getSessions({ project_id: id }),
  ])

  if (!project) notFound()

  // Determine active dimensions from project config, falling back to core
  const projectDimensions = project.config?.dimensions
    ? Object.keys(project.config.dimensions)
    : CORE_DIMENSIONS

  const assemblyByDimension: Record<string, ArenaProjectAssemblyWithSkill | undefined> = {}
  for (const entry of assembly) {
    assemblyByDimension[entry.dimension] = entry
  }

  // Fetch parent skills for diff support
  const uniqueParentIds = [...new Set(
    assembly
      .map((e) => e.skill?.parent_skill_id)
      .filter((id): id is string => !!id)
  )]
  const parentSkills = await Promise.all(uniqueParentIds.map(getSkill))
  const parentSkillMap: Record<string, ArenaSkill> = {}
  for (const ps of parentSkills) {
    if (ps) parentSkillMap[ps.id] = ps
  }

  // Build template themes map for comparison
  const templateThemes: Record<string, { tokens: Record<string, string>; source: string }> = {}
  for (const row of templateThemeRows) {
    templateThemes[row.dimension] = { tokens: row.tokens, source: row.source }
  }

  // Separate dimension skills from legacy monolithic skills
  const dimensionSkills = skills.filter((s) => s.dimension !== null)
  const legacySkills = skills.filter((s) => s.dimension === null)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/apps/arena" className="hover:text-slate-700 dark:hover:text-slate-200">
              Projects
            </Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
        <Link
          href={`/apps/arena/sessions/new?project=${project.id}`}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          New Session
        </Link>
      </div>

      {/* Inputs */}
      <InputsSection project={project} />

      {/* Skill Assembly */}
      <AssemblySection
        projectId={project.id}
        dimensions={projectDimensions}
        assemblyByDimension={assemblyByDimension}
        parentSkillMap={parentSkillMap}
        projectThemes={projectThemes}
        templateThemes={templateThemes}
      />

      {/* Foundation */}
      <FoundationSection project={project} />

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Sessions{sessions.length > 0 ? ` (${sessions.length})` : ''}
          </h2>
          <Link
            href={`/apps/arena/sessions/new?project=${project.id}`}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            New Session
          </Link>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">No sessions yet.</p>
            <Link
              href={`/apps/arena/sessions/new?project=${project.id}`}
              className="text-purple-600 hover:text-purple-700 text-sm mt-1 inline-block"
            >
              Start a refinement session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Project info (Figma file) */}
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
    </div>
  )
}
