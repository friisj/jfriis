# jonfriis.com Remote MCP Server Specification

> **Version:** 2.1.0
> **Status:** Specification
> **Last Updated:** 2025-12-27
> **Depends On:** [MCP_SPEC.md](./MCP_SPEC.md) (local implementation)

---

## Overview

A remote HTTP transport layer for the jfriis MCP server, enabling access from Claude Mobile, claude.ai, Claude Desktop, and potentially other clients. This builds on the existing local stdio MCP implementation.

### Why Remote?

The local MCP (stdio transport) works excellently with Claude Code but is inaccessible from:

- **Claude Mobile** (iOS/Android) - Supports remote MCP only
- **claude.ai** (web) - Requires HTTP endpoints
- **Claude Desktop** - Can use either, but HTTP enables shared access
- **ChatGPT** - Via Actions (OpenAPI integration)

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Clients                                  │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ Claude Code  │ Claude Mobile│ claude.ai    │ Claude Desktop    │
│ (stdio)      │ (HTTP)       │ (HTTP)       │ (HTTP or stdio)   │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────┬─────────┘
       │              │              │                 │
       │              └──────────────┴─────────────────┘
       │                             │
       │                    ┌────────▼────────┐
       │                    │  Remote MCP     │
       │                    │  (Vercel Edge)  │
       │                    │                 │
       │                    │  - HTTP Server  │
       │                    │  - OAuth 2.1    │
       │                    │  - Rate Limits  │
       │                    └────────┬────────┘
       │                             │
       │              ┌──────────────┘
       │              │
┌──────▼──────────────▼──────┐
│      Shared Core           │
│  - 5 CRUD Tools            │
│  - Table Registry          │
│  - Zod Validation          │
└────────────┬───────────────┘
             │
      ┌──────▼──────┐
      │  Supabase   │
      │ (PostgreSQL)│
      └─────────────┘
```

### Key Differences from Local MCP

| Aspect | Local (stdio) | Remote (HTTP) |
|--------|---------------|---------------|
| Transport | stdio pipes | HTTPS |
| Auth | Process-level (trusted) | OAuth 2.1 |
| Hosting | Local machine | Vercel Edge |
| Latency | ~0ms | ~100-300ms |
| Access | Claude Code only | Any MCP client |
| Rate limits | None | Per-user quotas |

---

## Technology Stack

- **Runtime:** Vercel (Next.js API routes)
- **Auth:** Supabase OAuth 2.1 Server (built-in, free)
- **Core:** Shared code with local MCP (`@modelcontextprotocol/sdk`, Zod, Supabase)
- **Deployment:** Vercel (same as main site)

---

## Authentication

### Supabase OAuth 2.1 Server

Supabase provides built-in OAuth 2.1 server capabilities (public beta, free on all plans). This eliminates the need for custom OAuth implementation.

**What Supabase handles:**
- Authorization endpoint (`/auth/v1/oauth/authorize`)
- Token endpoint (`/auth/v1/oauth/token`)
- PKCE validation
- JWT signing (RS256)
- Refresh tokens
- JWKS endpoint
- OIDC discovery

**What we build:**
- Consent UI page (~50 lines)

### OAuth Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Claude  │                    │ Supabase │                    │ jonfriis │
│  Client  │                    │   Auth   │                    │ Consent  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  1. Authorization Request     │                               │
     │  GET /auth/v1/oauth/authorize │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │  2. Redirect to consent       │
     │                               │  /oauth/consent?authz_id=xxx  │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │                    3. User logs in
     │                               │                    4. Approves/denies
     │                               │                               │
     │                               │  5. Redirect back with code   │
     │◄──────────────────────────────┼───────────────────────────────┤
     │                               │                               │
     │  6. Token Exchange            │                               │
     │  POST /auth/v1/oauth/token    │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │  7. Access Token (JWT)        │                               │
     │◄──────────────────────────────┤                               │
```

### Consent UI

The only custom code needed - a page showing what the client is requesting:

```typescript
// app/(site)/oauth/consent/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { authorization_id: string }
}) {
  const supabase = createClient()
  const { authorization_id } = searchParams

  // Get authorization details
  const { data: authDetails, error } = await supabase.auth.oauth
    .getAuthorizationDetails(authorization_id)

  if (error) {
    return <div>Invalid authorization request</div>
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Redirect to login, preserving authorization_id
    redirect(`/login?redirect=/oauth/consent&authorization_id=${authorization_id}`)
  }

  return (
    <ConsentForm
      clientName={authDetails.client.name}
      scopes={authDetails.scopes}
      authorizationId={authorization_id}
    />
  )
}

// Client component for approve/deny buttons
async function handleApprove(authorizationId: string) {
  'use server'
  const supabase = createClient()
  const { data } = await supabase.auth.oauth.approveAuthorization(authorizationId)
  redirect(data.redirect_to)
}

async function handleDeny(authorizationId: string) {
  'use server'
  const supabase = createClient()
  const { data } = await supabase.auth.oauth.denyAuthorization(authorizationId)
  redirect(data.redirect_to)
}
```

