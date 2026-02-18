export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export default async function AppsPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select('id, slug, name, description, status, temperature')
    .in('status', ['active', 'paused', 'completed'])
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching apps:', error)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <Link
            href="/admin"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6 inline-block"
          >
            &larr; Back
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">Apps</h1>
          <p className="text-zinc-400 mt-2">Studio prototypes and tools</p>
        </header>

        {projects && projects.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/apps/${project.slug}`}
                className="group block p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900 transition-all"
              >
                <h2 className="text-lg font-semibold group-hover:text-zinc-100 transition-colors">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No apps available</p>
        )}
      </div>
    </div>
  )
}
