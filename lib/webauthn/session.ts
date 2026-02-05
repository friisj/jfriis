/**
 * WebAuthn Session Bridge
 *
 * Converts a verified passkey authentication into a standard Supabase session.
 * Uses the admin API to generate a magic link server-side, then exchanges
 * the hashed token for a session — producing the same result as a normal
 * magic link click.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Generate a hashed token that can be exchanged for a Supabase session.
 * This creates a magic link server-side (never sent to email) and returns
 * the token hash for immediate exchange via verifyOtp.
 */
export async function generateSessionToken(email: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error) {
    throw new Error(`Failed to generate session link: ${error.message}`)
  }

  const hashedToken = data?.properties?.hashed_token
  if (!hashedToken) {
    throw new Error('No hashed token in generateLink response')
  }

  return hashedToken
}
