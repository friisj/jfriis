# jonfriis.com Remote MCP Server Specification

> **Version:** 1.1.0
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

- **Runtime:** Vercel Edge Functions (Node.js compatible)
- **Framework:** Hono (lightweight HTTP framework)
- **Auth:** Custom OAuth 2.1 server or Auth0/Clerk
- **Core:** Shared code with local MCP (`@modelcontextprotocol/sdk`, Zod, Supabase)
- **Deployment:** Vercel (same as main site)

---

## Authentication

### OAuth 2.1 Flow

Claude Mobile and claude.ai require OAuth 2.1 for remote MCP servers.

```
┌──────────┐                              ┌──────────┐
│  Claude  │                              │  jfriis  │
│  Client  │                              │   Auth   │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. Authorization Request               │
     │  GET /oauth/authorize                   │
     │  ?client_id=claude                      │
     │  &redirect_uri=...                      │
     │  &scope=mcp:read mcp:write              │
     ├────────────────────────────────────────►│
     │                                         │
     │  2. User Login (if needed)              │
     │     (Jon authenticates)                 │
     │◄────────────────────────────────────────┤
     │                                         │
     │  3. Authorization Code                  │
     │  redirect_uri?code=xxx                  │
     │◄────────────────────────────────────────┤
     │                                         │
     │  4. Token Exchange                      │
     │  POST /oauth/token                      │
     │  { code, client_id, client_secret }     │
     ├────────────────────────────────────────►│
     │                                         │
     │  5. Access Token + Refresh Token        │
     │  { access_token, refresh_token }        │
     │◄────────────────────────────────────────┤
     │                                         │
     │  6. MCP Requests with Bearer Token      │
     │  Authorization: Bearer <token>          │
     ├────────────────────────────────────────►│
```

### Scopes

OAuth scopes provide coarse-grained access control at the token level:

| Scope | Permissions |
|-------|-------------|
| `mcp:read` | `db_list_tables`, `db_query`, `db_get` |
| `mcp:write` | `db_create`, `db_update`, `db_delete` |
| `mcp:admin` | All operations + user/role management |

Scopes are the *maximum* permissions a token can have. Actual permissions are further restricted by the user's role (see [Roles & Permissions](#roles--permissions)).

### User Model

Multi-user ready from day one:

- **Multiple users**: Owner + collaborators + API clients
- **Simple auth**: Magic link or passkey (no password)
- **Session management**: JWT with short expiry + refresh tokens
- **Device management**: List/revoke authorized devices per user
- **Role assignment**: Each user has one or more roles

### Implementation Options

**Option A: Self-hosted (Simple)**

Custom OAuth server using Supabase Auth:

```typescript
// app/api/oauth/authorize/route.ts
// app/api/oauth/token/route.ts
// app/api/oauth/revoke/route.ts
```

Pros: Full control, no external dependencies
Cons: Must implement OAuth 2.1 spec correctly

**Option B: Auth Provider (Robust)**

Use Clerk, Auth0, or WorkOS:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
// Pre-built OAuth flows, MFA, device management
```

Pros: Battle-tested, handles edge cases
Cons: External dependency, cost at scale

**Recommendation**: Start with Option A using Supabase Auth, migrate to Option B if complexity grows.

---

## Roles & Permissions

Multi-user access control with granular permissions. Ready for collaborators, API clients, and different access levels per MCP client.

### Permission Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Access Check Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Request with Bearer Token                                     │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────┐                                               │
│   │ OAuth Scope │  Token has mcp:write?                         │
│   │   Check     │  ─── No ──► 403 Forbidden                     │
│   └──────┬──────┘                                               │
│          │ Yes                                                  │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │    Role     │  User role allows this table + operation?     │
│   │   Check     │  ─── No ──► 403 Forbidden                     │
│   └──────┬──────┘                                               │
│          │ Yes                                                  │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │     RLS     │  Supabase row-level policy passes?            │
│   │   Check     │  ─── No ──► 403 / Empty result                │
│   └──────┬──────┘                                               │
│          │ Yes                                                  │
│          ▼                                                       │
│      Execute Operation                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Roles

| Role | Description | Default Permissions |
|------|-------------|---------------------|
| `owner` | Full system access | All tables, all operations |
| `admin` | Administrative access | All tables, all operations, no user management |
| `editor` | Content management | Site content tables, CRUD |
| `studio` | Studio project access | `studio_*` tables only |
| `viewer` | Read-only access | All tables, read only |
| `api` | Programmatic access | Configured per-client |

### Permission Model

Permissions are defined as `(table_pattern, operations[])` tuples:

```typescript
// lib/mcp/permissions/types.ts
interface Permission {
  tables: string | string[]  // Table name, pattern with *, or array
  operations: Operation[]    // ['read'] | ['read', 'create', 'update'] | ['*']
}

