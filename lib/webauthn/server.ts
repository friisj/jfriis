/**
 * WebAuthn Server Utilities
 *
 * Handles registration and authentication ceremonies using SimpleWebAuthn.
 * Uses a Supabase service role client to manage credentials and challenges
 * (bypasses RLS since these operations occur before/without a session).
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { rpName, rpID, origin } from './config'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// --- Registration ---

export async function createRegistrationOptions(
  userId: string,
  userEmail: string
) {
  // Clean up expired challenges
  await supabaseAdmin.rpc('cleanup_expired_webauthn_challenges')

  // Get existing credentials to exclude (prevent re-registration)
  const { data: existing } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('id, transports')
    .eq('user_id', userId)

  const excludeCredentials = (existing ?? []).map((cred) => ({
    id: cred.id,
    transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: userEmail,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    attestationType: 'none',
  })

  // Store challenge for verification
  await supabaseAdmin.from('webauthn_challenges').insert({
    challenge: options.challenge,
    user_id: userId,
    type: 'registration',
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  })

  return options
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  friendlyName?: string
) {
  // Retrieve and consume the challenge (single-use)
  const { data: challenges } = await supabaseAdmin
    .from('webauthn_challenges')
    .select('id, challenge')
    .eq('user_id', userId)
    .eq('type', 'registration')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  const challenge = challenges?.[0]
  if (!challenge) {
    throw new Error('No valid registration challenge found')
  }

  // Delete the challenge (single-use)
  await supabaseAdmin
    .from('webauthn_challenges')
    .delete()
    .eq('id', challenge.id)

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed')
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo

  // Store the credential
  const { error } = await supabaseAdmin
    .from('webauthn_credentials')
    .insert({
      id: credential.id,
      user_id: userId,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: credential.transports ?? [],
      name: friendlyName ?? null,
    })

  if (error) {
    throw new Error(`Failed to store credential: ${error.message}`)
  }

  return {
    id: credential.id,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  }
}

// --- Authentication ---

export async function createAuthenticationOptions() {
  // Clean up expired challenges
  await supabaseAdmin.rpc('cleanup_expired_webauthn_challenges')

  // Get all credentials (single-user site)
  const { data: credentials } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('id, transports')

  const allowCredentials = (credentials ?? []).map((cred) => ({
    id: cred.id,
    transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
  }))

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  })

  // Store challenge for verification
  await supabaseAdmin.from('webauthn_challenges').insert({
    challenge: options.challenge,
    type: 'authentication',
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  })

  return options
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON
) {
  // Find the credential being used
  const { data: credentialRow } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('id, user_id, public_key, counter, transports')
    .eq('id', response.id)
    .single()

  if (!credentialRow) {
    throw new Error('Credential not found')
  }

  // Retrieve and consume a matching challenge (single-use)
  const { data: challenges } = await supabaseAdmin
    .from('webauthn_challenges')
    .select('id, challenge')
    .eq('type', 'authentication')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5)

  if (!challenges?.length) {
    throw new Error('No valid authentication challenge found')
  }

  // The credential's public key is stored as base64, convert to Uint8Array
  const publicKeyBytes = Buffer.from(credentialRow.public_key, 'base64')

  const credential = {
    id: credentialRow.id,
    publicKey: new Uint8Array(publicKeyBytes),
    counter: credentialRow.counter,
    transports: (credentialRow.transports ??
      []) as AuthenticatorTransportFuture[],
  }

  // Try each challenge — the client could have requested options multiple times
  let verification
  let matchedChallengeId: string | undefined

  for (const ch of challenges) {
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential,
        requireUserVerification: false,
      })
      matchedChallengeId = ch.id
      break
    } catch {
      // Try next challenge
      continue
    }
  }

  if (!verification?.verified || !matchedChallengeId) {
    throw new Error('Authentication verification failed')
  }

  // Delete the consumed challenge
  await supabaseAdmin
    .from('webauthn_challenges')
    .delete()
    .eq('id', matchedChallengeId)

  // Update counter and last_used_at
  await supabaseAdmin
    .from('webauthn_credentials')
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', credentialRow.id)

  // Look up the user's email for session creation
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
    credentialRow.user_id
  )

  if (!userData?.user?.email) {
    throw new Error('User not found')
  }

  return {
    userId: credentialRow.user_id,
    email: userData.user.email,
  }
}

// --- Credential Management ---

export async function listCredentials(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('id, name, device_type, backed_up, transports, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list credentials: ${error.message}`)
  }

  return data ?? []
}

export async function deleteCredential(userId: string, credentialId: string) {
  const { error } = await supabaseAdmin
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete credential: ${error.message}`)
  }
}

export async function renameCredential(
  userId: string,
  credentialId: string,
  name: string
) {
  const { error } = await supabaseAdmin
    .from('webauthn_credentials')
    .update({ name })
    .eq('id', credentialId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to rename credential: ${error.message}`)
  }
}