### Setup Steps

1. **Enable OAuth Server** in Supabase Dashboard → Authentication → OAuth Server
2. **Set Authorization Path** to `/oauth/consent`
3. **Switch JWT signing** to RS256 (Dashboard → Auth → Settings)
4. **Register OAuth client** for Claude (Dashboard → Authentication → OAuth Apps)
5. **Build consent UI** page (code above)

### User Model

Multi-user ready from day one:

- **Multiple users**: Owner + collaborators + API clients
- **Auth methods**: Magic link, social login, passkey
- **Session management**: Supabase handles JWT + refresh tokens
- **Device management**: Via Supabase dashboard
- **Role assignment**: Each user has roles in `profiles.mcp_roles`

### References

- [Supabase OAuth 2.1 Server Docs](https://supabase.com/docs/guides/auth/oauth-server)
- [Getting Started Guide](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- [OAuth 2.1 Flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)

---

## Roles & Permissions

Two roles with project-level assignment for collaborators.

### Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to everything |
| `editor` | Read all, write only to assigned projects |

### How It Works

```
Request with Bearer Token
        │
        ▼
   Is user admin? ─── Yes ──► Execute
        │
        No
        │
        ▼
   Is this a read? ─── Yes ──► Execute
        │
        No
        │
        ▼
   Is user assigned to this project? ─── Yes ──► Execute
        │
        No
        │
        ▼
   403 Forbidden
```

### Database Schema

```sql
-- Add role and project assignments to profiles
ALTER TABLE profiles
  ADD COLUMN role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  ADD COLUMN assigned_projects UUID[] DEFAULT '{}';

-- Jon is admin
UPDATE profiles SET role = 'admin' WHERE id = '<jon-user-id>';

-- Assign collaborator to specific projects
UPDATE profiles
  SET assigned_projects = ARRAY['<project-uuid-1>', '<project-uuid-2>']
  WHERE id = '<collaborator-user-id>';
```

### Permission Check

```typescript
// lib/mcp/permissions.ts
type Operation = 'read' | 'create' | 'update' | 'delete'

interface User {
  id: string
  role: 'admin' | 'editor'
  assigned_projects: string[]
}

export function canAccess(
  user: User,
  operation: Operation,
  projectId?: string
): boolean {
  // Admins can do anything
  if (user.role === 'admin') return true

  // Everyone can read
  if (operation === 'read') return true

  // Editors can write to assigned projects
  if (projectId && user.assigned_projects.includes(projectId)) return true

  return false
}
```

### Project Context

Tools need to know which project a record belongs to:

```typescript
// For studio tables, project_id is explicit
db_create({ table: 'studio_tokens', data: { project_id: 'xxx', ... } })

// For site tables, we derive from context or require project_id
db_update({ table: 'log_entries', id: 'xxx', data: { ... } })
// → Look up log_entry.project_id to check permission
```

### Permission Errors

```typescript
{
  error: 'FORBIDDEN',
  message: 'You do not have write access to this project',
  details: { operation: 'update', project_id: 'xxx' }
}
```

---

## HTTP Endpoints

### MCP Protocol Endpoint

```
POST /api/mcp/v1/messages
  - Main MCP message endpoint
  - Accepts JSON-RPC 2.0 messages
  - Returns tool results
  - Requires Bearer token from Supabase OAuth
```

### OAuth Endpoints (Supabase-provided)

```
GET  /auth/v1/oauth/authorize  - Start OAuth flow (Supabase)
POST /auth/v1/oauth/token      - Token exchange (Supabase)
GET  /oauth/consent            - Consent UI (we build this)
```

### Utility Endpoints

```
GET  /api/mcp/health           - Health check
GET  /.well-known/mcp.json     - MCP server manifest
```

---

## MCP Server Manifest

Required for Claude to discover the MCP server capabilities.

```json
// /.well-known/mcp.json
{
  "name": "jfriis",
  "version": "1.0.0",
  "description": "Database CRUD for jonfriis.com",
  "homepage": "https://jonfriis.com",
  "authentication": {
    "type": "oauth2",
    "authorization_url": "https://jonfriis.com/oauth/authorize",
    "token_url": "https://jonfriis.com/oauth/token"
  },
  "endpoints": {
    "messages": "https://jonfriis.com/mcp/v1/messages"
  },
  "tools": [
    "db_list_tables",
    "db_query",
    "db_get",
    "db_create",
    "db_update",
    "db_delete"
  ]
}
```

---

## Request/Response Format

### MCP Message Request

```http
POST /mcp/v1/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "db_query",
    "arguments": {
      "table": "projects",
      "filter": { "published": true },
      "limit": 10
    }
  }
}
```

### MCP Message Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"data\":[{\"id\":\"...\",\"title\":\"Design System Tool\",...}],\"count\":1}"
      }
    ]
  }
}
```

### Error Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Table not found: unknown_table"
  }
}
```

