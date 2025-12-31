# Codebase Improvement Plan

**Created:** 2025-12-31
**Based On:** Comprehensive Codebase Audit (2025-12-31)
**Status:** Ready for Implementation
**Total Estimated Effort:** 40-60 hours across 8 phases

## Overview

This plan addresses critical issues identified in the codebase audit while maintaining incremental, mergeable progress. Each phase is designed to be completed independently and merged to main without breaking existing functionality.

**Key Principles:**
- ✅ Each phase is independently mergeable
- ✅ No phase breaks existing functionality
- ✅ Tests added before refactoring where possible
- ✅ Documentation updated with each phase
- ✅ Security improvements prioritized early

---

## Phase 0: Foundation & Setup (Pre-work)

**Goal:** Prepare the codebase for improvements without breaking changes

**Estimated Effort:** 2-3 hours
**Priority:** CRITICAL (blocking all other work)
**Can Be Merged:** Yes

### Tasks

#### 0.1 Install Development Dependencies
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @vitest/ui happy-dom
npm install -D husky lint-staged
npm install -D @types/node
```

#### 0.2 Configure Vitest
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
afterEach(() => cleanup())
```

#### 0.3 Update package.json Scripts
Add test scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### 0.4 Create Test Utilities Directory
```bash
mkdir -p __tests__/utils
mkdir -p __tests__/fixtures
```

Create `__tests__/utils/test-helpers.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export const mockSupabaseClient = () => {
  // Mock Supabase client for tests
  return createClient(
    'https://test.supabase.co',
    'test-anon-key'
  )
}

export const createMockJourney = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  slug: 'test-journey',
  name: 'Test Journey',
  status: 'draft' as const,
  validation_status: 'not_started' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

### Success Criteria
- ✅ Vitest installed and configured
- ✅ Test utilities created
- ✅ `npm run test` executes (even with no tests)
- ✅ All changes committed and pushed

### Files Modified
- `package.json`
- `vitest.config.ts` (new)
- `vitest.setup.ts` (new)
- `__tests__/utils/test-helpers.ts` (new)

### PR Description Template
```markdown
## Phase 0: Testing Infrastructure Setup

Sets up testing infrastructure without changing any production code.

### Changes
- Installed Vitest and testing libraries
- Configured test environment with happy-dom
- Created test utilities and helpers
- Added test scripts to package.json

### Testing
- `npm run test` executes successfully
- No existing functionality changed
```

---

## Phase 1: TypeScript Compiler Enforcement

**Goal:** Fix TypeScript errors and remove build error suppression

**Estimated Effort:** 4-6 hours
**Priority:** CRITICAL
**Depends On:** Phase 0
**Can Be Merged:** Yes

### Tasks

#### 1.1 Generate Proper Supabase Types
```bash
# If using local Supabase
npx supabase gen types typescript --local > lib/types/database.generated.ts

# If using remote Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.generated.ts
```

#### 1.2 Update Database Type Imports
Update `lib/types/supabase.ts`:
```typescript
export type { Database } from './database.generated'
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
```

#### 1.3 Fix TypeScript Errors Incrementally
**Strategy:** Fix errors file by file, starting with most critical

**Priority Order:**
1. `lib/types/*.ts` - Type definition files
2. `lib/crud.ts` - Core CRUD operations
3. `lib/boundary-objects/*.ts` - Business logic
4. `lib/ai/*.ts` - AI integration
5. `components/**/*.tsx` - UI components
6. `app/**/*.tsx` - Pages and routes

**Common Fixes:**
- Replace `any` with proper types
- Add missing type imports
- Fix null/undefined handling
- Correct async/await usage

#### 1.4 Enable TypeScript Strict Checks (Incremental)
Update `tsconfig.json` incrementally:
```json
{
  "compilerOptions": {
    // Start with these
    "strict": false,
    "noImplicitAny": true,

    // Add after fixing errors
    // "strictNullChecks": true,
    // "strictFunctionTypes": true,
    // "noImplicitReturns": true
  }
}
```

#### 1.5 Remove Build Error Suppression
**LAST STEP - only after all errors fixed:**

Update `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  // TODO comments removed, issues resolved
  typescript: {
    // Build will now fail on type errors ✅
    ignoreBuildErrors: false,
  },
  eslint: {
    // Build will now fail on lint errors ✅
    ignoreDuringBuilds: false,
  },
}
```

#### 1.6 Verify Build Success
```bash
npm run build
# Should complete without errors
```

### Success Criteria
- ✅ All TypeScript errors resolved
- ✅ `npm run build` completes successfully
- ✅ No `ignoreBuildErrors` flags in config
- ✅ Supabase types generated and imported correctly
- ✅ No regression in functionality

### Files Modified
- `next.config.ts`
- `tsconfig.json`
- `lib/types/database.generated.ts` (new)
- `lib/types/supabase.ts`
- Various files with type errors (tracked in commit messages)

### PR Description Template
```markdown
## Phase 1: TypeScript Compiler Enforcement

Fixes all TypeScript errors and removes build error suppression.

### Changes
- Generated proper Supabase types from database schema
- Fixed [N] TypeScript errors across [M] files
- Removed `ignoreBuildErrors` and `ignoreDuringBuilds` flags
- Updated type imports to use generated types

### Type Safety Improvements
- Replaced `any` types with proper interfaces
- Added missing type imports
- Fixed null/undefined handling
- Improved async/await type safety

### Testing
- `npm run build` completes without errors
- All pages render correctly
- No runtime errors in development

### Breaking Changes
None - all changes are internal type improvements
```

---

## Phase 2: Core CRUD Tests

**Goal:** Add comprehensive tests for core database operations

**Estimated Effort:** 8-12 hours
**Priority:** CRITICAL
**Depends On:** Phase 0, Phase 1
**Can Be Merged:** Yes

### Tasks

#### 2.1 Set Up Test Database
Create `__tests__/setup/supabase-test.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

// Use separate test database or local Supabase instance
export const getTestClient = () => {
  return createClient<Database>(
    process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
    process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
  )
}

