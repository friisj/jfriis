# Remote MCP Implementation Guide

> **Status:** Complete (Working with Claude Connector)
> **Date:** 2025-12-28
> **Related:** [REMOTE_MCP_SPEC.md](./REMOTE_MCP_SPEC.md), [REMOTE_MCP_IMPL_PLAN.md](./REMOTE_MCP_IMPL_PLAN.md)

---

## Overview

This document captures the actual implementation of Remote MCP for jonfriis.com, including challenges encountered and solutions discovered. The original spec assumed Supabase's built-in OAuth 2.1 Server would handle authentication, but Claude's connector system required a custom OAuth 2.0 Authorization Server implementation.

### What We Built

A complete Remote MCP server that works with Claude's custom connector system:

- **OAuth 2.0 Authorization Server** with PKCE support
- **Dynamic Client Registration** (RFC 7591)
- **MCP Protocol Endpoint** with JSON-RPC 2.0
- **Middleware** to handle Claude's request patterns

---

## Architecture (Final)

```
Claude Connector
      │
      ├── 1. GET /.well-known/mcp.json (discovery)
      ├── 2. GET /.well-known/oauth-authorization-server (OAuth metadata)
      ├── 3. POST /register (Dynamic Client Registration)
      ├── 4. GET /authorize → /login → /oauth/authorize (consent)
      ├── 5. POST /api/oauth/token (token exchange)
      └── 6. POST / → rewritten to /api/mcp/v1/messages
                │
                ▼
         Supabase DB
```

---

## Key Files

### OAuth System

| File | Purpose |
|------|---------|
| `app/register/route.ts` | Dynamic Client Registration (RFC 7591) |
| `app/authorize/route.ts` | OAuth authorization endpoint |
| `app/api/oauth/authorize/route.ts` | Alternative auth endpoint |
| `app/api/oauth/token/route.ts` | Token exchange endpoint |
| `app/(public)/oauth/authorize/page.tsx` | Consent UI page |
| `lib/mcp/oauth-store.ts` | Encrypted auth code storage |

### MCP System

| File | Purpose |
|------|---------|
| `app/api/mcp/v1/messages/route.ts` | Main MCP endpoint |
| `app/api/mcp/health/route.ts` | Health check |
| `app/.well-known/mcp.json/route.ts` | MCP manifest |
| `app/.well-known/oauth-authorization-server/route.ts` | OAuth metadata (RFC 8414) |
| `middleware.ts` | Rewrites POST / to MCP endpoint |

### Shared Core

| File | Purpose |
|------|---------|
| `lib/mcp/tools-core.ts` | Tool implementations |
| `lib/mcp/permissions.ts` | Role-based access control |
| `lib/mcp/rate-limit.ts` | Rate limiting |

---

## Challenges & Solutions

### Challenge 1: Supabase OAuth Server Not Compatible

**Problem:** The original spec assumed Supabase's OAuth 2.1 Server would work. However, Claude's connector expects to be an OAuth *client* with its own `client_id`. Supabase's OAuth endpoints don't accept arbitrary client IDs.

**Solution:** Implemented a custom OAuth 2.0 Authorization Server on jonfriis.com that:
- Accepts any client_id from Claude
- Uses Supabase for actual user authentication (magic link)
- Issues authorization codes containing Supabase JWT tokens

**Commits:** `6d387ab`, `5158210`

### Challenge 2: Serverless Cold Starts Break OAuth

**Problem:** In-memory authorization code storage doesn't survive serverless function restarts. Users would complete login, but the auth code would be missing when exchanging for tokens.

**Solution:** Encrypted the entire OAuth request data INTO the authorization code itself using AES-256-GCM. The code IS the encrypted payload, eliminating the need for server-side storage.

```typescript
// lib/mcp/oauth-store.ts
function encrypt(data: string): string {
  const key = getEncryptionKey()  // Derived from SUPABASE_SERVICE_ROLE_KEY
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  // ... encrypt and return combined iv + authTag + encrypted
}

export function generateAuthCode(request: OAuthRequest): string {
  return encrypt(JSON.stringify({ ...request, created_at: Date.now() }))
}
```

**Commit:** `5158210`

### Challenge 3: www vs non-www Domain Redirect

**Problem:** OAuth flow broke because `jonfriis.com` 307 redirects to `www.jonfriis.com`, losing OAuth state during redirects.

**Solution:** Updated all OAuth URLs in the MCP manifest to use `www.jonfriis.com` consistently.

**Commit:** `1aba304`

### Challenge 4: Claude POSTs to Root Path

**Problem:** Vercel logs showed Claude POSTing to `/` and receiving 405 Method Not Allowed. Claude's connector POSTs to the base URL, but our MCP endpoint was at `/api/mcp/v1/messages`.

