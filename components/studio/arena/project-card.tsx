import Link from 'next/link'
import type { ArenaProject } from '@/lib/studio/arena/db-types'

interface ProjectCardProps {
  project: ArenaProject
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/apps/arena/projects/${project.id}`}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow block"
    >
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
        {project.figma_file_key && (
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
            Figma
          </span>
        )}
        <span>
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