export const cleanupTestData = async (client: any, table: string) => {
  await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
```

#### 2.2 Journey CRUD Tests
Create `__tests__/lib/boundary-objects/journeys.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createJourney,
  getJourney,
  updateJourney,
  deleteJourney,
  listJourneySummaries
} from '@/lib/boundary-objects/journeys'
import { getTestClient, cleanupTestData } from '@/__tests__/setup/supabase-test'

describe('Journey CRUD Operations', () => {
  const client = getTestClient()

  beforeEach(async () => {
    await cleanupTestData(client, 'user_journeys')
  })

  afterEach(async () => {
    await cleanupTestData(client, 'user_journeys')
  })

  it('should create a journey', async () => {
    const journey = await createJourney({
      slug: 'test-journey',
      name: 'Test Journey',
      status: 'draft',
    })

    expect(journey).toBeDefined()
    expect(journey.slug).toBe('test-journey')
  })

  it('should retrieve a journey by id', async () => {
    const created = await createJourney({ slug: 'test', name: 'Test' })
    const retrieved = await getJourney(created.id)

    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe(created.id)
  })

  it('should update a journey', async () => {
    const created = await createJourney({ slug: 'test', name: 'Original' })
    const updated = await updateJourney(created.id, { name: 'Updated' })

    expect(updated.name).toBe('Updated')
    expect(updated.slug).toBe('test') // unchanged
  })

  it('should delete a journey', async () => {
    const created = await createJourney({ slug: 'test', name: 'Test' })
    await deleteJourney(created.id)

    const retrieved = await getJourney(created.id)
    expect(retrieved).toBeNull()
  })
})

describe('Journey Summaries (N+1 Fix Validation)', () => {
  const client = getTestClient()

  beforeEach(async () => {
    await cleanupTestData(client, 'user_journeys')

    // Create test data: 10 journeys with stages and touchpoints
    for (let i = 0; i < 10; i++) {
      const journey = await createJourney({
        slug: `journey-${i}`,
        name: `Journey ${i}`,
      })

      // Add 3 stages per journey
      for (let j = 0; j < 3; j++) {
        const stage = await createStage({
          user_journey_id: journey.id,
          name: `Stage ${j}`,
          sequence: j,
        })

        // Add 2 touchpoints per stage
        for (let k = 0; k < 2; k++) {
          await createTouchpoint({
            journey_stage_id: stage.id,
            name: `Touchpoint ${k}`,
            sequence: k,
          })
        }
      }
    }
  })

  it('should fetch summaries with view (single query)', async () => {
    const startTime = Date.now()
    const summaries = await listJourneySummaries()
    const duration = Date.now() - startTime

    expect(summaries).toHaveLength(10)
    expect(summaries[0].stage_count).toBe(3)
    expect(summaries[0].touchpoint_count).toBe(6)

    // Performance assertion: should complete in < 500ms
    expect(duration).toBeLessThan(500)
  })

  it('should paginate results correctly', async () => {
    const page1 = await listJourneys(undefined, undefined, { limit: 5 })
    const page2 = await listJourneys(undefined, undefined, {
      limit: 5,
      cursor: page1.nextCursor
    })

    expect(page1.data).toHaveLength(5)
    expect(page2.data).toHaveLength(5)
    expect(page1.data[0].id).not.toBe(page2.data[0].id)
  })
})
```

#### 2.3 Generic CRUD Tests
Create `__tests__/lib/crud.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createRecord, readRecords, updateRecord, deleteRecord } from '@/lib/crud'

describe('Generic CRUD Operations', () => {
  it('should create a record', async () => {
    // Test with a simple table like studio_projects
  })

  it('should read records with filters', async () => {
    // Test filtering and sorting
  })

  it('should handle errors gracefully', async () => {
    // Test error cases
  })
})
```

#### 2.4 Add Test Coverage Reporting
Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.d.ts'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
})
```

### Success Criteria
- ✅ Journey CRUD tests pass
- ✅ N+1 query fix validated with performance test
- ✅ Pagination tested with cursor-based approach
- ✅ Generic CRUD operations tested
- ✅ Test coverage > 50% for core lib functions
- ✅ Tests run in CI (if configured)

### Files Created
- `__tests__/setup/supabase-test.ts`
- `__tests__/lib/boundary-objects/journeys.test.ts`
- `__tests__/lib/crud.test.ts`

### Files Modified
- `vitest.config.ts` (coverage configuration)

### PR Description Template
```markdown
## Phase 2: Core CRUD Tests

Adds comprehensive test coverage for database operations.

### Changes
- Set up test database configuration
- Added journey CRUD operation tests
- Validated N+1 query fix with performance tests
- Added pagination tests
- Configured test coverage reporting

### Test Coverage
- Journey operations: 100%
- Generic CRUD: 80%
- Overall lib coverage: 50%+

### Performance Validation
- ✅ listJourneySummaries() completes in < 500ms for 10 journeys
- ✅ Pagination works correctly with cursor-based approach

### Testing
```bash
npm run test              # Run all tests
npm run test:coverage     # Generate coverage report
```

### Breaking Changes
None - only adds tests
```

---

## Phase 3: Security Hardening

**Goal:** Fix security issues (CORS, logging, environment variables)

**Estimated Effort:** 3-4 hours
**Priority:** HIGH
**Depends On:** Phase 1
**Can Be Merged:** Yes

### Tasks

#### 3.1 Environment Variable Validation
Create `lib/config/env.ts`:
```typescript
/**
 * Environment Variable Validation
 *
 * Validates and exports all required environment variables.
 * Fails fast at startup if required variables are missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

// Supabase
export const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

// AI Providers (at least one required)
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY && !GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('At least one AI provider API key must be configured')
}

// OAuth
export const OAUTH_ALLOWED_ORIGINS = optionalEnv(
  'OAUTH_ALLOWED_ORIGINS',
  'http://localhost:3000'
).split(',')

// Rate Limiting
export const KV_REST_API_URL = process.env.KV_REST_API_URL
export const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const IS_PRODUCTION = NODE_ENV === 'production'
export const IS_DEVELOPMENT = NODE_ENV === 'development'

// Logging
export const LOG_LEVEL = optionalEnv('LOG_LEVEL', IS_PRODUCTION ? 'info' : 'debug')

// Validate config on import (fail fast)
console.log('✅ Environment variables validated successfully')
```

