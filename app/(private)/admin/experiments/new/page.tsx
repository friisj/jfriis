import { ExperimentForm } from '@/components/admin/experiment-form'

export default function NewExperimentPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Experiment</h1>
          <p className="text-muted-foreground">
            Create a new experiment, spike, or prototype
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ExperimentForm mode="create" />
        </div>
      </div>
    </div>
  )
}
