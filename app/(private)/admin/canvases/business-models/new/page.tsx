import { BusinessModelCanvasForm } from '@/components/admin/business-model-canvas-form'

export default function NewBusinessModelCanvasPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Business Model Canvas</h1>
          <p className="text-muted-foreground">
            Map out your business model using the 9-block canvas
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <BusinessModelCanvasForm />
        </div>
      </div>
    </div>
  )
}