#### 3.2 Update Supabase Client to Use Validated Config
Update `lib/supabase-server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

Remove debug logging:
```typescript
// DELETE THIS LINE:
// console.log('Server cookies:', allCookies.map(c => c.name))
```

#### 3.3 Restrict OAuth CORS
Update `app/api/oauth/token/route.ts`:
```typescript
import { OAUTH_ALLOWED_ORIGINS, IS_PRODUCTION } from '@/lib/config/env'

function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin')

  // In development, allow all origins
  if (!IS_PRODUCTION) {
    return origin || '*'
  }

  // In production, validate against whitelist
  if (origin && OAUTH_ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }

  // Default to first allowed origin
  return OAUTH_ALLOWED_ORIGINS[0] || 'https://www.jonfriis.com'
}

export async function POST(request: Request) {
  // ... existing code ...

  const allowedOrigin = getAllowedOrigin(request)

  return Response.json({
    access_token: storedRequest.access_token,
    token_type: 'Bearer',
    expires_in: storedRequest.expires_in,
    refresh_token: storedRequest.refresh_token,
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Access-Control-Allow-Origin': allowedOrigin, // ✅ Restricted
    },
  })
}

export async function OPTIONS(request: Request) {
  const allowedOrigin = getAllowedOrigin(request)

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin, // ✅ Restricted
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
```

#### 3.4 Remove Sensitive Logging
Create `lib/utils/logger.ts`:
```typescript
/**
 * Production-Safe Logger
 *
 * Automatically sanitizes sensitive data and respects log levels.
 */

import { LOG_LEVEL, IS_PRODUCTION } from '@/lib/config/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const SENSITIVE_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /cookie/i,
  /authorization/i,
]

function sanitize(data: any): any {
  if (typeof data === 'string') {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(data)) {
        return '[REDACTED]'
      }
    }
    return data
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {}
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(key))
      sanitized[key] = isSensitive ? '[REDACTED]' : sanitize(value)
    }
    return sanitized
  }

  return data
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = LEVELS[LOG_LEVEL as LogLevel] || LEVELS.info
  return LEVELS[level] >= currentLevel
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...args.map(sanitize))
    }
  },

  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args.map(sanitize))
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args.map(sanitize))
    }
  },

  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args.map(sanitize))
    }
  },
}
```

Update `app/api/oauth/token/route.ts`:
```typescript
import { logger } from '@/lib/utils/logger'

// Replace console.log with logger
logger.debug('Token exchange - stored:', {
  client_id: storedRequest.client_id,
  redirect_uri: storedRequest.redirect_uri,
})
```

#### 3.5 Add Content Security Policy
Update `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  // ... existing config ...

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs unsafe-eval
              "style-src 'self' 'unsafe-inline'", // Tailwind needs unsafe-inline
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}
```

### Success Criteria
- ✅ All environment variables validated at startup
- ✅ CORS restricted to allowed origins in production
- ✅ No sensitive data in logs
- ✅ CSP headers configured
- ✅ Security headers present in responses

### Files Created
- `lib/config/env.ts`
- `lib/utils/logger.ts`

### Files Modified
- `lib/supabase-server.ts`
- `lib/supabase.ts`
- `app/api/oauth/token/route.ts`
- `app/api/oauth/approve/route.ts`
- `app/api/oauth/deny/route.ts`
- `next.config.ts`

### PR Description Template
```markdown
## Phase 3: Security Hardening

Addresses security vulnerabilities identified in audit.

### Changes
- ✅ Environment variable validation (fail fast on startup)
- ✅ CORS restricted to allowed origins (production)
- ✅ Sensitive data removed from logs
- ✅ Structured logging with sanitization
- ✅ Content Security Policy headers
- ✅ Additional security headers (X-Frame-Options, etc.)

### Security Improvements
1. **Environment Variables**: All required vars validated at startup
2. **CORS**: OAuth endpoints now validate origin against whitelist
3. **Logging**: Automatic sanitization of tokens, keys, cookies
4. **CSP**: Prevents XSS and other injection attacks
5. **Headers**: Frame-ancestors, X-Content-Type-Options, etc.

### Configuration Required
Add to `.env.local`:
```bash
OAUTH_ALLOWED_ORIGINS=https://www.jonfriis.com,http://localhost:3000
LOG_LEVEL=info  # debug | info | warn | error
```

### Testing
- Verify app starts without errors
- Check CORS restrictions in browser DevTools
- Inspect response headers for CSP
- Test logging doesn't expose sensitive data

### Breaking Changes
None - graceful defaults for missing optional env vars
```

---

## Phase 4: AI Endpoint Rate Limiting

**Goal:** Add rate limiting to AI generation endpoints

**Estimated Effort:** 2-3 hours
**Priority:** HIGH
**Depends On:** Phase 3
**Can Be Merged:** Yes

### Tasks

#### 4.1 Extract User ID from Session
Create `lib/auth/session.ts`:
```typescript
import { createClient } from '@/lib/supabase-server'

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('Authentication required')
  }
  return userId
}
```

#### 4.2 Add Rate Limiting to AI Generate Endpoint
Update `app/api/ai/generate/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { executeAction, getAction } from '@/lib/ai/actions'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/mcp/rate-limit'
import { getCurrentUserId } from '@/lib/auth/session'
import type { FieldGenerationInput } from '@/lib/ai/actions/types'

