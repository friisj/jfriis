import { notFound } from 'next/navigation'
import { getStyleGuide } from '@/lib/studio/verbivore/queries'
import { StyleGuideForm } from '@/components/studio/verbivore/style-guide-form'

export default async function EditStyleGuidePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const styleGuide = await getStyleGuide(id)

  if (!styleGuide) notFound()

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Edit Style Guide: {styleGuide.name}
      </h1>
      <StyleGuideForm
        mode="edit"
        initialData={{
          id: styleGuide.id,
          name: styleGuide.name,
          slug: styleGuide.slug,
          description: styleGuide.description || '',
          prompt: styleGuide.prompt,
          is_default: styleGuide.is_default,
          is_active: styleGuide.is_active,
        }}
      />
    </div>
  )
}
