# Remote MCP Implementation Plan

> **Based on:** [REMOTE_MCP_SPEC.md](./REMOTE_MCP_SPEC.md) v2.1
> **Created:** 2025-12-27

---

## Overview

5 phases to add HTTP transport to the existing local MCP server. Each phase has clear validation criteria before proceeding.

---

## Phase 0: Refactor to Shared Core

**Goal:** Extract shared code so both local and remote MCP use the same implementations.

### Tasks

1. **Create `lib/mcp/` directory structure**
   ```
   lib/mcp/
   ├── tools-core.ts      # Tool implementations
   ├── tables.ts          # Table registry
   ├── schemas/           # Zod schemas per table
   │   ├── projects.ts
   │   ├── log-entries.ts
   │   └── ...
   └── types.ts           # Shared types
   ```

2. **Move tool implementations from `app/mcp/src/tools.ts` to `lib/mcp/tools-core.ts`**
   - Keep function signatures identical
   - Export each tool function

3. **Move table registry from `app/mcp/src/tables.ts` to `lib/mcp/tables.ts`**

4. **Move Zod schemas to `lib/mcp/schemas/`**

5. **Update local MCP to import from `lib/mcp/`**
   ```typescript
   // app/mcp/src/tools.ts
   import { dbQuery, dbGet, dbCreate, dbUpdate, dbDelete } from '../../../lib/mcp/tools-core'
   ```

6. **Rebuild and test local MCP**
   ```bash
   cd app/mcp && npm run build
   ```

### Validation

- [ ] Local MCP builds without errors
- [ ] All 5 tools work via Claude Code
- [ ] No code duplication between local MCP and lib/mcp

---

## Phase 1: HTTP Transport

**Goal:** MCP tools accessible via HTTP POST (no auth yet).

### Tasks

1. **Create API route structure**
   ```
   app/api/mcp/
   ├── v1/
   │   └── messages/
   │       └── route.ts    # Main MCP endpoint
   └── health/
       └── route.ts        # Health check
   ```

2. **Implement `/api/mcp/v1/messages/route.ts`**
   ```typescript
   import { dbQuery, dbGet, dbCreate, dbUpdate, dbDelete, dbListTables } from '@/lib/mcp/tools-core'

   export async function POST(request: Request) {
     const body = await request.json()

     // Parse JSON-RPC 2.0 request
     const { id, method, params } = body

     if (method !== 'tools/call') {
       return Response.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } })
     }

     const { name, arguments: args } = params

     // Route to tool
     const result = await executeTool(name, args)

     return Response.json({ jsonrpc: '2.0', id, result })
   }
   ```

3. **Implement health check**
   ```typescript
   // app/api/mcp/health/route.ts
   export async function GET() {
     const dbOk = await checkDatabase()
     return Response.json({
       status: dbOk ? 'healthy' : 'unhealthy',
       timestamp: new Date().toISOString()
     })
   }
   ```

4. **Test with curl**
   ```bash
   curl -X POST http://localhost:3000/api/mcp/v1/messages \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"db_list_tables","arguments":{}}}'
   ```

### Validation

- [ ] All 5 tools respond correctly via HTTP
- [ ] Health check returns status
- [ ] Error responses follow JSON-RPC 2.0 format

---

## Phase 2: Supabase OAuth

**Goal:** Secure the endpoint with Supabase OAuth 2.1.

### Tasks

1. **Enable OAuth Server in Supabase Dashboard**
   - Dashboard > Authentication > OAuth Server > Enable
   - Set Authorization Path to `/oauth/consent`

2. **Switch JWT signing to RS256**
   - Dashboard > Auth > Settings > JWT Algorithm > RS256

3. **Register OAuth client for Claude**
   - Dashboard > Authentication > OAuth Apps > Add
   - Note client_id for later

4. **Create consent UI page**
   ```
   app/(site)/oauth/
   └── consent/
       └── page.tsx
   ```
   - Show client name and requested permissions
   - Approve/Deny buttons
   - Redirect back to Supabase on decision

5. **Add token validation to MCP endpoint**
   ```typescript
   // app/api/mcp/v1/messages/route.ts
   import { createClient } from '@/lib/supabase/server'

   export async function POST(request: Request) {
     const authHeader = request.headers.get('Authorization')
     if (!authHeader?.startsWith('Bearer ')) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 })
     }

     const token = authHeader.slice(7)
     const supabase = createClient()
     const { data: { user }, error } = await supabase.auth.getUser(token)

     if (error || !user) {
       return Response.json({ error: 'Invalid token' }, { status: 401 })
     }

     // Continue with tool execution...
   }
   ```

6. **Test OAuth flow manually**
   - Start authorization flow
   - Login if needed
   - Approve consent
   - Receive token
   - Call MCP with token

### Validation

- [ ] Unauthenticated requests return 401
- [ ] OAuth flow completes successfully
- [ ] Valid tokens allow MCP access
- [ ] Expired tokens are rejected

---

## Phase 3: Roles & Permissions

**Goal:** Enforce admin/editor permissions with project-level access.

### Tasks

1. **Add columns to profiles table**
   ```sql
   ALTER TABLE profiles
     ADD COLUMN role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
     ADD COLUMN assigned_projects UUID[] DEFAULT '{}';

   -- Set yourself as admin
   UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
   ```

