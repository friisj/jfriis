import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/studio/arena/queries'
import { ProjectInputsClient } from './inputs-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectInputsPage({ params }: Props) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/apps/arena/projects" className="hover:text-slate-700 dark:hover:text-slate-200">Projects</Link>
          <span>/</span>
          <Link href={`/apps/arena/projects/${project.id}`} className="hover:text-slate-700 dark:hover:text-slate-200">
            {project.name}
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project Inputs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage fonts, Figma links, images, and URLs for {project.name}.
        </p>
      </div>

      <ProjectInputsClient project={project} />
    </div>
  )
}
