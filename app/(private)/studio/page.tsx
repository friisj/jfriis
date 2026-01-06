export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return 'text-gray-400'
    case 'active': return 'text-blue-500'
    case 'paused': return 'text-yellow-500'
    case 'completed': return 'text-green-500'
    case 'archived': return 'text-gray-300'
    default: return 'text-gray-500'
  }
}

function getTemperatureEmoji(temperature?: string) {
  switch (temperature) {
    case 'hot': return '🔥'
    case 'warm': return '🌡️'
    case 'cold': return '❄️'
    default: return null
  }
}

export default async function StudioPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select(`
      id,
      slug,
      name,
      description,
      status,
      temperature,
      current_focus,
      scaffolded_at,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching studio projects:', error)
    return (
      <div className="min-h-screen bg-white text-black p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-600">Error loading studio projects</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Studio Projects</h1>
          <p className="text-xl text-gray-600">
            Workshop projects with hypothesis-driven roadmaps
          </p>
        </header>

        {/* All Projects */}
        {projects && projects.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Projects
            </h2>
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/studio/${project.slug}`}
                  className="block p-6 border-2 border-black hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold">{project.name}</h3>
                        {project.temperature && (
                          <span className="text-lg">
                            {getTemperatureEmoji(project.temperature)}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-gray-600">{project.description}</p>
                      )}
                    </div>
                    <span className={`text-sm font-medium uppercase ml-4 ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.current_focus && (
                    <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500">
                      <p className="text-sm">
                        <span className="font-bold text-blue-700 uppercase text-xs">Current Focus:</span>{' '}
                        {project.current_focus}
                      </p>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-400">
                    Last updated: {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!projects || projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No studio projects yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Create your first project in the admin panel
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t-2 border-gray-300 text-sm text-gray-500">
          <p>
            <span className="font-medium">Path:</span>{' '}
            <code className="bg-gray-100 px-1">app/(private)/studio/page.tsx</code>
          </p>
        </footer>
      </div>
    </div>
  )
}
