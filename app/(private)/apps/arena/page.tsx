import Link from 'next/link'
import { getProjects } from '@/lib/studio/arena/queries'
import { ProjectCard } from '@/components/studio/arena/project-card'

export default async function ArenaProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Source design systems and Figma files
          </p>
        </div>
        <Link
          href="/apps/arena/projects/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">No projects yet.</p>
          <Link
            href="/apps/arena/projects/new"
            className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
