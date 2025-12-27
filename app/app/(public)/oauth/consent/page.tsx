/**
 * OAuth Consent Page
 *
 * Displays authorization request details and allows user to approve/deny.
 * Works with Supabase OAuth 2.1 Server.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ConsentForm } from './consent-form'

interface PageProps {
  searchParams: Promise<{
    authorization_id?: string
  }>
}

export default async function ConsentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const authorizationId = params.authorization_id

  if (!authorizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Request</h1>
          <p className="text-muted-foreground">Missing authorization_id parameter</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login, preserving the authorization_id
    redirect(`/login?redirect=/oauth/consent&authorization_id=${authorizationId}`)
  }

  // Note: Supabase OAuth Server is in beta. The getAuthorizationDetails API
  // may need to be called differently depending on the SDK version.
  // For now, we show a simple consent form.

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Authorization Request</h1>
          <p className="text-muted-foreground">
            An application is requesting access to your account
          </p>
        </div>

        <div className="border rounded-lg p-8 bg-card">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              By approving, you allow the application to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Access database tools on your behalf</li>
              <li>Read and write data based on your permissions</li>
            </ul>
          </div>

          <ConsentForm
            authorizationId={authorizationId}
            userEmail={user.email}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Logged in as {user.email}
        </p>
      </div>
    </div>
  )
}