type Operation = 'read' | 'create' | 'update' | 'delete' | '*'

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  inherits?: string[]  // Inherit permissions from other roles
}
```

### Default Role Definitions

```typescript
// lib/mcp/permissions/roles.ts
export const roles: Record<string, Role> = {
  owner: {
    id: 'owner',
    name: 'Owner',
    description: 'Full system access including user management',
    permissions: [
      { tables: '*', operations: ['*'] }
    ],
  },

  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full data access, no user management',
    permissions: [
      { tables: '*', operations: ['read', 'create', 'update', 'delete'] }
    ],
  },

  editor: {
    id: 'editor',
    name: 'Editor',
    description: 'Manage site content',
    permissions: [
      { tables: ['projects', 'log_entries', 'specimens', 'gallery_sequences'], operations: ['*'] },
      { tables: ['backlog_items'], operations: ['read', 'create', 'update'] },
      { tables: '*', operations: ['read'] },  // Can read everything
    ],
  },

  studio: {
    id: 'studio',
    name: 'Studio Access',
    description: 'Access to studio project tables only',
    permissions: [
      { tables: 'studio_*', operations: ['*'] },
      { tables: ['projects', 'specimens'], operations: ['read'] },
    ],
  },

  viewer: {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to all data',
    permissions: [
      { tables: '*', operations: ['read'] }
    ],
  },

  api: {
    id: 'api',
    name: 'API Client',
    description: 'Programmatic access with custom permissions',
    permissions: [], // Configured per-client
  },
}
```

### Permission Checking

```typescript
// lib/mcp/permissions/check.ts
import { roles } from './roles'

interface AccessContext {
  userId: string
  userRoles: string[]
  tokenScopes: string[]
}

export function canAccess(
  context: AccessContext,
  table: string,
  operation: Operation
): boolean {
  // 1. Check OAuth scope
  const scopeRequired = operationToScope(operation)
  if (!context.tokenScopes.includes(scopeRequired) &&
      !context.tokenScopes.includes('mcp:admin')) {
    return false
  }

  // 2. Check role permissions
  for (const roleName of context.userRoles) {
    const role = roles[roleName]
    if (!role) continue

    for (const permission of role.permissions) {
      if (matchesTable(permission.tables, table) &&
          matchesOperation(permission.operations, operation)) {
        return true
      }
    }
  }

  return false
}

function matchesTable(pattern: string | string[], table: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.includes(table)
  }
  if (pattern === '*') return true
  if (pattern.endsWith('*')) {
    return table.startsWith(pattern.slice(0, -1))
  }
  return pattern === table
}

function matchesOperation(allowed: Operation[], requested: Operation): boolean {
  return allowed.includes('*') || allowed.includes(requested)
}

function operationToScope(operation: Operation): string {
  if (operation === 'read') return 'mcp:read'
  return 'mcp:write'
}
```

### Per-Client Permissions

Different MCP clients can have different access levels:

| Client | User Type | Role | Rationale |
|--------|-----------|------|-----------|
| Claude Code (local) | Service | `owner` | Trusted, local, full access |
| Claude Mobile (Jon) | Human | `owner` | Personal device |
| Claude Desktop (Jon) | Human | `owner` | Personal device |
| Claude Web (Jon) | Human | `editor` | Potentially shared browser |
| Collaborator | Human | `editor` or `studio` | Limited by assignment |
| API Integration | Service | `api` + custom | Scoped to specific needs |
| Public API | Anonymous | `viewer` | Read-only public data |

### API Client Configuration

For programmatic access, create API clients with custom permissions:

```typescript
// Database: mcp_api_clients table
interface ApiClient {
  id: string
  name: string
  description: string
  client_id: string      // For OAuth client_credentials flow
  client_secret_hash: string
  permissions: Permission[]
  rate_limit: number     // Requests per minute
  created_by: string     // User who created this client
  created_at: Date
  last_used_at: Date
  enabled: boolean
}

