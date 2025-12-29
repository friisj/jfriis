import { ValuePropositionCanvasForm } from '@/components/admin/value-proposition-canvas-form'

export default function NewValuePropositionCanvasPage() {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Value Proposition Canvas</h1>
          <p className="text-muted-foreground">
            Analyze product-market fit between a Value Map and Customer Profile
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ValuePropositionCanvasForm />
        </div>
      </div>
    </div>
  )
}
