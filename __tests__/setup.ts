import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

// ============================================
// Next.js Mocks
// ============================================

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    return React.createElement('img', { src, alt, ...props })
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement('a', { href, ...props }, children)
  },
}))

// ============================================
// Supabase Mocks - Enhanced with Query Validation
// ============================================

/**
 * Track query state for validation
 */
interface QueryState {
  table: string
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null
  columns: string | null
  filters: Array<{ column: string; operator: string; value: unknown }>
  hasTerminator: boolean
}

/**
 * Query validation warnings
 */
const queryWarnings: string[] = []

/**
 * Clear query warnings (call in beforeEach if needed)
 */
export function clearQueryWarnings(): void {
  queryWarnings.length = 0
}

/**
 * Reset the shared mock builder (called automatically in beforeEach)
 */
export function resetMockBuilder(): void {
  sharedMockBuilder = null
}

/**
 * Get query warnings for assertions
 */
export function getQueryWarnings(): string[] {
  return [...queryWarnings]
}

/**
 * Shared mock builder for test setup (when from() is called without args)
 * This allows tests to configure mock responses before the actual code runs.
 */
let sharedMockBuilder: Record<string, unknown> | null = null

/**
 * Create a chainable query builder with validation
 */
function createQueryBuilder(table: string | null): Record<string, unknown> {
  const state: QueryState = {
    table: table || '__mock_setup__',
    operation: null,
    columns: null,
    filters: [],
    hasTerminator: false,
  }

  const validateFilterValue = (column: string, value: unknown) => {
    // Skip validation for mock setup operations (no real table)
    if (!table || table === '__mock_setup__') {
      return
    }
    if (value === undefined) {
      const warning = `Query on "${table}": filter on "${column}" has undefined value`
      queryWarnings.push(warning)
      console.warn(`[Supabase Mock Warning] ${warning}`)
    }
    if (value === null && !['is'].includes(state.operation || '')) {
      const warning = `Query on "${table}": eq/neq with null value on "${column}" - use .is() instead`
      queryWarnings.push(warning)
      console.warn(`[Supabase Mock Warning] ${warning}`)
    }
  }

  // Helper to check if this is a mock setup operation (no real table)
  const isMockSetup = !table || table === '__mock_setup__'

  const builder: Record<string, unknown> = {
    // Operations
    select: vi.fn((columns?: string) => {
      state.operation = 'select'
      state.columns = columns ?? '*'
      if (!isMockSetup && (!columns || columns.trim() === '')) {
        const warning = `Query on "${table}": select() called with empty columns`
        queryWarnings.push(warning)
      }
      return builder
    }),
    insert: vi.fn((data: unknown) => {
      state.operation = 'insert'
      if (!isMockSetup && (!data || (Array.isArray(data) && data.length === 0))) {
        const warning = `Query on "${table}": insert() called with empty data`
        queryWarnings.push(warning)
      }
      return builder
    }),
    update: vi.fn((data: unknown) => {
      state.operation = 'update'
      if (!isMockSetup && (!data || Object.keys(data as object).length === 0)) {
        const warning = `Query on "${table}": update() called with empty data`
        queryWarnings.push(warning)
      }
      return builder
    }),
    delete: vi.fn(() => {
      state.operation = 'delete'
      return builder
    }),
    upsert: vi.fn((data: unknown) => {
      state.operation = 'upsert'
      if (!isMockSetup && !data) {
        const warning = `Query on "${table}": upsert() called with no data`
        queryWarnings.push(warning)
      }
      return builder
    }),

    // Filters
    eq: vi.fn((column: string, value: unknown) => {
      validateFilterValue(column, value)
      state.filters.push({ column, operator: 'eq', value })
      return builder
    }),
    neq: vi.fn((column: string, value: unknown) => {
      validateFilterValue(column, value)
      state.filters.push({ column, operator: 'neq', value })
      return builder
    }),
    gt: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'gt', value })
      return builder
    }),
    gte: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'gte', value })
      return builder
    }),
    lt: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'lt', value })
      return builder
    }),
    lte: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'lte', value })
      return builder
    }),
    like: vi.fn((column: string, pattern: string) => {
      state.filters.push({ column, operator: 'like', value: pattern })
      return builder
    }),
    ilike: vi.fn((column: string, pattern: string) => {
      state.filters.push({ column, operator: 'ilike', value: pattern })
      return builder
    }),
    is: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'is', value })
      return builder
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      if (table && table !== '__mock_setup__' && (!Array.isArray(values) || values.length === 0)) {
        const warning = `Query on "${table}": in() on "${column}" has empty array`
        queryWarnings.push(warning)
      }
      state.filters.push({ column, operator: 'in', value: values })
      return builder
    }),
    contains: vi.fn((column: string, value: unknown) => {
      state.filters.push({ column, operator: 'contains', value })
      return builder
    }),
    or: vi.fn(() => builder),

    // Modifiers
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),

    // Terminators
    single: vi.fn().mockImplementation(() => {
      state.hasTerminator = true
      // Simulate Supabase behavior: single() on delete without filters is dangerous
      // Skip for mock setup operations
      if (table && table !== '__mock_setup__' && state.operation === 'delete' && state.filters.length === 0) {
        const warning = `Query on "${table}": delete().single() without filters - will delete random row!`
        queryWarnings.push(warning)
      }
      return Promise.resolve({ data: null, error: null })
    }),
    maybeSingle: vi.fn().mockImplementation(() => {
      state.hasTerminator = true
      return Promise.resolve({ data: null, error: null })
    }),
    // Default terminator (implicit when awaited)
    then: vi.fn((resolve: (value: unknown) => void) => {
      state.hasTerminator = true
      resolve({ data: [], error: null })
    }),
  }

  return builder
}