// Example: Analytics integration
const analyticsClient: ApiClient = {
  id: 'analytics-integration',
  name: 'Analytics Dashboard',
  description: 'Read-only access for analytics',
  client_id: 'analytics_xxx',
  client_secret_hash: '...',
  permissions: [
    { tables: ['projects', 'log_entries', 'specimens'], operations: ['read'] }
  ],
  rate_limit: 60,
  // ...
}
```

### Database Schema

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE mcp_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  roles TEXT[] DEFAULT ARRAY['viewer'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- API clients for programmatic access
CREATE TABLE mcp_api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  rate_limit INTEGER DEFAULT 60,
  created_by UUID REFERENCES mcp_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true
);

-- Audit log for all operations
CREATE TABLE mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES mcp_users(id),
  client_id UUID REFERENCES mcp_api_clients(id),
  action TEXT NOT NULL,  -- 'read', 'create', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  granted BOOLEAN NOT NULL
);

-- Index for audit queries
CREATE INDEX idx_audit_user ON mcp_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_table ON mcp_audit_log(table_name, timestamp DESC);
```

### Row-Level Security (RLS)

For fine-grained record-level access, use Supabase RLS:

```sql
-- Example: Users can only see their own drafts, everyone sees published
CREATE POLICY "Drafts visible to owner" ON projects
  FOR SELECT
  USING (
    published = true
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM mcp_users
      WHERE id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

-- Example: Studio tables only accessible to studio role
CREATE POLICY "Studio tables require studio role" ON studio_dst_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mcp_users
      WHERE id = auth.uid()
      AND ('studio' = ANY(roles) OR 'admin' = ANY(roles) OR 'owner' = ANY(roles))
    )
  );
```

### Permission Errors

Clear error messages for permission failures:

```typescript
interface PermissionError {
  code: 'FORBIDDEN'
  message: string
  details: {
    required_scope?: string
    required_role?: string
    table?: string
    operation?: string
  }
}

// Examples
{
  code: 'FORBIDDEN',
  message: 'Token missing required scope: mcp:write',
  details: { required_scope: 'mcp:write', operation: 'create' }
}

{
  code: 'FORBIDDEN',
  message: 'Role "viewer" cannot create records in table "projects"',
  details: { required_role: 'editor', table: 'projects', operation: 'create' }
}
```

### Admin UI for Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP Admin: Users & Permissions                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users                                                          │
│  ─────                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Jon Friis         jon@jonfriis.com    [owner]    [Edit]    ││
│  │ Collaborator      collab@example.com  [editor]   [Edit]    ││
│  │ Studio Bot        (API client)        [studio]   [Edit]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                      [+ Invite] │
│                                                                 │
│  API Clients                                                    │
│  ───────────                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Analytics         Read: projects, log_entries   [Manage]   ││
│  │ Backup Service    Read: *                       [Manage]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                   [+ New Client]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## HTTP Endpoints

### MCP Protocol Endpoints

The remote MCP follows the HTTP transport spec from the MCP protocol.

```
POST /mcp/v1/messages
  - Main MCP message endpoint
  - Accepts JSON-RPC 2.0 messages
  - Returns tool results

GET /mcp/v1/sse
  - Server-Sent Events for streaming
  - Used for long-running operations
  - Optional (can start with request/response only)
```

### OAuth Endpoints

```
GET  /oauth/authorize      - Start OAuth flow
POST /oauth/token          - Exchange code for tokens
POST /oauth/revoke         - Revoke tokens
GET  /oauth/userinfo       - Get current user info
```

### Utility Endpoints

