import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { MdxRenderer } from '@/components/mdx/mdx-renderer'
import Link from 'next/link'

interface ProjectPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error || !project) {
    notFound()
  }

  // Extract markdown content
  const content = project.content?.markdown || ''

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Link
            href="/portfolio"
            className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block"
          >
            ← Back to Portfolio
          </Link>

          <h1 className="text-4xl font-bold mb-4">{project.title}</h1>

          {project.description && (
            <p className="text-lg text-muted-foreground mb-6">
              {project.description}
            </p>
          )}

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {project.status && (
              <span className={`px-3 py-1 rounded-full ${
                project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                project.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {project.status}
              </span>
            )}

            {project.type && (
              <span className="text-muted-foreground capitalize">
                {project.type}
              </span>
            )}

            {project.start_date && (
              <span className="text-muted-foreground">
                {new Date(project.start_date).getFullYear()}
                {project.end_date && ` - ${new Date(project.end_date).getFullYear()}`}
              </span>
            )}
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {project.tags.map((tag, idx) => (
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
      <div className="max-w-4xl mx-auto px-8 py-12">
        {content ? (
          <MdxRenderer content={content} />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <Link
            href="/portfolio"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}
