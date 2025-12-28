import { ProjectForm } from '@/components/admin/project-form'

export default function NewProjectPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Project</h1>
          <p className="text-muted-foreground">
            Add a new portfolio project or business
          </p>
        </div>

        <ProjectForm />
      </div>
    </div>
  )
}