```
GET  /health               - Health check
GET  /.well-known/mcp.json - MCP server manifest
GET  /openapi.json         - OpenAPI spec (for ChatGPT)
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
    "token_url": "https://jonfriis.com/oauth/token",
    "scopes": {
      "mcp:read": "Read database tables",
      "mcp:write": "Create, update, delete records",
      "mcp:admin": "Full administrative access"
    }
  },
  "endpoints": {
    "messages": "https://jonfriis.com/mcp/v1/messages",
    "sse": "https://jonfriis.com/mcp/v1/sse"
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

### Limits

| Scope | Rate Limit | Burst |
|-------|------------|-------|
| `mcp:read` | 100 req/min | 20 |
| `mcp:write` | 30 req/min | 10 |
| `mcp:admin` | 10 req/min | 5 |

### Implementation

Use Vercel KV (Redis) for rate limit tracking:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703596800
```

---

## Security

### Transport Security

- **HTTPS only**: No HTTP fallback
- **TLS 1.3**: Modern encryption
- **HSTS**: Strict transport security header

### Token Security

- **Short-lived access tokens**: 1 hour expiry
- **Refresh tokens**: 30 day expiry, single-use
- **Token binding**: Bind to device/IP (optional)

### Request Validation

- **Schema validation**: All inputs validated via Zod
- **Table allowlist**: Only registered tables accessible
- **Query limits**: Max 1000 records per query
- **No raw SQL**: All queries go through Supabase client

### Audit Logging

Log all write operations:

```typescript
interface AuditLog {
  timestamp: string
  user_id: string
  action: 'create' | 'update' | 'delete'
  table: string
  record_id: string
  changes: Record<string, any>
  ip_address: string
  user_agent: string
}
```

---

## Deployment

### Vercel Configuration

```json
// vercel.json
{
  "rewrites": [
    { "source": "/mcp/:path*", "destination": "/api/mcp/:path*" },
    { "source": "/oauth/:path*", "destination": "/api/oauth/:path*" }
  ],
  "headers": [
    {
      "source": "/mcp/:path*",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Authorization, Content-Type" }
      ]
    }
  ]
}
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# OAuth
OAUTH_CLIENT_ID=claude-mcp
OAUTH_CLIENT_SECRET=xxx
OAUTH_ISSUER=https://jonfriis.com

# Rate limiting (Vercel KV)
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
```

### File Structure

```
app/
├── api/
│   ├── mcp/
│   │   └── v1/
│   │       ├── messages/
│   │       │   └── route.ts    # Main MCP endpoint
│   │       └── sse/
│   │           └── route.ts    # SSE streaming (optional)
│   └── oauth/
│       ├── authorize/
│       │   └── route.ts
│       ├── token/
│       │   └── route.ts
│       └── revoke/
│           └── route.ts
├── mcp/                         # Existing local MCP
│   └── src/
│       ├── tools.ts            # Shared tool implementations
│       ├── tables.ts           # Shared table registry
│       └── schemas/            # Shared Zod schemas
└── lib/
    └── mcp/
        ├── http-adapter.ts     # HTTP → MCP protocol adapter
        ├── auth.ts             # OAuth implementation
        └── rate-limit.ts       # Rate limiting
```

---

## Client Integration

### Claude Mobile Setup

1. Open Claude Mobile app
2. Go to Settings > Custom Connectors
3. Add new connector:
   - **Name**: jonfriis
   - **URL**: https://jonfriis.com/.well-known/mcp.json
4. Authenticate via OAuth flow
5. MCP tools now available in conversations

### claude.ai Setup

1. Navigate to claude.ai settings
2. Enable MCP integrations (if available)
3. Add server URL: `https://jonfriis.com`
4. Complete OAuth authentication
5. Tools appear in tool picker

### Claude Desktop Setup

For remote access (not local stdio):

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

### ChatGPT Actions (Optional)

Export OpenAPI spec for ChatGPT integration:

```yaml
# /openapi.json
openapi: 3.1.0
info:
  title: jonfriis Database API
  version: 1.0.0
servers:
  - url: https://jonfriis.com/api
paths:
  /db/query:
    post:
      operationId: dbQuery
      summary: Query database table
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DbQueryInput'
      responses:
        '200':
          description: Query results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DbQueryOutput'
```

---

## Implementation Plan

### Phase 1: HTTP Transport

1. Create HTTP adapter wrapping existing tool implementations
2. Add `/mcp/v1/messages` endpoint
3. Test with curl/Postman
4. Add basic API key auth (temporary, before OAuth)

**Validation**: Can call all 5 tools via HTTP

