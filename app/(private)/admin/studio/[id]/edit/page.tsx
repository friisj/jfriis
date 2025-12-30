export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { StudioProjectForm } from '@/components/admin/studio-project-form'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditStudioProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Also fetch hypotheses and experiments for display
  const { data: hypotheses } = await supabase
    .from('studio_hypotheses')
    .select('*')
    .eq('project_id', id)
    .order('sequence')

  const { data: experiments } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {project.name}</h1>
          <p className="text-muted-foreground">
            Update project details and PRD
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card p-6">
              <StudioProjectForm project={project} mode="edit" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hypotheses */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Hypotheses</h3>
                <Link
                  href={`/admin/hypotheses/new?project=${id}`}
                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  + Add
                </Link>
              </div>
              {hypotheses && hypotheses.length > 0 ? (
                <>
                  <ul className="space-y-2 text-sm">
                    {hypotheses.slice(0, 5).map((h) => (
                      <li key={h.id}>
                        <Link
                          href={`/admin/hypotheses/${h.id}/edit`}
                          className="flex items-start gap-2 group"
                        >
                          <span className={`mt-0.5 ${
                            h.status === 'validated' ? 'text-green-500' :
                            h.status === 'invalidated' ? 'text-red-500' :
                            h.status === 'testing' ? 'text-blue-500' :
                            'text-gray-400'
                          }`}>
                            {h.status === 'validated' ? '✓' :
                             h.status === 'invalidated' ? '✗' :
                             h.status === 'testing' ? '◐' : '○'}
                          </span>
                          <span className="line-clamp-2 group-hover:text-primary transition-colors">
                            H{h.sequence}: {h.statement}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {hypotheses.length > 5 && (
                    <Link
                      href={`/admin/hypotheses?project=${id}`}
                      className="block mt-3 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      View all {hypotheses.length} hypotheses →
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hypotheses yet.
                </p>
              )}
            </div>

            {/* Experiments */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Experiments</h3>
                <Link
                  href={`/admin/experiments/new?project=${id}`}
                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  + Add
                </Link>
              </div>
              {experiments && experiments.length > 0 ? (
                <>
                  <ul className="space-y-2 text-sm">
                    {experiments.slice(0, 5).map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/admin/experiments/${e.id}/edit`}
                          className="flex items-center justify-between group"
                        >
                          <span className="truncate group-hover:text-primary transition-colors">
                            {e.name}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            e.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                            e.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                            e.status === 'abandoned' ? 'bg-red-500/10 text-red-600' :
                            'bg-gray-500/10 text-gray-600'
                          }`}>
                            {e.status.replace('_', ' ')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {experiments.length > 5 && (
                    <Link
                      href={`/admin/experiments?project=${id}`}
                      className="block mt-3 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      View all {experiments.length} experiments →
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No experiments yet.
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <div className="space-y-2 text-sm">
                {project.scaffolded_at && (
                  <Link
                    href={`/studio/${project.slug}`}
                    className="block text-blue-600 hover:underline"
                  >
                    View Project Page →
                  </Link>
                )}
                {project.path && (
                  <p className="text-muted-foreground">
                    Path: <code className="bg-muted px-1 rounded">{project.path}</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
