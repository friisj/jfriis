export const dynamic = 'force-dynamic'

export default function AdminChannelsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Distribution Channels</h1>
        <p className="text-muted-foreground mb-8">
          Manage distribution to HackerNews, social platforms, and other channels
        </p>

        {/* TODO: Channel management interface */}
        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Distribution interface - agents for posting to HN, social platforms, analytics
          </p>
        </div>
      </div>
    </div>
  )
}