---

## Rate Limiting

Simple per-user limit to prevent runaway clients.

### Implementation

```typescript
// lib/mcp/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
})

export async function checkRateLimit(userId: string) {
  const { success, remaining } = await ratelimit.limit(userId)
  return { success, remaining }
}
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30

{ "error": "Rate limit exceeded. Try again in 30 seconds." }
```

---

## Security

### Transport Security

- **HTTPS only**: No HTTP fallback
- **TLS 1.3**: Modern encryption
- **HSTS**: Strict transport security header

### CORS

Specific origins only (not `*`):

```typescript
// middleware.ts or route handler
const allowedOrigins = [
  'https://claude.ai',
  'https://api.anthropic.com',
  // Add other known Claude client origins
]

headers.set('Access-Control-Allow-Origin', origin) // Only if in allowedOrigins
headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
```

### Token Security

Handled by Supabase OAuth:
- **Access tokens**: JWT signed with RS256
- **Refresh tokens**: Managed by Supabase
- **Validation**: Via Supabase JWKS endpoint

### Request Validation

- **Schema validation**: All inputs validated via Zod
- **Table allowlist**: Only registered tables accessible
- **Query limits**: Max 1000 records per query
- **No raw SQL**: All queries go through Supabase client

---

## Deployment

### Environment Variables

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For local MCP only

# Rate limiting (Vercel KV)
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
```

### File Structure

```
app/
├── (site)/
│   └── oauth/
│       └── consent/
│           └── page.tsx        # OAuth consent UI
├── api/
│   └── mcp/
│       ├── v1/
│       │   └── messages/
│       │       └── route.ts    # Main MCP endpoint
│       └── health/
│           └── route.ts        # Health check
├── .well-known/
│   └── mcp.json/
│       └── route.ts            # MCP manifest
└── lib/
    └── mcp/
        ├── tools-core.ts       # Shared tool implementations
        ├── tables.ts           # Shared table registry
        ├── schemas/            # Shared Zod schemas
        ├── permissions.ts      # Role-based access
        └── rate-limit.ts       # Rate limiting
```

Note: Local MCP (`app/mcp/`) imports from `lib/mcp/` for shared code.

---

## Client Integration

### Claude Mobile Setup

1. Open Claude Mobile app
2. Go to Settings > Custom Connectors
3. Add new connector:
   - **Name**: jonfriis
   - **URL**: `https://jonfriis.com/.well-known/mcp.json`
4. Authenticate via OAuth flow (redirects to jonfriis.com login)
5. MCP tools now available in conversations

### claude.ai Setup

1. Navigate to claude.ai settings
2. Enable MCP integrations (if available)
3. Add server URL: `https://jonfriis.com`
4. Complete OAuth authentication
5. Tools appear in tool picker

### Claude Desktop Setup

