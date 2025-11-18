export default function AdminLogPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Manage Log</h1>
        <p className="text-muted-foreground mb-8">
          Create, edit, and manage log entries
        </p>

        {/* TODO: CRUD interface for log entries */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Log management interface - create, edit, delete entries
          </p>
        </div>
      </div>
    </div>
  )
}
