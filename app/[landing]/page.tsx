import { notFound } from 'next/navigation'

// Reserved routes that should not be caught by the landing page
const RESERVED_ROUTES = [
  'login',
  'admin',
  'studio',
  'explore',
  'gallery',
  'portfolio',
  'profile',
  'api',
  'oauth',
  'authorize',
  'register',
  'log',
  'db-test',
  'theme-demo',
  'actions',
]

export default async function DynamicLandingPage({
  params,
}: {
  params: Promise<{ landing: string }>
}) {
  const { landing } = await params

  // Don't catch reserved routes - let Next.js route to the actual pages
  if (RESERVED_ROUTES.includes(landing.toLowerCase())) {
    notFound()
  }

  // TODO: Fetch landing page config from Supabase based on slug
  // For now, show a placeholder

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Welcome, {landing.charAt(0).toUpperCase() + landing.slice(1)}
        </h1>
        <p className="text-muted-foreground mb-8">
          Custom landing page for {landing}
        </p>

        <div className="border rounded-lg p-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Dynamic landing page content configured in admin
          </p>
        </div>
      </div>
    </div>
  )
}
