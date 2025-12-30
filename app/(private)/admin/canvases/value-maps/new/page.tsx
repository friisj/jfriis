import { ValueMapForm } from '@/components/admin/value-map-form'

export default function NewValueMapPage() {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Value Map</h1>
          <p className="text-muted-foreground">
            Define what you offer: products/services, pain relievers, and gain creators
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ValueMapForm />
        </div>
      </div>
    </div>
  )
}
