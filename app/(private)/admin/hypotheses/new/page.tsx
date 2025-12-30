import { HypothesisForm } from '@/components/admin/hypothesis-form'

export default function NewHypothesisPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Hypothesis</h1>
          <p className="text-muted-foreground">
            Create a new hypothesis to validate
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <HypothesisForm mode="create" />
        </div>
      </div>
    </div>
  )
}
