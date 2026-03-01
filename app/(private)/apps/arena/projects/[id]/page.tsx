import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject, getSkills } from '@/lib/studio/arena/queries'
import { SkillCard } from '@/components/studio/arena/skill-card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const [project, skills] = await Promise.all([
    getProject(id),
    getSkills({ project_id: id }),
  ])

  if (!project) notFound()

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
        <Link
          href={`/apps/arena/projects/${project.id}/import`}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Import from Figma
        </Link>
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

      {/* Linked skills */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Skills ({skills.length})
        </h2>
        {skills.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <p className="text-slate-500 dark:text-slate-400">No skills imported yet.</p>
            <Link
              href={`/apps/arena/projects/${project.id}/import`}
              className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
            >
              Import from Figma
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
