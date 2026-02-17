import { notFound } from 'next/navigation'
import { getEntry, getCategories, getTerms, getStyleGuides } from '@/lib/studio/verbivore/queries'
import { EntryForm } from '@/components/studio/verbivore/entry-form'

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [entry, categories, terms, styleGuides] = await Promise.all([
    getEntry(id),
    getCategories(),
    getTerms(),
    getStyleGuides(),
  ])

  if (!entry) notFound()

  const selectedTerms = (entry.terms ?? []).map(
    (et: { term_id: string }) => et.term_id
  )

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Edit Entry: {entry.title}
      </h1>
      <EntryForm
        categories={categories}
        terms={terms.map((t) => ({ id: t.id, term: t.term, definition: t.definition, slug: t.slug }))}
        styleGuides={styleGuides}
        mode="edit"
        initialData={{
          id: entry.id,
          title: entry.title,
          slug: entry.slug,
          excerpt: entry.excerpt || '',
          content: entry.content || '',
          status: entry.status,
          featured: entry.featured,
          category_id: entry.category_id || '',
          seo_title: entry.seo_title || '',
          seo_description: entry.seo_description || '',
          selectedTerms,
        }}
      />
    </div>
  )
}
