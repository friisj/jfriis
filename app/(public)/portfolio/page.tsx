export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Venture } from '@/lib/types/database'

export default async function PortfolioPage() {
  const supabase = await createClient()

  const { data: ventures } = await supabase
    .from('projects')
    .select('id, title, slug, description, type, status, start_date, end_date, tags, published_at')
    .eq('published', true)
    .order('start_date', { ascending: false, nullsFirst: false })
    .returns<Venture[]>()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Portfolio</h1>
        <p className="text-muted-foreground mb-8">
          Ventures, businesses, and experiments
        </p>

        {!ventures || ventures.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No published ventures yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ventures.map((venture) => (
              <Link
                key={venture.id}
                href={`/portfolio/${venture.slug}`}
                className="group"
              >
                <div className="rounded-lg border bg-card hover:border-primary transition-all duration-200 overflow-hidden h-full flex flex-col">
                  {/* Venture header */}
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {venture.title}
                      </h3>
                      {venture.status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          venture.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          venture.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {venture.status}
                        </span>
                      )}
                    </div>

                    {venture.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {venture.description}
                      </p>
                    )}

                    {venture.tags && venture.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {venture.tags.slice(0, 4).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {venture.tags.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{venture.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Venture footer */}
                  <div className="px-6 py-3 bg-muted/50 border-t text-xs text-muted-foreground flex items-center justify-between">
                    <div>
                      {venture.type && (
                        <span className="capitalize">{venture.type}</span>
                      )}
                    </div>
                    <div>
                      {venture.start_date && (
                        <span>
                          {new Date(venture.start_date).getFullYear()}
                          {venture.end_date && ` - ${new Date(venture.end_date).getFullYear()}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


