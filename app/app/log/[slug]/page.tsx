import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { MdxRenderer } from '@/components/mdx/mdx-renderer'
import Link from 'next/link'

interface LogEntryPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function LogEntryPage({ params }: LogEntryPageProps) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: entry, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error || !entry) {
    notFound()
  }

  // Extract markdown content
  const content = entry.content?.markdown || ''

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
