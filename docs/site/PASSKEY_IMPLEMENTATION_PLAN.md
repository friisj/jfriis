# Passkey (WebAuthn) Implementation Plan

**Approach:** Option A — Passkey verification triggers a server-side Supabase magic link exchange, producing a standard Supabase session. All existing auth infrastructure (RLS, middleware, hooks) remains untouched.

**Status:** Planning

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Login Page                          │
│  ┌──────────────┐           ┌────────────────────────┐  │
│  │ Magic Link   │           │ Sign in with Passkey   │  │
│  │ (existing)   │           │ (new)                  │  │
│  └──────┬───────┘           └───────────┬────────────┘  │
│         │                               │               │
└─────────┼───────────────────────────────┼───────────────┘
          │                               │
          ▼                               ▼
   Supabase OTP email          Browser WebAuthn API
                                          │
                                          ▼
                               POST /api/auth/passkey/authenticate/verify
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ SimpleWebAuthn server │
                               │ verifies assertion    │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────────┐
                               │ supabase.auth.admin       │
                               │   .generateLink({        │
                               │     type: 'magiclink',   │
                               │     email: user.email    │
                               │   })                     │
                               └──────────┬───────────────┘
                                          │
                                          ▼
                               ┌──────────────────────────┐
                               │ Exchange hashed_token     │
                               │ for session via           │
                               │ verifyOtp({ token_hash }) │
                               └──────────┬───────────────┘
                                          │
                                          ▼
                               Standard Supabase session
                               (same as magic link flow)