**Solution:** Created Next.js middleware to rewrite POST requests to `/` to the MCP endpoint:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/api/mcp/v1/messages'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}
```

**Commit:** `38b03e1`

### Challenge 5: Vercel Build Failures with Supabase

**Problem:** Vercel builds failed with "Missing Supabase URL/key" errors during static page prerendering. Environment variables aren't available at build time.

**Solution:** Added `export const dynamic = 'force-dynamic'` to all pages that use Supabase, preventing build-time prerendering.

**Commits:** `ed56a47`, `2ed2363`, `254f361`, `9bfdcd5`, `2de7f86`

### Challenge 6: Dynamic Client Registration Required

**Problem:** Claude wasn't sending Authorization headers. Logs showed `MCP Auth: header starts with Bearer: undefined`. Turns out Claude uses OAuth Dynamic Client Registration (RFC 7591) to obtain client credentials before starting the OAuth flow.

**Solution:** Implemented `/register` endpoint for DCR:

```typescript
// app/register/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  const clientId = randomUUID()

  return Response.json({
    client_id: clientId,
    client_name: body.client_name || 'MCP Client',
    redirect_uris: body.redirect_uris || [],
    // ...
  }, { status: 201 })
}
```

**Commit:** `ce2ac55`

### Challenge 7: Claude Uses /authorize Not /api/oauth/authorize

**Problem:** Claude was redirecting to `/authorize` but our OAuth endpoint was at `/api/oauth/authorize`.

**Solution:** Created `/authorize` route that mirrors `/api/oauth/authorize`. Also added OAuth Authorization Server Metadata (RFC 8414) at `/.well-known/oauth-authorization-server`.

**Commit:** `4e598a3`

### Challenge 8: MCP Protocol Methods

**Problem:** MCP endpoint only supported `tools/call`, but Claude also needs `tools/list` (tool discovery) and `initialize` (protocol handshake).

**Solution:** Added handlers for `tools/list` and `initialize` methods:

```typescript
if (body.method === 'tools/list') {
  return Response.json(jsonRpcSuccess(requestId, {
    tools: [
      { name: 'db_list_tables', description: '...', inputSchema: {...} },
      // ...
    ]
  }))
}

if (body.method === 'initialize') {
  return Response.json(jsonRpcSuccess(requestId, {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'jfriis', version: '1.0.0' }
  }))
}
```

**Commit:** `ef88185`

---

## OAuth Flow (Final Implementation)

```
1. Claude GETs /.well-known/mcp.json
   → Returns authentication.registration_url, authorization_url, token_url

2. Claude POSTs /register
   → Returns client_id (Dynamic Client Registration)

3. Claude redirects to /authorize?client_id=...&code_challenge=...
   → Sets oauth_request cookie
   → Redirects to /login?redirect=/oauth/authorize

4. User logs in via Supabase magic link
   → Redirected back to /oauth/authorize

5. User sees consent page, clicks Approve
   → POST /api/oauth/authorize/approve
   → Generates encrypted auth code
   → Redirects to Claude's callback with ?code=...&state=...

6. Claude POSTs /api/oauth/token with code + code_verifier
   → Decrypts code, validates PKCE
   → Returns access_token (Supabase JWT)

7. Claude POSTs / with Bearer token
   → Middleware rewrites to /api/mcp/v1/messages
   → Token validated against Supabase
   → MCP tools execute
```

---

## Testing Commands

### Test MCP Discovery
```bash
curl https://www.jonfriis.com/.well-known/mcp.json | jq .
```

### Test OAuth Metadata
```bash
curl https://www.jonfriis.com/.well-known/oauth-authorization-server | jq .
```

### Test Dynamic Client Registration
```bash
curl -X POST https://www.jonfriis.com/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","redirect_uris":["https://claude.ai/api/mcp/auth_callback"]}'
```

### Test MCP Health
```bash
curl https://www.jonfriis.com/api/mcp/health
```

### Test MCP Endpoint (requires valid token)
```bash
curl -X POST https://www.jonfriis.com/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Insights

### 1. MCP Spec vs Reality

The MCP specification is still evolving. Claude's connector implementation has specific requirements not always obvious from docs:
- Uses DCR (Dynamic Client Registration) by default
- POSTs to root URL, not a specific path
- Expects OAuth metadata at standard RFC 8414 location
- Uses `/authorize` not `/api/oauth/authorize`

### 2. Serverless OAuth is Hard

Traditional OAuth implementations rely on server-side session storage. In serverless:
- Can't use in-memory storage (cold starts)
- Database adds latency and complexity
- Encrypted self-contained tokens are the cleanest solution

### 3. Supabase OAuth Server Limitations

Supabase's OAuth 2.1 Server is designed for apps where Supabase IS the identity provider. It doesn't work when you need to accept external OAuth clients with their own client_ids. Custom implementation was necessary.

### 4. Debug Logging is Essential

Adding console.log statements at key points was crucial for debugging:
- OAuth request received
- Token validation result
- PKCE verification
- Client registration

These appear in Vercel's function logs.

### 5. Allowed Redirect URIs

Security requires restricting OAuth redirect URIs. Current allowlist:
```typescript
const ALLOWED_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]
```

---

## Future Improvements

1. **Token Refresh**: Currently using Supabase JWT directly. Could implement refresh token flow.

2. **Client Registration Storage**: In-memory client registry doesn't persist. Could store in database.

3. **Audit Logging**: Track who accessed what tools when.

4. **More Granular Permissions**: Current roles are admin/editor. Could add read-only role.

5. **CORS Refinement**: Currently using `*` for some endpoints. Could restrict to known Claude origins.

---

## Quick Reference

### Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Used for auth code encryption
KV_REST_API_URL=xxx            # For rate limiting
KV_REST_API_TOKEN=xxx
NEXT_PUBLIC_SITE_URL=https://www.jonfriis.com
```

### Connect Claude to Your MCP Server

1. Open Claude Settings > Connectors
2. Add Custom Connection
3. Name: `jfriis` (or any name)
4. URL: `https://www.jonfriis.com`
5. Press Connect
6. Complete login via magic link
7. Approve on consent screen
8. Done! MCP tools now available

---

*Implementation completed 2025-12-28. Total commits: ~15. Major pivot from Supabase OAuth to custom OAuth implementation.*
