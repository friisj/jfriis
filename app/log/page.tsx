export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { extractMarkdown } from '@/lib/utils'
import type { LogEntry } from '@/lib/types/database'

export default async function LogPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('log_entries')
    .select('id, title, slug, content, entry_date, type, tags, published_at')
    .eq('published', true)
    .order('entry_date', { ascending: false })
    .returns<LogEntry[]>()

  // Group entries by year
  const entriesByYear = entries?.reduce((acc, entry) => {
    const year = new Date(entry.entry_date).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(entry)
    return acc
  }, {} as Record<number, typeof entries>) || {}

  const years = Object.keys(entriesByYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Log</h1>
        <p className="text-muted-foreground mb-8">
          Chronological record of experiments, learnings, and ideas
        </p>

        {!entries || entries.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No published log entries yet</p>
          </div>
        ) : (
          <div className="space-y-12">
            {years.map((year) => (
              <div key={year}>
                <h2 className="text-2xl font-bold mb-6 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  {year}
                </h2>

                <div className="space-y-6">
                  {entriesByYear[Number(year)].map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/log/${entry.slug}`}
                      className="block group"
                    >
                      <article className="border-l-2 border-muted hover:border-primary pl-6 transition-colors">
                        <time className="text-sm text-muted-foreground">
                          {new Date(entry.entry_date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>

                        <h3 className="text-xl font-semibold mt-1 group-hover:text-primary transition-colors">
                          {entry.title}
                        </h3>

                        {entry.type && (
                          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                            entry.type === 'experiment' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            entry.type === 'idea' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            entry.type === 'research' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {entry.type}
                          </span>
                        )}

                        {extractMarkdown(entry.content) && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {extractMarkdown(entry.content).substring(0, 150)}...
                          </p>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {entry.tags.slice(0, 5).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
