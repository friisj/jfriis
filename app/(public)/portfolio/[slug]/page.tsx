export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { MdxRenderer } from '@/components/mdx/mdx-renderer'
import Link from 'next/link'
import type { Venture } from '@/lib/types/database'

interface VenturePageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function VenturePage({ params }: VenturePageProps) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: venture, error } = await supabase
    .from('ventures')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single<Venture>()

  if (error || !venture) {
    notFound()
  }

  // Extract markdown content
  const content = venture.content?.markdown || ''

  // Fetch linked specimens via entity_links
  const { data: specimenLinks } = await supabase
    .from('entity_links')
    .select('target_id, position')
    .eq('source_type', 'project')
    .eq('source_id', venture.id)
    .eq('target_type', 'specimen')
    .order('position')

  // Fetch specimen details
  const specimenIds = specimenLinks?.map(l => l.target_id) || []
  let linkedSpecimens: Array<{
    id: string
    title: string
    slug: string
    type?: string
    description?: string
  }> = []

  if (specimenIds.length > 0) {
    const { data: specimens } = await supabase
      .from('specimens')
      .select('id, title, slug, type, description')
      .in('id', specimenIds)
    linkedSpecimens = (specimens || []) as any
  }

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

          <h1 className="text-4xl font-bold mb-4">{venture.title}</h1>

          {venture.description && (
            <p className="text-lg text-muted-foreground mb-6">
              {venture.description}
            </p>
          )}

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {venture.status && (
              <span className={`px-3 py-1 rounded-full ${
                venture.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                venture.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                venture.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {venture.status}
              </span>
            )}

            {venture.type && (
              <span className="text-muted-foreground capitalize">
                {venture.type}
              </span>
            )}

            {venture.start_date && (
              <span className="text-muted-foreground">
                {new Date(venture.start_date).getFullYear()}
                {venture.end_date && ` - ${new Date(venture.end_date).getFullYear()}`}
              </span>
            )}
          </div>

          {/* Tags */}
          {venture.tags && venture.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {venture.tags.map((tag, idx) => (
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

      {/* Linked Specimens */}
      {linkedSpecimens.length > 0 && (
        <div className="border-t">
          <div className="max-w-4xl mx-auto px-8 py-12">
            <h2 className="text-2xl font-bold mb-6">Featured Specimens</h2>
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