```

### Why This Works

After passkey verification, we use the Supabase Admin API (`generateLink`) to create a magic link server-side. We then immediately exchange the `hashed_token` from that response via `verifyOtp` to establish a session. The result is a standard Supabase JWT session — identical to what a normal magic link click produces.

This means:
- `middleware.ts` session refresh: **unchanged**
- `useAuth()` hook: **unchanged**
- `ProtectedRoute` / `AdminRoute`: **unchanged**
- RLS `is_admin()` function: **unchanged**
- `lib/ai/auth.ts` server auth: **unchanged**
- Cookie management: **unchanged**

---

## Dependencies

### New npm packages

| Package | Purpose | Size |
|---------|---------|------|
| `@simplewebauthn/server` | Server-side WebAuthn ceremonies (registration/authentication) | ~45KB |
| `@simplewebauthn/browser` | Client-side WebAuthn API wrapper | ~8KB |

These are the standard WebAuthn libraries for Node.js/browser, well-maintained, and the de facto choice for DIY WebAuthn in the JS ecosystem.

### Existing dependencies used

| Package | Usage |
|---------|-------|
| `@supabase/supabase-js` | Admin API for `generateLink`, `verifyOtp` |
| `@supabase/ssr` | Server client for session management |

---

## Implementation Steps

### Step 1: Database — WebAuthn tables

**File:** `supabase/migrations/20260205000000_webauthn_passkeys.sql`

Two new tables, both with RLS enabled and admin-only access:

```sql
-- WebAuthn credential storage
CREATE TABLE webauthn_credentials (
  id TEXT PRIMARY KEY,                -- credential ID (base64url encoded)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL,          -- COSE public key
  counter BIGINT NOT NULL DEFAULT 0,  -- signature counter (replay protection)
  device_type TEXT NOT NULL,           -- 'singleDevice' | 'multiDevice'
  backed_up BOOLEAN NOT NULL DEFAULT false,
  transports TEXT[],                   -- 'internal', 'usb', 'ble', 'nfc', 'hybrid'
  name TEXT,                           -- user-assigned friendly name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_webauthn_credentials_user ON webauthn_credentials(user_id);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage passkeys"
  ON webauthn_credentials FOR ALL
  USING (is_admin());

-- Temporary challenge storage for WebAuthn ceremonies
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,             -- base64url encoded challenge
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage challenges"
  ON webauthn_challenges FOR ALL
  USING (is_admin());

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Design notes:**
- Challenges are stored in DB (not encrypted cookies) because the WebAuthn ceremony spans two separate HTTP requests (get options → verify response), and the server must validate the challenge matches.
- Challenge expiry: 5 minutes (standard WebAuthn timeout).
- The `webauthn_credentials.counter` field provides replay attack protection — each assertion must have a counter strictly greater than the stored value.
- `device_type` and `backed_up` track whether the passkey is a synced/multi-device credential (e.g., iCloud Keychain) vs. single-device (e.g., YubiKey).

---

### Step 2: WebAuthn server configuration

**File:** `lib/webauthn/config.ts`

```typescript
export const rpName = 'Jon Friis'
export const rpID = process.env.NODE_ENV === 'production'
  ? 'jonfriis.com'
  : 'localhost'
export const origin = process.env.NODE_ENV === 'production'
  ? 'https://jonfriis.com'
  : 'http://localhost:3000'
```

Relying Party (RP) configuration. The `rpID` must match the domain the browser sees — this is a WebAuthn security requirement.

---

### Step 3: WebAuthn server utilities

**File:** `lib/webauthn/server.ts`

Server-side ceremony handlers wrapping `@simplewebauthn/server`:

1. **`generateRegistrationOptions(userId, userEmail)`**
   - Queries existing credentials for the user (to set `excludeCredentials`)
   - Creates a challenge, stores it in `webauthn_challenges` with 5-min expiry
   - Returns `PublicKeyCredentialCreationOptionsJSON`

2. **`verifyRegistrationResponse(userId, response)`**
   - Retrieves and consumes the stored challenge
   - Calls `verifyRegistrationResponse` from SimpleWebAuthn
   - On success, inserts new row into `webauthn_credentials`
   - Returns the credential info

3. **`generateAuthenticationOptions()`**
   - Queries all credentials (single-user site, so no user lookup needed yet)
   - Creates and stores a challenge
   - Returns `PublicKeyCredentialRequestOptionsJSON` with `allowCredentials`

4. **`verifyAuthenticationResponse(response)`**
   - Retrieves and consumes the stored challenge
   - Looks up credential by ID from the assertion
   - Calls `verifyAuthenticationResponse` from SimpleWebAuthn
   - On success, updates `counter` and `last_used_at`
   - Returns the verified user's email and ID

All functions use the Supabase **service role client** (not the anon client) to bypass RLS for credential and challenge management, since these operations happen before a session exists.

---

### Step 4: Session bridge — Passkey to Supabase session

**File:** `lib/webauthn/session.ts`

The critical bridge that turns a verified passkey into a Supabase session:

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role client (bypasses RLS, can use admin API)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createSessionForUser(email: string) {
  // 1. Generate a magic link server-side (never sent to email)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error || !data?.properties?.hashed_token) {
    throw new Error('Failed to generate session link')
  }

  // 2. Exchange the hashed token for a session
  // This produces the same session as clicking a magic link
  return data.properties.hashed_token
}
```

The API route will then call `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` using the **server client with cookie access** to establish the session in the response cookies.

---

### Step 5: API routes

Four routes, all under `/app/api/auth/passkey/`:

#### `GET /api/auth/passkey/register/options`

**Requires:** Active Supabase session (user must be logged in via magic link first)

```
Request:  (none, uses session cookie)
Response: PublicKeyCredentialCreationOptionsJSON
```

1. Validate session via `supabase.auth.getUser()`
2. Call `generateRegistrationOptions(user.id, user.email)`
3. Return options JSON

#### `POST /api/auth/passkey/register/verify`

**Requires:** Active Supabase session

```
Request:  { response: RegistrationResponseJSON, name?: string }
Response: { success: true, credential: { id, name, createdAt } }
```

1. Validate session
2. Call `verifyRegistrationResponse(user.id, body.response)`
3. Optionally set friendly name
4. Return credential info

#### `GET /api/auth/passkey/authenticate/options`

**No auth required** (user is trying to log in)

```
Request:  (none)
Response: PublicKeyCredentialRequestOptionsJSON
```

1. Call `generateAuthenticationOptions()`
2. Return options JSON

#### `POST /api/auth/passkey/authenticate/verify`

**No auth required** (this IS the login)

```
Request:  { response: AuthenticationResponseJSON }
Response: { success: true, redirectTo: '/admin' }
Side effect: Sets Supabase session cookies
```

1. Call `verifyAuthenticationResponse(body.response)` — get user email
2. Call `createSessionForUser(email)` — get hashed token
3. Use the **server Supabase client** (with cookie access from `lib/supabase-server.ts`) to call `verifyOtp({ token_hash, type: 'magiclink' })`
4. Session cookies are now set on the response
5. Return success with redirect URL

**Security considerations for the verify route:**
- Rate limiting (use existing `@upstash/ratelimit`) — max 10 attempts per minute per IP
- The WebAuthn protocol itself provides strong replay protection (challenge + counter)
- No user enumeration: return generic errors, don't reveal whether credentials exist

---

### Step 6: Client-side hooks

**File:** `lib/hooks/usePasskey.ts`

```typescript
'use client'

