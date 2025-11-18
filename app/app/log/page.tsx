export default function LogPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Log</h1>
        <p className="text-muted-foreground mb-8">
          Chronological record of projects, experiments, and ideas
        </p>
        {/* TODO: Fetch and display log entries from Supabase */}
      </div>
    </div>
  )
}
