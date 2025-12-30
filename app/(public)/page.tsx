export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-6xl font-bold mb-6">Jon Friis</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Designer, Developer, Entrepreneur
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/profile" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Profile</h2>
            <p className="text-sm text-muted-foreground">About me</p>
          </a>

          <a href="/portfolio" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Portfolio</h2>
            <p className="text-sm text-muted-foreground">Projects and businesses</p>
          </a>

          <a href="/gallery" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Gallery</h2>
            <p className="text-sm text-muted-foreground">Visual specimens</p>
          </a>

          <a href="/log" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Log</h2>
            <p className="text-sm text-muted-foreground">Chronological record</p>
          </a>

          <a href="/explore" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Explore</h2>
            <p className="text-sm text-muted-foreground">Search with AI</p>
          </a>

          <a href="/admin" className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Admin</h2>
            <p className="text-sm text-muted-foreground">Dashboard</p>
          </a>
        </div>
      </div>
    </div>
  )
}