// Hook for passkey authentication on login page
export function usePasskeyAuth() {
  // State: idle | loading | error | success
  // authenticate(): fetches options, calls navigator.credentials.get(), posts to verify
  // isAvailable: checks if WebAuthn is supported via PublicKeyCredential
}

// Hook for passkey management in admin settings
export function usePasskeyManagement() {
  // credentials: list of registered passkeys
  // register(name?): fetches options, calls navigator.credentials.create(), posts to verify
  // remove(credentialId): deletes a passkey
  // rename(credentialId, name): updates friendly name
  // refresh(): re-fetches credential list
}
```

Both hooks use `@simplewebauthn/browser` (`startRegistration`, `startAuthentication`) to handle the browser ceremony and communicate with the API routes.

---

### Step 7: Login form update

**File:** `components/auth/login-form.tsx` (modify existing)

Add a "Sign in with Passkey" button **above** the magic link form, with a visual divider:

```
┌──────────────────────────────────┐
│                                  │
│   [🔑 Sign in with Passkey]     │  ← primary action (if passkeys exist)
│                                  │
│   ─────── or ───────             │
│                                  │
│   Email: [________________]      │
│   [Send Magic Link]             │  ← fallback
│                                  │
└──────────────────────────────────┘
```

**Conditional rendering:**
- Check `PublicKeyCredential` availability in the browser
- Fetch `/api/auth/passkey/authenticate/options` on mount — if it returns empty `allowCredentials`, hide the passkey button (no passkeys registered yet)
- After successful passkey auth, redirect to `/admin` (or the `?redirect=` param)

**Accessibility:**
- Passkey button is keyboard-focusable
- Error states announced via `aria-live` region
- Loading state communicated to screen readers

---

### Step 8: Admin settings page — Passkey management

**New file:** `app/(private)/admin/settings/page.tsx`

A new admin settings page for managing passkeys:

```
┌─────────────────────────────────────────────────┐
│  Settings                                       │
│                                                 │
│  Passkeys                                       │
│  ┌─────────────────────────────────────────────┐│
│  │ MacBook Pro Touch ID    Registered Jan 15   ││
│  │ Last used: 2 hours ago  [Rename] [Remove]   ││
│  ├─────────────────────────────────────────────┤│
│  │ iPhone (iCloud Keychain)  Registered Jan 20 ││
│  │ Last used: Yesterday    [Rename] [Remove]   ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  [+ Register New Passkey]                       │
│                                                 │
│  Magic Link                                     │
│  Email: jon@example.com                         │
│  Always available as a fallback login method.   │
└─────────────────────────────────────────────────┘
```

**Components needed:**
- `components/admin/settings/passkey-list.tsx` — Lists registered passkeys with management actions
- `components/admin/settings/passkey-register-button.tsx` — Triggers registration ceremony

**Navigation:**
- Add "Settings" link to admin sidebar/dashboard

---

### Step 9: Add settings link to admin dashboard

**File:** `app/(private)/admin/page.tsx` (modify existing)

Add a "Settings" quick action card linking to `/admin/settings`.

---

## File Change Summary

### New files (8)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260205000000_webauthn_passkeys.sql` | Database tables |
| `lib/webauthn/config.ts` | RP configuration |
| `lib/webauthn/server.ts` | Server ceremony handlers |
| `lib/webauthn/session.ts` | Passkey → Supabase session bridge |
| `app/api/auth/passkey/register/options/route.ts` | Registration options endpoint |
| `app/api/auth/passkey/register/verify/route.ts` | Registration verify endpoint |
| `app/api/auth/passkey/authenticate/options/route.ts` | Authentication options endpoint |
| `app/api/auth/passkey/authenticate/verify/route.ts` | Authentication verify endpoint |
| `lib/hooks/usePasskey.ts` | Client-side passkey hooks |
| `app/(private)/admin/settings/page.tsx` | Admin settings page |
| `components/admin/settings/passkey-list.tsx` | Passkey management UI |
| `components/admin/settings/passkey-register-button.tsx` | Registration trigger |