### Phase 2: OAuth 2.1

1. Implement `/oauth/authorize` endpoint
2. Implement `/oauth/token` endpoint
3. Add token validation middleware
4. Implement refresh token flow
5. Add login UI (simple magic link)

**Validation**: Full OAuth flow works, tokens properly scoped

### Phase 3: Roles & Permissions

1. Create `mcp_users` and `mcp_api_clients` tables
2. Implement role definitions in `lib/mcp/permissions/roles.ts`
3. Add permission checking middleware
4. Integrate with tool handlers
5. Add `mcp_audit_log` table and logging

**Validation**: Different roles have different access, all operations logged

### Phase 4: Claude Integration

1. Create `/.well-known/mcp.json` manifest
2. Test with Claude Desktop (HTTP transport)
3. Test with Claude Mobile
4. Test with claude.ai (if supported)
5. Verify role-based access works across clients

**Validation**: All Claude clients can authenticate and use tools with correct permissions

### Phase 5: Production Hardening

1. Add rate limiting (per-user, per-role)
2. Add device management UI
3. Add token revocation
4. Implement RLS policies for sensitive tables
5. Security audit

**Validation**: Rate limits enforced, RLS working, security reviewed

### Phase 6: Admin UI

1. Build user management UI (invite, assign roles)
2. Build API client management UI
3. Add audit log viewer
4. Add permission testing tool ("can user X do Y on table Z?")

**Validation**: Can manage users and permissions via UI

### Phase 7: ChatGPT (Optional)

1. Generate OpenAPI spec
2. Create ChatGPT Action
3. Test tool calls with read-only access

**Validation**: ChatGPT can query database via Actions

---

## Monitoring

### Metrics to Track

- **Request volume**: By endpoint, by user, by tool
- **Latency**: P50, P95, P99 for tool calls
- **Error rate**: By error type, by endpoint
- **Auth failures**: Failed logins, expired tokens
- **Rate limit hits**: By user, by scope

### Alerting

- Error rate > 5% over 5 minutes
- Latency P95 > 2 seconds
- Auth failures > 10 per minute (possible attack)
- Rate limit hits > 100 per hour (possible abuse)

### Logging

Use Vercel's built-in logging with structured logs:

```typescript
console.log(JSON.stringify({
  level: 'info',
  event: 'mcp_tool_call',
  tool: 'db_query',
  table: 'projects',
  user_id: 'xxx',
  duration_ms: 45,
  result_count: 10
}))
```

---

## Cost Considerations

### Vercel Pricing

- **Edge Functions**: Included in Pro plan
- **Bandwidth**: First 1TB free, then $0.15/GB
- **KV Storage**: First 30k requests free, then $0.20/100k

### Expected Usage

For personal use (1-2 users):
- ~1000 requests/month
- ~10MB data transfer
- **Estimated cost**: $0 (within free tier)

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
    "hono": "^4.0.0",           // HTTP framework
    "@upstash/ratelimit": "^1.0.0",  // Rate limiting
    "jose": "^5.0.0"            // JWT handling
  }
}
```

### Existing (Shared)

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

## Questions to Resolve

1. **Auth provider**: Self-hosted vs Clerk/Auth0?
2. **Multi-device**: Should each device have separate tokens?
3. **Invitation flow**: Magic link invite, or manual user creation?
4. **Role storage**: Static in code, or dynamic in database?
5. **RLS complexity**: Start with role-based only, add RLS later?
6. **SSE requirement**: Is streaming needed for any tools?
7. **ChatGPT priority**: Worth implementing Actions?

---

## Summary: Permission Layers

| Layer | What it controls | Where defined |
|-------|------------------|---------------|
| **OAuth Scopes** | Max token permissions | Token claims |
| **Roles** | Table + operation access | `mcp_users.roles` |
| **Role Definitions** | What each role can do | Code (`roles.ts`) |
| **API Client Permissions** | Custom per-client access | `mcp_api_clients.permissions` |
| **RLS Policies** | Row-level filtering | Supabase policies |

This layered approach allows:
- Quick role assignment for common use cases
- Custom permissions for API integrations
- Fine-grained row-level control when needed

---

*This spec extends the local MCP for remote access with multi-user support. Core functionality remains identical.*
