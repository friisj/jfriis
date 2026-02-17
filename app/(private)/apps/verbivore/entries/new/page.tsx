import { getCategories, getTerms, getStyleGuides } from '@/lib/studio/verbivore/queries'
import { EntryForm } from '@/components/studio/verbivore/entry-form'

export default async function NewEntryPage() {
  const [categories, terms, styleGuides] = await Promise.all([
    getCategories(),
    getTerms(),
    getStyleGuides(),
  ])

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        New Entry
      </h1>
      <EntryForm
        categories={categories}
        terms={terms.map((t) => ({ id: t.id, term: t.term, definition: t.definition, slug: t.slug }))}
        styleGuides={styleGuides}
        mode="create"
      />
    </div>
  )
}
