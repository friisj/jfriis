export default function AdminDashboard() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Manage your content and distribution
        </p>

        {/* TODO: Add auth protection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/admin/log" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Log</h2>
            <p className="text-sm text-muted-foreground">Manage log entries</p>
          </a>

          <a href="/admin/projects" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Projects</h2>
            <p className="text-sm text-muted-foreground">Manage portfolio projects</p>
          </a>

          <a href="/admin/specimens" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Specimens</h2>
            <p className="text-sm text-muted-foreground">Manage custom components</p>
          </a>

          <a href="/admin/channels" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Channels</h2>
            <p className="text-sm text-muted-foreground">Distribution management</p>
          </a>

          <a href="/admin/backlog" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Backlog</h2>
            <p className="text-sm text-muted-foreground">Inbox for rough ideas</p>
          </a>
        </div>
      </div>
    </div>
  )
}