For remote access (instead of local stdio):

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "jfriis-remote": {
      "url": "https://jonfriis.com/.well-known/mcp.json",
      "transport": "http"
    }
  }
}
```

### Local MCP (Claude Code)

The local stdio MCP remains the fastest option for Claude Code:

```json
// .mcp.json (project root)
{
  "mcpServers": {
    "jfriis": {
      "command": "node",
      "args": ["app/mcp/dist/index.js"]
    }
  }
}
```

---

## Implementation Plan

### Phase 0: Refactor to Shared Core

Before adding remote access, extract shared code:

1. Move tool implementations from `app/mcp/src/tools.ts` to `lib/mcp/tools-core.ts`
2. Move table registry to `lib/mcp/tables.ts`
3. Move schemas to `lib/mcp/schemas/`
4. Update local MCP to import from `lib/mcp/`
5. Test local MCP still works

**Validation**: Local MCP works with refactored imports

### Phase 1: HTTP Transport

1. Create `/api/mcp/v1/messages/route.ts`
2. Import tools from `lib/mcp/tools-core.ts`
3. Add JSON-RPC 2.0 request parsing
4. Test with curl (no auth yet)

**Validation**: Can call all 5 tools via HTTP POST

### Phase 2: Supabase OAuth

1. Enable OAuth Server in Supabase dashboard
2. Set JWT signing to RS256
3. Register Claude as OAuth client
4. Build `/oauth/consent` page
5. Add token validation to MCP endpoint

**Validation**: OAuth flow works, MCP rejects unauthorized requests

### Phase 3: Roles & Permissions

1. Add `role` and `assigned_projects` columns to `profiles` table
2. Create `lib/mcp/permissions.ts`
3. Add permission check to MCP endpoint

**Validation**: Different roles get different access

### Phase 4: Rate Limiting & Polish

1. Set up Vercel KV
2. Implement rate limiting
3. Add `/.well-known/mcp.json` manifest
4. Add `/api/mcp/health` endpoint

**Validation**: Rate limits work, health check passes

### Phase 5: Claude Integration

1. Test with Claude Desktop (HTTP transport)
2. Test with Claude Mobile
3. Test with claude.ai (if MCP supported)
4. Document any client-specific quirks

**Validation**: All Claude clients can authenticate and use tools

---

## Graceful Degradation

### Failure Modes

| Component | Failure | Behavior |
|-----------|---------|----------|
| Supabase DB | Down | Return 503, log error |
| Supabase Auth | Down | Return 503 (can't validate tokens) |
| Vercel KV (rate limit) | Down | Skip rate limiting, log warning |

### Implementation

```typescript
// lib/mcp/resilience.ts
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: T | (() => T),
  context: string
): Promise<T> {
  try {
    return await primary()
  } catch (error) {
    console.error(`[${context}] Primary failed, using fallback:`, error)
    return typeof fallback === 'function' ? fallback() : fallback
  }
}

// Usage in rate limiting
const { success } = await withFallback(
  () => checkRateLimit(userId, tool),
  { success: true, remaining: -1 }, // Skip rate limit if KV down
  'rate-limit'
)
```

### Health Check

```typescript
// app/api/mcp/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    supabase.from('profiles').select('count').limit(1),
    kv.ping(),
  ])

  const [db, cache] = checks.map(r => r.status === 'fulfilled')

  return Response.json({
    status: db ? 'healthy' : 'degraded',
    checks: { database: db, cache },
    timestamp: new Date().toISOString(),
  })
}
```

---

## Migration Path

### Keeping Local MCP

The local stdio MCP remains the primary interface for Claude Code:

- **Faster**: No network latency
- **Simpler**: No auth needed
- **Reliable**: No internet dependency

The remote MCP supplements local for mobile/web access.

### Shared Code

Core tool implementations are shared:

```typescript
// lib/mcp/tools-core.ts
export async function dbQuery(params: DbQueryInput): Promise<DbQueryOutput> {
  // Shared implementation used by both local and remote
}

// app/mcp/src/tools.ts (local)
import { dbQuery } from '../../lib/mcp/tools-core'

// app/api/mcp/v1/messages/route.ts (remote)
import { dbQuery } from '../../../../lib/mcp/tools-core'
```

---

## Appendix: Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "@upstash/ratelimit": "^1.0.0",
    "@vercel/kv": "^1.0.0"
  }
}
```

### Existing (Shared with Local MCP)

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.0"
  }
}
```

---

## Open Questions

1. **Claude client origins**: What exact origins does Claude Mobile/Desktop use for CORS?
2. **Supabase OAuth beta**: Any limitations during beta period?
3. **Vercel KV cold starts**: Will rate limiting be slow on first request?

---

## Summary

| Aspect | Approach |
|--------|----------|
| **Auth** | Supabase OAuth 2.1 Server (built-in, free) |
| **Permissions** | 2 roles (admin/editor) with project-level assignment |
| **Rate limiting** | Simple per-user limit via Vercel KV |
| **Shared code** | `lib/mcp/` imported by both local and remote |

**5 Implementation Phases**:
0. Refactor to shared core
1. HTTP transport
2. Supabase OAuth
3. Roles & permissions
4. Rate limiting & polish
5. Claude integration testing

---

*This spec extends the local MCP for remote access. Uses Supabase OAuth (free) and project-level permissions for collaborators.*