const mockSupabaseClient = {
  from: vi.fn((table?: string) => {
    // Always return the same shared mock builder
    // This allows tests to configure mock responses in beforeEach
    // that will be used when the actual code runs
    if (!sharedMockBuilder) {
      sharedMockBuilder = createQueryBuilder(table || null)
    }
    return sharedMockBuilder
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  storage: {
    from: vi.fn((bucket: string) => {
      if (!bucket) {
        throw new Error('storage.from() requires a bucket name')
      }
      return {
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://example.com/${bucket}/${path}` },
        })),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
  },
  rpc: vi.fn((fnName: string, params?: unknown) => {
    if (!fnName) {
      throw new Error('rpc() requires a function name')
    }
    return Promise.resolve({ data: null, error: null })
  }),
}

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
  supabase: mockSupabaseClient,
}))

// Export for use in individual tests
export { mockSupabaseClient }

/**
 * Type for Supabase query results used in tests.
 * Use this to type-assert mock results when destructuring.
 *
 * @example
 * const result = await mockSupabaseClient.from('table').select('*').single() as SupabaseQueryResult<MyType>
 */
export type SupabaseQueryResult<T> = {
  data: T | null
  error: { code: string; message: string } | null
}

/**
 * Helper type for mock query builder with proper typing.
 * Cast mockSupabaseClient.from() to this type for better IntelliSense.
 */
export type MockQueryBuilder = ReturnType<typeof createQueryBuilder>

// ============================================
// AI SDK Mocks
// ============================================

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'mocked response' }),
  streamText: vi.fn().mockResolvedValue({ textStream: [] }),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({})),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({})),
}))

// ============================================
// Global Test Utilities
// ============================================

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  sharedMockBuilder = null
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
})

// ============================================
// Console Suppression Utilities
// ============================================

/**
 * Suppress console output during tests.
 * Use sparingly - prefer fixing the underlying issues.
 *
 * @example
 * ```ts
 * const restore = suppressConsole(['error', 'warn'])
 * // ... code that logs errors
 * restore()
 * ```
 */
export type ConsoleMethods = 'log' | 'warn' | 'error' | 'info' | 'debug'

export function suppressConsole(
  methods: ConsoleMethods[] = ['log', 'warn', 'error', 'info', 'debug']
): () => void {
  const spies: ReturnType<typeof vi.spyOn>[] = []

  for (const method of methods) {
    spies.push(vi.spyOn(console, method).mockImplementation(() => {}))
  }

  return () => {
    for (const spy of spies) {
      spy.mockRestore()
    }
  }
}

/**
 * Suppress all console output for the duration of a test.
 * Returns a mock that can be used to assert on console calls.
 *
 * @example
 * ```ts
 * const mocks = suppressAllConsole()
 * someFunctionThatLogs()
 * expect(mocks.error).toHaveBeenCalledWith('Expected error')
 * mocks.restore()
 * ```
 */
export function suppressAllConsole(): {
  log: ReturnType<typeof vi.spyOn>
  warn: ReturnType<typeof vi.spyOn>
  error: ReturnType<typeof vi.spyOn>
  info: ReturnType<typeof vi.spyOn>
  debug: ReturnType<typeof vi.spyOn>
  restore: () => void
} {
  const mocks = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    restore() {
      this.log.mockRestore()
      this.warn.mockRestore()
      this.error.mockRestore()
      this.info.mockRestore()
      this.debug.mockRestore()
    },
  }

  return mocks
}