export async function POST(request: Request) {
  try {
    // Get user ID from session
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Authentication required',
            retryable: false,
          },
        },
        { status: 401 }
      )
    }

    // Check rate limit (60 req/min per user)
    const rateLimitResult = await checkRateLimit(`ai:${userId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'rate_limited',
            message: 'Too many requests. Please try again later.',
            retryable: true,
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          },
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    const body = await request.json()
    const { action, input } = body as {
      action: string
      input: FieldGenerationInput
    }

    // Validate action exists
    const actionDef = getAction(action)
    if (!actionDef) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: `Unknown action: ${action}`,
            retryable: false,
          },
        },
        { status: 400 }
      )
    }

    // Execute the action
    const result = await executeAction(action, input)

    if (!result.success) {
      const status = result.error?.code === 'rate_limited' ? 429 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      },
      { status: 500 }
    )
  }
}
```

#### 4.3 Update AI Hook to Handle Rate Limiting
Update `lib/ai/hooks/useGenerate.ts`:
```typescript
// ... existing imports ...

export function useGenerate() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number
    reset: number
  } | null>(null)

  const generate = useCallback(async (
    action: string,
    input: FieldGenerationInput
  ): Promise<FieldGenerationOutput | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, input }),
      })

      // Extract rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining')
      const reset = response.headers.get('X-RateLimit-Reset')

      if (remaining && reset) {
        setRateLimitInfo({
          remaining: parseInt(remaining),
          reset: parseInt(reset),
        })
      }

      const result = await response.json()

      if (!result.success) {
        const errorMsg = result.error?.code === 'rate_limited'
          ? `Rate limit exceeded. Try again in ${result.error.retryAfter} seconds.`
          : result.error?.message || 'Generation failed'

        setError(errorMsg)
        return null
      }

      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generate, isGenerating, error, rateLimitInfo }
}
```

#### 4.4 Add Rate Limit Indicator to UI
Update `components/forms/form-field-with-ai.tsx`:
```typescript
// Add rate limit display
{rateLimitInfo && (
  <span className="text-xs text-muted-foreground">
    {rateLimitInfo.remaining} requests remaining
  </span>
)}
```

### Success Criteria
- ✅ AI endpoints protected by rate limiting
- ✅ Rate limit info returned in headers
- ✅ UI displays remaining requests
- ✅ Proper error messages for rate limit exceeded
- ✅ Graceful degradation if Redis unavailable

### Files Created
- `lib/auth/session.ts`

### Files Modified
- `app/api/ai/generate/route.ts`
- `lib/ai/hooks/useGenerate.ts`
- `components/forms/form-field-with-ai.tsx`

### PR Description Template
```markdown
## Phase 4: AI Endpoint Rate Limiting

Adds rate limiting to AI generation endpoints to prevent abuse.

### Changes
- Added user authentication check to AI endpoints
- Implemented rate limiting (60 requests/min per user)
- Added rate limit headers to responses
- Updated UI to show remaining requests
- Graceful error messages for rate limit exceeded

### Rate Limit Configuration
- Limit: 60 requests per minute per user
- Uses Upstash Redis (same as MCP)
- Graceful degradation if Redis unavailable (dev only)

### Testing
- Generate multiple AI requests rapidly
- Verify rate limit kicks in at 60 requests
- Check UI shows remaining requests
- Test error message when limit exceeded

### Breaking Changes
None - AI endpoints now require authentication (already the case via Supabase)
```

---

## Phase 5: Error Monitoring & Observability

**Goal:** Add structured logging and error tracking

**Estimated Effort:** 4-6 hours
**Priority:** MEDIUM
**Depends On:** Phase 3
**Can Be Merged:** Yes

### Tasks

#### 5.1 Install Error Monitoring (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### 5.2 Configure Sentry
Update `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'
import { IS_PRODUCTION } from './lib/config/env'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: IS_PRODUCTION,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers?.Authorization
    }
    return event
  },
})
```

#### 5.3 Enhance Logger with Sentry Integration
Update `lib/utils/logger.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

export const logger = {
  // ... existing methods ...

  error: (...args: any[]) => {
    const sanitized = args.map(sanitize)

    if (shouldLog('error')) {
      console.error('[ERROR]', ...sanitized)
    }

    // Send errors to Sentry
    if (IS_PRODUCTION) {
      const errorObj = sanitized.find(arg => arg instanceof Error)
      if (errorObj) {
        Sentry.captureException(errorObj, {
          extra: { context: sanitized },
        })
      } else {
        Sentry.captureMessage(sanitized.join(' '), 'error')
      }
    }
  },
}
```

#### 5.4 Add Performance Monitoring
Create `lib/utils/performance.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'function',
    },
    async () => {
      const start = performance.now()
      try {
        const result = await fn()
        const duration = performance.now() - start

        if (duration > 1000) {
          logger.warn(`Slow operation: ${name} took ${duration}ms`)
        }

        return result
      } catch (error) {
        logger.error(`Error in ${name}:`, error)
        throw error
      }
    }
  )
}

// Usage example:
export async function listJourneys(...args) {
  return measurePerformance('listJourneys', async () => {
    // ... existing implementation ...
  })
}
```

#### 5.5 Add User Feedback Widget
Update `app/layout.tsx`:
```typescript
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up user feedback
    window.addEventListener('error', (event) => {
      Sentry.showReportDialog({
        eventId: Sentry.lastEventId(),
        title: 'It looks like we\'re having issues.',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you\'d like to help, tell us what happened below.',
      })
    })
  }, [])

  return <>{children}</>
}
```

#### 5.6 Add Health Check Endpoint
Create `app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getAvailableProviders } from '@/lib/ai/providers'

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      ai_providers: [] as string[],
      rate_limiting: false,
    },
  }

  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from('studio_projects').select('count').limit(1)
    checks.checks.database = !error

    // Check AI providers
    checks.checks.ai_providers = getAvailableProviders()

    // Check rate limiting (KV)
    checks.checks.rate_limiting = !!(
      process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    )

    const isHealthy = checks.checks.database && checks.checks.ai_providers.length > 0
    checks.status = isHealthy ? 'healthy' : 'degraded'

    return NextResponse.json(checks, {
      status: isHealthy ? 200 : 503,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
```

### Success Criteria
- ✅ Sentry configured and capturing errors
- ✅ Sensitive data filtered from error reports
- ✅ Performance monitoring active
- ✅ Health check endpoint working
- ✅ Error logs sent to Sentry in production

### Files Created
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `lib/utils/performance.ts`
- `app/api/health/route.ts`

### Files Modified
- `lib/utils/logger.ts`
- `app/layout.tsx`
- `next.config.ts` (Sentry webpack plugin)

### PR Description Template
```markdown
## Phase 5: Error Monitoring & Observability

Adds structured error tracking and performance monitoring.

### Changes
- Integrated Sentry for error tracking
- Added performance monitoring utilities
- Created health check endpoint
- Enhanced logger with Sentry integration
- Configured error filtering for sensitive data

### Monitoring Features
1. **Error Tracking**: Automatic Sentry error capture
2. **Performance**: Slow query detection
3. **Health Checks**: `/api/health` endpoint
4. **User Feedback**: Error report dialog
5. **Privacy**: Sensitive data filtered from reports

### Configuration Required
Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...  # For source maps
```

### Testing
- Trigger an error and verify Sentry capture
- Check `/api/health` returns proper status
- Verify slow operations logged
- Test error feedback widget

### Breaking Changes
None - monitoring is passive
```

---

## Phase 6: Pre-commit Hooks & Code Quality

**Goal:** Prevent future issues with automated checks

**Estimated Effort:** 2-3 hours
**Priority:** MEDIUM
**Depends On:** Phase 1
**Can Be Merged:** Yes

### Tasks

#### 6.1 Install Husky and Lint-Staged
```bash
npm install -D husky lint-staged
npx husky init
```

#### 6.2 Configure Lint-Staged
Create `.lintstagedrc.js`:
```javascript
module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    // Run type check on staged files
    () => 'tsc --noEmit',
  ],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  // Run tests for related files
  '*.test.{ts,tsx}': ['vitest run --reporter=dot'],
}
```

#### 6.3 Configure Husky Hooks
Update `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Prevent commits with TODO comments in critical files
if git diff --cached --name-only | grep -E "next.config.ts"; then
  if git diff --cached next.config.ts | grep -E "ignoreBuildErrors|ignoreDuringBuilds"; then
    echo "❌ Error: Cannot commit with build error suppression enabled"
    echo "   Please remove ignoreBuildErrors and ignoreDuringBuilds from next.config.ts"
    exit 1
  fi
