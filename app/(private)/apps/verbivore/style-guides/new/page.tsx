import { StyleGuideForm } from '@/components/studio/verbivore/style-guide-form'

export default function NewStyleGuidePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        New Style Guide
      </h1>
      <StyleGuideForm mode="create" />
    </div>
  )
}
