export default function AdminProjectsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Manage Projects</h1>
        <p className="text-muted-foreground mb-8">
          Create, edit, and manage portfolio projects and businesses
        </p>

        {/* TODO: CRUD interface for projects */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Project management interface - create, edit, delete projects with metadata and relationships
          </p>
        </div>
      </div>
    </div>
  )
}