fi
```

Create `.husky/pre-push`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before push
npm run test:run

# Verify build succeeds
npm run build
```

#### 6.4 Configure Prettier
Create `.prettierrc.js`:
```javascript
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'avoid',
}
```

Create `.prettierignore`:
```
node_modules
.next
dist
build
coverage
*.log
.env*
!.env.example
```

#### 6.5 Configure ESLint
Update `.eslintrc.json`:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  }
}
```

#### 6.6 Add VS Code Workspace Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer"
  ]
}
```

### Success Criteria
- ✅ Pre-commit hook runs lint and type check
- ✅ Pre-push hook runs tests and build
- ✅ Cannot commit with build errors ignored
- ✅ Code automatically formatted on save
- ✅ ESLint warnings shown in editor

### Files Created
- `.lintstagedrc.js`
- `.husky/pre-commit`
- `.husky/pre-push`
- `.prettierrc.js`
- `.prettierignore`
- `.vscode/settings.json`
- `.vscode/extensions.json`

### Files Modified
- `.eslintrc.json`
- `package.json` (husky install script)

### PR Description Template
```markdown
## Phase 6: Pre-commit Hooks & Code Quality

Adds automated checks to prevent future issues.

### Changes
- Configured Husky for Git hooks
- Added lint-staged for staged file linting
- Pre-commit: ESLint, Prettier, TypeScript check
- Pre-push: Tests and build verification
- Prevents commits with build error suppression
- VS Code workspace settings for consistency

### Developer Experience
1. **Auto-format on save** (Prettier)
2. **Lint errors highlighted** (ESLint)
3. **Type errors shown** (TypeScript)
4. **Tests run before push** (Vitest)
5. **Build verified before push** (Next.js)

### Workflow
```bash
git add .
git commit -m "fix: something"
# ✅ Auto-runs: ESLint, Prettier, TypeScript check

git push
# ✅ Auto-runs: Tests, Build
```

### Setup
New developers run:
```bash
npm install
npx husky install  # Auto-run in postinstall
```

### Breaking Changes
- Commits will fail if linting/type errors present
- Pushes will fail if tests fail or build breaks
- This is intentional - prevents broken code from merging
```

---

## Phase 7: Advanced Tests (E2E & Integration)

**Goal:** Add end-to-end and integration tests for critical flows

**Estimated Effort:** 8-12 hours
**Priority:** MEDIUM
**Depends On:** Phase 2, Phase 4
**Can Be Merged:** Yes

### Tasks

#### 7.1 Install Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

#### 7.2 Configure Playwright
Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### 7.3 Authentication E2E Test
Create `e2e/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to admin
    await expect(page).toHaveURL('/admin')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})
```

#### 7.4 Journey CRUD E2E Test
Create `e2e/journeys.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Journey CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/admin')
  })

  test('should create a new journey', async ({ page }) => {
    await page.goto('/admin/journeys')
    await page.click('text=New Journey')

    await page.fill('input[name="name"]', 'Test Journey')
    await page.fill('input[name="slug"]', 'test-journey')
    await page.selectOption('select[name="status"]', 'draft')

    await page.click('button[type="submit"]')

    // Should redirect to journey detail
    await expect(page).toHaveURL(/\/admin\/journeys\/[a-f0-9-]+/)
    await expect(page.locator('h1:has-text("Test Journey")')).toBeVisible()
  })

  test('should list journeys with pagination', async ({ page }) => {
    await page.goto('/admin/journeys')

    // Should show table
    await expect(page.locator('table')).toBeVisible()

    // Should have pagination if > 50 items
    const loadMoreButton = page.locator('button:has-text("Load More")')
    if (await loadMoreButton.isVisible()) {
      const initialCount = await page.locator('tbody tr').count()
      await loadMoreButton.click()

      const newCount = await page.locator('tbody tr').count()
      expect(newCount).toBeGreaterThan(initialCount)
    }
  })

  test('should filter journeys by status', async ({ page }) => {
    await page.goto('/admin/journeys')

    await page.selectOption('select[name="status"]', 'active')
    await page.click('button:has-text("Filter")')

    // URL should have status param
    await expect(page).toHaveURL(/status=active/)

    // All visible journeys should be active
    const statusBadges = page.locator('[data-status="active"]')
    const count = await statusBadges.count()
    expect(count).toBeGreaterThan(0)
  })
})
```

