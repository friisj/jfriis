import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getSkills, getProjectAssembly, getSessions } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'
import { SessionCard } from '@/components/studio/arena/session-card'
import { CORE_DIMENSIONS } from '@/lib/studio/arena/types'
import type { ArenaProjectAssemblyWithSkill } from '@/lib/studio/arena/db-types'
import { FoundationSection } from './foundation-section'

interface Props {
  params: Promise<{ id: string }>
}

const DIMENSION_LABELS: Record<string, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
  elevation: 'Elevation',
  radius: 'Radius',
  density: 'Density',
  motion: 'Motion',
  iconography: 'Iconography',
  voice: 'Voice & Tone',
  presentation: 'Presentation',
}

const DIMENSION_COLORS: Record<string, string> = {
  color: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
  typography: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  spacing: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  elevation: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800',
  radius: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
  density: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800',
  motion: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  iconography: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800',
  voice: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800',
  presentation: 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800',
}

const DEFAULT_DIM_COLOR = 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800'

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const [project, skills, assembly, sessions] = await Promise.all([
    getProject(id),
    getSkills({ project_id: id }),
    getProjectAssembly(id),
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

  // Separate dimension skills from legacy monolithic skills
  const dimensionSkills = skills.filter((s) => s.dimension !== null)
  const legacySkills = skills.filter((s) => s.dimension === null)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/apps/arena" className="hover:text-slate-700 dark:hover:text-slate-200">
              Projects
            </Link>
            <span>/</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
            {project.substrate && (
              <span className="px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {project.substrate}
              </span>
            )}
          </div>
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
        <div className={`grid grid-cols-1 ${projectDimensions.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-3`}>
          {projectDimensions.map((dim) => {
            const entry = assemblyByDimension[dim]
            const skill = entry?.skill
            return (
              <div
                key={dim}
                className={`rounded-lg border p-4 ${DIMENSION_COLORS[dim] ?? DEFAULT_DIM_COLOR}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {DIMENSION_LABELS[dim] ?? dim.charAt(0).toUpperCase() + dim.slice(1)}
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
                      {skill.tier} &middot; {typeof skill.state === 'object' && 'decisions' in skill.state
                        ? `${(skill.state as { decisions: unknown[] }).decisions.length} decisions`
                        : 'composite'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No skill assigned
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

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

      {/* Foundation */}
      <FoundationSection project={project} />

      {/* Fonts & Inputs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fonts &amp; Inputs</h2>
          <Link
            href={`/apps/arena/projects/${project.id}/inputs`}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Edit
          </Link>
        </div>
        {project.inputs?.fonts && project.inputs.fonts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {project.inputs.fonts.map((f) => (
              <div key={f.role} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{f.role}</span>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.family}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
            No fonts configured.{' '}
            <Link href={`/apps/arena/projects/${project.id}/inputs`} className="text-purple-600 hover:text-purple-700 not-italic">
              Set fonts
            </Link>
          </p>
        )}
        {project.inputs && (project.inputs.icon_library || project.inputs.figma_links?.length > 0 || project.inputs.images?.length > 0 || project.inputs.urls?.length > 0) && (
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
            {project.inputs.icon_library && (
              <span>Icons: {project.inputs.icon_library === 'lucide' ? 'Lucide' : 'Phosphor'}</span>
            )}
            {project.inputs.figma_links?.length > 0 && (
              <span>{project.inputs.figma_links.length} Figma link{project.inputs.figma_links.length !== 1 ? 's' : ''}</span>
            )}
            {project.inputs.images?.length > 0 && (
              <span>{project.inputs.images.length} image{project.inputs.images.length !== 1 ? 's' : ''}</span>
            )}
            {project.inputs.urls?.length > 0 && (
              <span>{project.inputs.urls.length} reference URL{project.inputs.urls.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

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
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm space-y-2">
          <p className="text-slate-500 dark:text-slate-400">No skills yet.</p>
          <div className="flex items-center justify-center gap-3 text-sm">
            <Link
              href={`/apps/arena/projects/${project.id}/import`}
              className="text-purple-600 hover:text-purple-700"
            >
              Import from Figma
            </Link>
            <span className="text-slate-300 dark:text-slate-600">or</span>
            <Link
              href="/apps/arena/templates"
              className="text-purple-600 hover:text-purple-700"
            >
              Clone from templates
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
