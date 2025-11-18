export default async function LogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Log Entry {id}</h1>
        {/* TODO: Fetch log entry from Supabase */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Log entry content, related projects, specimens, and metadata
          </p>
        </div>
      </div>
    </div>
  )
}