#### 7.5 AI Generation E2E Test
Create `e2e/ai-generation.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('AI Field Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
  })

  test('should generate field content', async ({ page }) => {
    await page.goto('/admin/journeys/new')

    // Fill some context fields
    await page.fill('input[name="name"]', 'Onboarding Journey')

    // Click AI generate button for description
    await page.click('button[data-ai-field="description"]')

    // Should show loading state
    await expect(page.locator('text=Generating...')).toBeVisible()

    // Wait for generation to complete (max 10s)
    await page.waitForSelector('textarea[name="description"]:not(:empty)', {
      timeout: 10000,
    })

    // Should have generated content
    const description = await page.inputValue('textarea[name="description"]')
    expect(description.length).toBeGreaterThan(10)
  })

  test('should show rate limit warning', async ({ page }) => {
    await page.goto('/admin/journeys/new')

    // Make 60+ rapid requests to hit rate limit
    for (let i = 0; i < 65; i++) {
      await page.click('button[data-ai-field="description"]')
      await page.waitForTimeout(100)
    }

    // Should show rate limit error
    await expect(page.locator('text=/Rate limit exceeded/')).toBeVisible()
  })
})
```

#### 7.6 Integration Test for MCP Tools
Create `__tests__/integration/mcp-tools.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { dbQuery, dbCreate, dbUpdate, dbDelete } from '@/lib/mcp/tools-core'
import { getTestClient, cleanupTestData } from '@/__tests__/setup/supabase-test'

describe('MCP Tools Integration', () => {
  const supabase = getTestClient()

  beforeEach(async () => {
    await cleanupTestData(supabase, 'studio_projects')
  })

  it('should create a record via MCP', async () => {
    const result = await dbCreate(supabase, {
      table: 'studio_projects',
      data: {
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
      },
    })

    expect(result.data).toBeDefined()
    expect(result.data.slug).toBe('test-project')
  })

  it('should query records via MCP', async () => {
    // Create test data
    await dbCreate(supabase, {
      table: 'studio_projects',
      data: { name: 'Project 1', slug: 'project-1', status: 'active' },
    })
    await dbCreate(supabase, {
      table: 'studio_projects',
      data: { name: 'Project 2', slug: 'project-2', status: 'archived' },
    })

    // Query active projects
    const result = await dbQuery(supabase, {
      table: 'studio_projects',
      filter: { status: 'active' },
    })

    expect(result.data).toBeDefined()
    expect(result.data?.length).toBe(1)
    expect(result.data?.[0].slug).toBe('project-1')
  })

  it('should validate against schema', async () => {
    const result = await dbCreate(supabase, {
      table: 'studio_projects',
      data: {
        // Missing required 'name' field
        slug: 'invalid',
      },
    })

    expect(result.error).toBeDefined()
    expect(result.error).toContain('validation')
  })
})
```

### Success Criteria
- ✅ Auth flow E2E test passes
- ✅ Journey CRUD E2E tests pass
- ✅ AI generation E2E test passes
- ✅ MCP tools integration tests pass
- ✅ Tests run in CI (if configured)
- ✅ Coverage includes critical user paths

### Files Created
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/journeys.spec.ts`
- `e2e/ai-generation.spec.ts`
- `__tests__/integration/mcp-tools.test.ts`

### Files Modified
- `package.json` (test scripts)

### PR Description Template
```markdown
## Phase 7: Advanced Tests (E2E & Integration)

Adds end-to-end and integration tests for critical flows.

### Changes
- Installed and configured Playwright
- Added authentication flow E2E tests
- Added journey CRUD E2E tests
- Added AI generation E2E tests (including rate limiting)
- Added MCP tools integration tests
- Configured CI-friendly test settings

### Test Coverage
1. **Auth Flow**: Login success/failure
2. **Journey CRUD**: Create, list, filter, paginate
3. **AI Generation**: Field generation, rate limiting
4. **MCP Tools**: Create, query, validate

### Running Tests
```bash
# Unit/integration tests
npm run test

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

### CI Configuration
Tests run automatically on:
- Pull request creation
- Push to main branch

### Breaking Changes
None - tests are additive
```

---

## Phase 8: Performance Optimization

**Goal:** Optimize database queries and add caching

**Estimated Effort:** 6-8 hours
**Priority:** LOW (can defer until needed)
**Depends On:** Phase 2
**Can Be Merged:** Yes

### Tasks

#### 8.1 Analyze Slow Queries
Create `scripts/analyze-queries.ts`:
```typescript
/**
 * Query Performance Analyzer
 *
 * Run with: npx tsx scripts/analyze-queries.ts
 */

import { createClient } from '@/lib/supabase-server'

async function analyzeQueries() {
  const supabase = await createClient()

  console.log('Analyzing query performance...\n')

  // Test journey summaries query
  console.time('listJourneySummaries')
  const { data: summaries } = await supabase
    .from('journey_summaries')
    .select('*')
  console.timeEnd('listJourneySummaries')
  console.log(`Returned ${summaries?.length || 0} rows\n`)

  // Test journey detail query
  console.time('getJourneyWithStages')
  const { data: journey } = await supabase
    .from('user_journeys')
    .select(`
      *,
      stages:journey_stages(
        *,
        touchpoints:touchpoints(*)
      )
    `)
    .limit(1)
    .single()
  console.timeEnd('getJourneyWithStages')
  console.log(`Loaded journey with ${journey?.stages?.length || 0} stages\n`)

  // More query tests...
}

analyzeQueries().catch(console.error)
```

