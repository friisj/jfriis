export default function AdminBacklogPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Backlog</h1>
        <p className="text-muted-foreground mb-8">
          Inbox for rough ideas, sketches, and dynamic inputs
        </p>

        {/* TODO: Backlog management interface */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Content inbox - manage rough ideas that can be shaped into gallery specimens or log entries
          </p>
        </div>
      </div>
    </div>
  )
}
