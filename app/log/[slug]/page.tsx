export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { MdxRenderer } from '@/components/mdx/mdx-renderer'
import Link from 'next/link'
import type { LogEntry } from '@/lib/types/database'

interface LogEntryPageProps {
  params: Promise<{
    slug: string
  }>
}

interface SpecimenLink {
  specimen_id: string
  position: number
  specimens: {
    id: string
    title: string
    slug: string
    type?: string
    description?: string
  } | null
}

interface ProjectLink {
  project_id: string
  projects: {
    id: string
    title: string
    slug: string
    type?: string
    description?: string
    status?: string
  } | null
}

export default async function LogEntryPage({ params }: LogEntryPageProps) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: entry, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single<LogEntry>()

  if (error || !entry) {
    notFound()
  }

  // Extract markdown content
  const content = entry.content?.markdown || ''

  // Fetch linked specimens
  const { data: specimenLinks } = await supabase
    .from('log_entry_specimens')
    .select(`
      specimen_id,
      position,
      specimens (
        id,
        title,
        slug,
        type,
        description
      )
    `)
    .eq('log_entry_id', entry.id)
    .order('position')
    .returns<SpecimenLink[]>()

  const linkedSpecimens = specimenLinks?.map(link => link.specimens).filter(Boolean) || []

  // Fetch linked projects
  const { data: projectLinks } = await supabase
    .from('log_entry_projects')
    .select(`
      project_id,
      projects (
        id,
        title,
        slug,
        type,
        description,
        status
      )
    `)
    .eq('log_entry_id', entry.id)
    .returns<ProjectLink[]>()

  const linkedProjects = projectLinks?.map(link => link.projects).filter(Boolean) || []

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <Link
            href="/log"
            className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block"
          >
            ← Back to Log
          </Link>

          <time className="block text-sm text-muted-foreground mb-2">
            {new Date(entry.entry_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>

          <h1 className="text-4xl font-bold mb-4">{entry.title}</h1>

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-3">
            {entry.type && (
              <span className={`px-3 py-1 rounded-full text-sm ${
                entry.type === 'experiment' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                entry.type === 'idea' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                entry.type === 'research' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {entry.type}
              </span>
            )}
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {entry.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        {content ? (
          <MdxRenderer content={content} />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>

      {/* Linked Specimens */}
      {linkedSpecimens.length > 0 && (
        <div className="border-t">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <h2 className="text-2xl font-bold mb-6">Related Specimens</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {linkedSpecimens.map((specimen: any) => (
                <Link
                  key={specimen.id}
                  href={`/admin/specimens/${specimen.id}`}
                  className="group border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {specimen.title}
                    </h3>
                    {specimen.type && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        {specimen.type}
                      </span>
                    )}
                  </div>
                  {specimen.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {specimen.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Linked Projects */}
      {linkedProjects.length > 0 && (
        <div className="border-t">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <h2 className="text-2xl font-bold mb-6">Related Projects</h2>
            <div className="grid grid-cols-1 gap-6">
              {linkedProjects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/portfolio/${project.slug}`}
                  className="group border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {project.status && (
                        <span className={`text-xs px-2.5 py-1 rounded-full ${
                          project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          project.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {project.status}
                        </span>
                      )}
                      {project.type && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          {project.type}
                        </span>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <Link
            href="/log"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to Log
          </Link>
        </div>
      </div>
    </div>
  )
}