#### 8.2 Add Database Indexes
Create migration `supabase/migrations/20260101000000_performance_indexes.sql`:
```sql
-- Performance Optimization Indexes
-- Based on query analysis and common access patterns

-- Journey lookups by slug
CREATE INDEX IF NOT EXISTS idx_user_journeys_slug
  ON user_journeys(slug);

-- Journey filtering by status
CREATE INDEX IF NOT EXISTS idx_user_journeys_status
  ON user_journeys(status) WHERE status != 'archived';

-- Journey filtering by validation status
CREATE INDEX IF NOT EXISTS idx_user_journeys_validation
  ON user_journeys(validation_status);

-- Journey-Project relationship
CREATE INDEX IF NOT EXISTS idx_user_journeys_project
  ON user_journeys(studio_project_id)
  WHERE studio_project_id IS NOT NULL;

-- Stages ordered by sequence
CREATE INDEX IF NOT EXISTS idx_journey_stages_sequence
  ON journey_stages(user_journey_id, sequence);

-- Touchpoints ordered by sequence
CREATE INDEX IF NOT EXISTS idx_touchpoints_sequence
  ON touchpoints(journey_stage_id, sequence);

-- Touchpoints by pain level (for filtering)
CREATE INDEX IF NOT EXISTS idx_touchpoints_pain_level
  ON touchpoints(pain_level)
  WHERE pain_level IN ('major', 'critical');

-- Canvas items by type (for filtering)
CREATE INDEX IF NOT EXISTS idx_canvas_items_type
  ON canvas_items(item_type);

-- Assumptions by status (for validation tracking)
CREATE INDEX IF NOT EXISTS idx_assumptions_status
  ON assumptions(validation_status);

-- GIN index for JSONB tag searches
CREATE INDEX IF NOT EXISTS idx_user_journeys_tags
  ON user_journeys USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_touchpoints_tags
  ON touchpoints USING GIN (tags);

-- Composite index for common journey queries
CREATE INDEX IF NOT EXISTS idx_user_journeys_status_updated
  ON user_journeys(status, updated_at DESC);

-- Comment on performance expectations
COMMENT ON INDEX idx_user_journeys_slug IS
  'Optimizes journey lookups by slug (used in URL routing)';
COMMENT ON INDEX idx_journey_stages_sequence IS
  'Optimizes ordered stage retrieval for journey detail pages';
```

#### 8.3 Implement Redis Caching
Create `lib/cache/redis.ts`:
```typescript
import { kv } from '@vercel/kv'
import { logger } from '@/lib/utils/logger'

const CACHE_TTL = 60 * 5 // 5 minutes

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await kv.get<T>(key)
    if (cached) {
      logger.debug('Cache hit:', key)
      return cached
    }

    // Cache miss - fetch fresh data
    logger.debug('Cache miss:', key)
    const fresh = await fetcher()

    // Store in cache
    await kv.setex(key, ttl, fresh)

    return fresh
  } catch (error) {
    // Cache failure - fall back to fetching
    logger.warn('Cache error:', error)
    return fetcher()
  }
}

export async function invalidateCache(pattern: string) {
  try {
    const keys = await kv.keys(pattern)
    if (keys.length > 0) {
      await kv.del(...keys)
      logger.debug(`Invalidated ${keys.length} cache keys matching: ${pattern}`)
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error)
  }
}

// Namespace helpers
export const cacheKeys = {
  journey: (id: string) => `journey:${id}`,
  journeySummaries: (filters: string) => `journeys:summaries:${filters}`,
  journeyDetail: (id: string) => `journey:detail:${id}`,
  canvasItems: (type: string) => `canvas-items:${type}`,
}
```

#### 8.4 Add Caching to Journey Operations
Update `lib/boundary-objects/journeys.ts`:
```typescript
import { getCached, invalidateCache, cacheKeys } from '@/lib/cache/redis'

export async function getJourney(id: string): Promise<UserJourney | null> {
  return getCached(
    cacheKeys.journey(id),
    async () => {
      const { data, error } = await supabase
        .from('user_journeys')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    300 // 5 minute TTL
  )
}

export async function updateJourney(
  id: string,
  updates: Partial<UserJourneyInsert>
): Promise<UserJourney> {
  const updated = await performUpdate(id, updates)

  // Invalidate caches
  await invalidateCache(`journey:${id}*`)
  await invalidateCache('journeys:summaries:*')

  return updated
}

export async function listJourneySummaries(
  filters?: JourneyFilters
): Promise<JourneySummary[]> {
  const filterKey = JSON.stringify(filters || {})

  return getCached(
    cacheKeys.journeySummaries(filterKey),
    async () => {
      // ... existing query ...
    },
    180 // 3 minute TTL for list views
  )
}
```

#### 8.5 Add Query Performance Monitoring
Update `lib/utils/performance.ts`:
```typescript
export async function measureQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    const result = await query()
    const duration = performance.now() - start

    // Log slow queries
    if (duration > 1000) {
      logger.warn(`Slow query: ${name} took ${duration.toFixed(2)}ms`)

      // Send to monitoring
      if (IS_PRODUCTION) {
        Sentry.captureMessage(`Slow query: ${name}`, {
          level: 'warning',
          extra: { duration, name },
        })
      }
    }

    // Log all queries in debug mode
    logger.debug(`Query ${name}: ${duration.toFixed(2)}ms`)

    return result
  } catch (error) {
    const duration = performance.now() - start
    logger.error(`Query error in ${name} after ${duration.toFixed(2)}ms:`, error)
    throw error
  }
}

// Usage
export async function listJourneys(...args) {
  return measureQuery('listJourneys', async () => {
    // ... query implementation ...
  })
}
```

#### 8.6 Implement Optimistic Updates
Update `lib/ai/hooks/useGenerate.ts`:
```typescript
export function useOptimisticUpdate<T>(
  initialValue: T
): [T, (newValue: T) => void, (updater: () => Promise<T>) => Promise<void>] {
  const [value, setValue] = useState(initialValue)
  const [isPending, setIsPending] = useState(false)

  const update = async (updater: () => Promise<T>) => {
    setIsPending(true)

    try {
      const newValue = await updater()
      setValue(newValue)
    } catch (error) {
      // Revert on error
      setValue(initialValue)
      throw error
    } finally {
      setIsPending(false)
    }
  }

  return [value, setValue, update]
}

// Usage in journey form
const [journey, setJourney, updateJourney] = useOptimisticUpdate(initialJourney)

async function handleSave() {
  // Optimistically update UI
  setJourney({ ...journey, name: 'New Name' })

  // Perform actual update
  await updateJourney(async () => {
    return await saveJourney({ ...journey, name: 'New Name' })
  })
}
```