### Modified files (2)

| File | Change |
|------|--------|
| `components/auth/login-form.tsx` | Add passkey auth button above magic link form |
| `app/(private)/admin/page.tsx` | Add Settings link to quick actions |

### Unchanged files

Everything else: `middleware.ts`, `lib/supabase-server.ts`, `lib/supabase.ts`, `lib/hooks/useAuth.ts`, `components/auth/protected-route.tsx`, `lib/ai/auth.ts`, all RLS policies, OAuth server.

---

## Implementation Order

The steps should be implemented in this sequence due to dependencies:

```
1. Install packages          (no dependencies)
2. Database migration        (no dependencies)
3. WebAuthn config           (no dependencies)
4. WebAuthn server utils     (depends on 2, 3)
5. Session bridge            (depends on 4)
6. API routes                (depends on 4, 5)
7. Client hooks              (depends on 6)
8. Login form update         (depends on 7)
9. Admin settings page       (depends on 7)
10. Admin dashboard link     (depends on 9)
```

Steps 1-3 can be done in parallel. Steps 8 and 9 can be done in parallel.

---

## Testing Strategy

### Unit tests

- `lib/webauthn/server.ts`: Mock Supabase client, test challenge creation/consumption, credential CRUD
- `lib/webauthn/session.ts`: Mock admin API, test token generation
- `lib/hooks/usePasskey.ts`: Mock fetch and navigator.credentials

### Integration tests

- Registration flow: logged-in user → register options → browser ceremony → verify → credential stored
- Authentication flow: options → browser ceremony → verify → session established → redirected
- Error cases: expired challenge, invalid assertion, counter rollback, no credentials

### Manual testing checklist

- [ ] Register passkey on macOS (Touch ID)
- [ ] Authenticate with registered passkey
- [ ] Verify session works (can access admin, RLS enforced)
- [ ] Fallback to magic link still works
- [ ] Register passkey on mobile (Face ID / fingerprint)
- [ ] Cross-device passkey via iCloud Keychain / Google Password Manager
- [ ] Remove passkey from settings
- [ ] Rename passkey from settings
- [ ] Attempt auth with no passkeys registered (button hidden/graceful error)
- [ ] Rate limiting prevents brute force

---

## Security Considerations

1. **Challenge expiry:** 5 minutes, single-use (deleted after consumption)
2. **Counter validation:** Each assertion counter must exceed stored value
3. **Rate limiting:** Authentication verify endpoint rate-limited per IP
4. **No user enumeration:** Authentication options return credentials without revealing user identity (single-user site, so this is inherent)
5. **Service role key scope:** Used only server-side in API routes, never exposed to client
6. **generateLink token:** Created and consumed in the same server request — no window for interception
7. **Origin validation:** SimpleWebAuthn validates the origin matches `rpID`
8. **Transports hint:** Stored to improve UX on subsequent authentications (browser knows which transport to prefer)

---

## Rollback Plan

If passkeys cause issues:
1. Remove passkey button from login form (one-line change)
2. Magic link continues working with zero changes
3. Passkey tables can remain dormant — no impact on existing functionality
4. Remove API routes at leisure

The passkey system is purely additive. It adds a new login path but never modifies the existing one.

---

## Future Considerations (not in scope)

- **Conditional UI / autofill:** WebAuthn Level 3 supports `mediation: 'conditional'` which shows passkeys in the browser's autofill UI. Could be a UX improvement later.
- **Native Supabase passkey support:** If/when Supabase ships native support, migrate to it and remove custom code.
- **Multiple users:** Current design works for single-user but the schema supports multiple users if needed later.
