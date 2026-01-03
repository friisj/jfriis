export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface Specimen {
  id: string
  title: string
  slug: string
  description: string | null
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const typeColors = {
  'ui-component': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'interactive': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  'visual': 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  'animation': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

export default async function AdminSpecimensPage() {
  const supabase = await createClient()

  const { data: specimens, error } = await supabase
    .from('specimens')
    .select(`
      id,
      title,
      slug,
      description,
      type,
      published,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  // Fetch link counts for each specimen from entity_links
  const specimenIds = specimens?.map(s => s.id) || []
  let linkCounts: Record<string, { projects: number; logEntries: number }> = {}

  if (specimenIds.length > 0) {
    const { data: projectLinks } = await supabase
      .from('entity_links')
      .select('target_id')
      .eq('source_type', 'project')
      .eq('target_type', 'specimen')
      .in('target_id', specimenIds)

    const { data: logEntryLinks } = await supabase
      .from('entity_links')
      .select('target_id')
      .eq('source_type', 'log_entry')
      .eq('target_type', 'specimen')
      .in('target_id', specimenIds)

    // Count links per specimen
    for (const id of specimenIds) {
      linkCounts[id] = {
        projects: projectLinks?.filter(l => l.target_id === id).length || 0,
        logEntries: logEntryLinks?.filter(l => l.target_id === id).length || 0,
      }
    }
  }

  if (error) {
    console.error('Error fetching specimens:', error)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Specimens</h1>
            <p className="text-muted-foreground">
              Reusable components with code, styling, and media
            </p>
          </div>
          <Link
            href="/admin/specimens/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Specimen
          </Link>
        </div>

        {specimens && specimens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specimens.map((specimen: Specimen) => (
              <Link
                key={specimen.id}
                href={`/admin/specimens/${specimen.id}/edit`}
                className="group"
              >
                <div className="rounded-lg border bg-card hover:border-primary transition-all overflow-hidden h-full flex flex-col">
                  {/* Placeholder preview area */}
                  <div className="aspect-video bg-muted/50 flex items-center justify-center border-b">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {specimen.title}
                      </h3>
                      {specimen.published && (
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {specimen.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                        {specimen.description}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {specimen.type && (
                            <span className={`px-2 py-0.5 rounded font-medium ${typeColors[specimen.type as keyof typeof typeColors] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'}`}>
                              {specimen.type}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatDate(specimen.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{linkCounts[specimen.id]?.projects || 0} projects</span>
                        <span>•</span>
                        <span>{linkCounts[specimen.id]?.logEntries || 0} log entries</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No specimens yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create reusable components with custom code, styling, and assets
              </p>
              <Link
                href="/admin/specimens/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Specimen
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
