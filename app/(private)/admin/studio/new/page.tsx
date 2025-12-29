import { StudioProjectForm } from '@/components/admin/studio-project-form'

export default function NewStudioProjectPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Studio Project</h1>
          <p className="text-muted-foreground">
            Capture a new idea for your workshop
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <StudioProjectForm mode="create" />
        </div>
      </div>
    </div>
  )
}