2. **Create permission module**
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
     if (user.role === 'admin') return true
     if (operation === 'read') return true
     if (projectId && user.assigned_projects.includes(projectId)) return true
     return false
   }
   ```

3. **Fetch user profile in MCP endpoint**
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('role, assigned_projects')
     .eq('id', user.id)
     .single()
   ```

4. **Add permission check before tool execution**
   ```typescript
   const operation = getOperationType(toolName) // 'read' | 'create' | 'update' | 'delete'
   const projectId = extractProjectId(toolName, args)

   if (!canAccess(profile, operation, projectId)) {
     return Response.json({
       jsonrpc: '2.0',
       id,
       error: { code: -32603, message: 'Permission denied' }
     })
   }
   ```

5. **Test with different roles**
   - Create test user with editor role
   - Assign to specific project
   - Verify read works everywhere
   - Verify write only works on assigned project

### Validation

- [ ] Admin can do everything
- [ ] Editor can read all tables
- [ ] Editor can only write to assigned projects
- [ ] Editor cannot write to tables without project_id

---

## Phase 4: Rate Limiting & Polish

**Goal:** Add rate limiting and MCP manifest.

### Tasks

1. **Set up Vercel KV**
   - Vercel Dashboard > Storage > KV > Create
   - Copy environment variables to `.env.local` and Vercel

2. **Implement rate limiting**
   ```typescript
   // lib/mcp/rate-limit.ts
   import { Ratelimit } from '@upstash/ratelimit'
   import { kv } from '@vercel/kv'

   const ratelimit = new Ratelimit({
     redis: kv,
     limiter: Ratelimit.slidingWindow(60, '1 m'),
   })

   export async function checkRateLimit(userId: string) {
     return ratelimit.limit(userId)
   }
   ```

3. **Add rate limit check to MCP endpoint**
   ```typescript
   const { success, remaining } = await checkRateLimit(user.id)
   if (!success) {
     return Response.json(
       { error: 'Rate limit exceeded' },
       { status: 429, headers: { 'Retry-After': '60' } }
     )
   }
   ```

4. **Create MCP manifest**
   ```typescript
   // app/.well-known/mcp.json/route.ts
   export async function GET() {
     return Response.json({
       name: 'jfriis',
       version: '1.0.0',
       description: 'Database CRUD for jonfriis.com',
       homepage: 'https://jonfriis.com',
       authentication: {
         type: 'oauth2',
         authorization_url: 'https://jonfriis.com/oauth/authorize',
         token_url: 'https://jonfriis.com/oauth/token'
       },
       endpoints: {
         messages: 'https://jonfriis.com/api/mcp/v1/messages'
       },
       tools: ['db_list_tables', 'db_query', 'db_get', 'db_create', 'db_update', 'db_delete']
     })
   }
   ```

5. **Add graceful degradation for KV**
   ```typescript
   const { success } = await withFallback(
     () => checkRateLimit(userId),
     { success: true },
     'rate-limit'
   )
   ```

### Validation

- [ ] Rate limiting triggers after 60 requests/minute
- [ ] Manifest accessible at `/.well-known/mcp.json`
- [ ] Health check shows all systems status
- [ ] Rate limiting degrades gracefully if KV is down

---

## Phase 5: Claude Integration

**Goal:** Test with actual Claude clients.

### Tasks

1. **Deploy to Vercel**
   - Ensure all environment variables are set
   - Deploy and verify health check

2. **Test with Claude Desktop (HTTP)**
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

3. **Test with Claude Mobile**
   - Settings > Custom Connectors > Add
   - URL: `https://jonfriis.com/.well-known/mcp.json`
   - Complete OAuth flow
   - Test tool usage

4. **Test with claude.ai** (if MCP supported)

5. **Document any client-specific quirks**
   - CORS issues?
   - Token refresh behavior?
   - Error handling differences?

6. **Update CORS allowlist with discovered origins**

### Validation

- [ ] Claude Desktop works via HTTP
- [ ] Claude Mobile works
- [ ] OAuth flow smooth on mobile
- [ ] No CORS errors in production

---

## Dependencies

### New packages to install

```bash
npm install @upstash/ratelimit @vercel/kv
```

### Environment variables needed

```bash
# Already have (Supabase)
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# New (Vercel KV)
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
```

---

## File Checklist

```
New files to create:
[ ] lib/mcp/tools-core.ts
[ ] lib/mcp/tables.ts
[ ] lib/mcp/schemas/*.ts
[ ] lib/mcp/types.ts
[ ] lib/mcp/permissions.ts
[ ] lib/mcp/rate-limit.ts
[ ] lib/mcp/resilience.ts
[ ] app/api/mcp/v1/messages/route.ts
[ ] app/api/mcp/health/route.ts
[ ] app/.well-known/mcp.json/route.ts
[ ] app/(site)/oauth/consent/page.tsx

Files to modify:
[ ] app/mcp/src/tools.ts (import from lib/mcp)
[ ] app/mcp/src/index.ts (if needed)
```

---

## Open Questions

1. **Claude client CORS origins** - Will discover during Phase 5
2. **Supabase OAuth beta stability** - Monitor for API changes
3. **Vercel KV cold starts** - Test latency impact

---

*Implementation order follows dependency chain: shared code first, then transport, then auth, then permissions, then polish.*