### Success Criteria
- ✅ Database indexes added for common queries
- ✅ Redis caching implemented for frequently accessed data
- ✅ Cache invalidation works correctly on updates
- ✅ Slow queries logged and monitored
- ✅ Journey list loads in < 500ms with 1000+ records
- ✅ Journey detail loads in < 300ms

### Files Created
- `scripts/analyze-queries.ts`
- `supabase/migrations/20260101000000_performance_indexes.sql`
- `lib/cache/redis.ts`

### Files Modified
- `lib/boundary-objects/journeys.ts` (caching)
- `lib/utils/performance.ts` (query monitoring)

### PR Description Template
```markdown
## Phase 8: Performance Optimization

Optimizes database queries and adds caching layer.

### Changes
- Added database indexes for common query patterns
- Implemented Redis caching for frequently accessed data
- Added cache invalidation on updates
- Query performance monitoring and logging
- Optimistic updates for better perceived performance

### Performance Improvements
| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| List Journeys (1000 records) | ~2000ms | ~200ms | 10x faster |
| Journey Detail | ~500ms | ~100ms | 5x faster |
| Journey Summaries | ~3000ms | ~300ms | 10x faster |

### Caching Strategy
- **TTL**: 3-5 minutes for list views
- **Invalidation**: Automatic on create/update/delete
- **Fallback**: Graceful degradation if Redis unavailable

### Configuration Required
Redis/KV already configured for rate limiting - no additional setup needed.

### Testing
```bash
# Run query analysis
npx tsx scripts/analyze-queries.ts

# Load test
npx autocannon -c 10 -d 30 http://localhost:3000/admin/journeys
```

### Breaking Changes
None - caching is transparent to consumers
```

---

## Implementation Roadmap

### Week 1: Critical Path
- **Day 1-2:** Phase 0 + Phase 1 (Testing setup + TypeScript fixes)
- **Day 3:** Phase 2 (Core CRUD tests)
- **Day 4:** Phase 3 (Security hardening)
- **Day 5:** Phase 4 (Rate limiting)

### Week 2: Quality & Monitoring
- **Day 1-2:** Phase 5 (Error monitoring)
- **Day 3:** Phase 6 (Pre-commit hooks)
- **Day 4-5:** Phase 7 (E2E tests)

### Week 3: Performance (Optional)
- **Day 1-2:** Phase 8 (Performance optimization)
- **Day 3-5:** Production deployment preparation

---

## Merge Strategy

Each phase should follow this merge pattern:

1. **Create feature branch** from `main`
   ```bash
   git checkout -b phase-1-typescript-enforcement
   ```

2. **Implement phase** with commits following conventional commits
   ```bash
   git commit -m "test: add vitest configuration"
   git commit -m "fix: resolve TypeScript errors in lib/crud.ts"
   git commit -m "refactor: use generated Supabase types"
   ```

3. **Self-review** before PR
   - Run tests: `npm run test`
   - Run build: `npm run build`
   - Test manually in dev: `npm run dev`

4. **Create PR** with template
   - Use phase PR description template
   - Add screenshots if UI changes
   - Link to audit issue

5. **Merge to main** after approval
   ```bash
   git checkout main
   git merge --squash phase-1-typescript-enforcement
   git commit -m "feat: complete Phase 1 - TypeScript compiler enforcement"
   git push origin main
   ```

6. **Tag release** (optional)
   ```bash
   git tag -a phase-1-complete -m "Phase 1: TypeScript enforcement complete"
   git push --tags
   ```

---

## Success Metrics

Track progress with these metrics:

| Metric | Baseline | After Phase 1 | After Phase 4 | After Phase 8 |
|--------|----------|---------------|---------------|---------------|
| TypeScript Errors | ? | 0 | 0 | 0 |
| Test Coverage | 0% | 50%+ | 60%+ | 70%+ |
| Build Time | ~30s | ~30s | ~30s | ~25s |
| Page Load (Journeys) | ~2s | ~2s | ~1.5s | ~500ms |
| Security Score (A-F) | C | B | A | A |
| Lighthouse Score | ? | ? | ? | 90+ |

---

## Risk Mitigation

### Phase 1 Risks
- **Risk:** Fixing TypeScript errors breaks functionality
- **Mitigation:** Add tests in Phase 0 first, fix incrementally

### Phase 3 Risks
- **Risk:** CORS changes break OAuth flow
- **Mitigation:** Test OAuth flow in development before production deploy

### Phase 4 Risks
- **Risk:** Rate limiting blocks legitimate users
- **Mitigation:** Start with generous limits (60/min), monitor usage

### Phase 8 Risks
- **Risk:** Caching serves stale data
- **Mitigation:** Conservative TTLs, aggressive invalidation, cache-aside pattern

---

## Rollback Plan

If any phase causes issues in production:

1. **Immediate:** Revert merge commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Monitor:** Check error rates, performance metrics

3. **Fix Forward:** Create hotfix branch, address issue, fast-track PR

4. **Document:** Update phase documentation with lessons learned

---

## Questions & Support

- **Phase blocking you?** Skip to next independent phase
- **Not sure about approach?** Review audit report, consult documentation
- **Need help?** Create issue with `[Phase N]` prefix

---

**Total Estimated Effort:** 40-60 hours across 8 phases
**Critical Path:** Phases 0-4 (essential for production)
**Nice-to-Have:** Phases 5-8 (quality of life, performance)

**Next Steps:**
1. Review this plan
2. Start with Phase 0 (2-3 hours)
3. Create feature branch: `git checkout -b phase-0-foundation`
4. Follow tasks in Phase 0 section
5. Create PR when complete

Good luck! 🚀
