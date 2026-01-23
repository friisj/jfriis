# Test Harness & CI Specification

**Status**: Draft
**Created**: 2026-01-22
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Non-Goals](#goals--non-goals)
4. [Architecture](#architecture)
5. [Phase 1: Build Enforcement](#phase-1-build-enforcement)
6. [Phase 2: Testing Infrastructure](#phase-2-testing-infrastructure)
7. [Phase 3: Pre-commit Hooks](#phase-3-pre-commit-hooks)
8. [Phase 4: Agent Integration](#phase-4-agent-integration)
9. [Testing Strategy](#testing-strategy)
10. [Configuration Reference](#configuration-reference)
11. [Example Tests](#example-tests)
12. [Success Metrics](#success-metrics)
13. [Risks & Mitigations](#risks--mitigations)
14. [Architectural Decision Record](#architectural-decision-record)
15. [Open Questions](#open-questions)
16. [Implementation Checklist](#implementation-checklist)

---

## Problem Statement

Recent regressions have shipped to production:

| Issue Type | Example | Frequency |
|------------|---------|-----------|
| Prop mismatches | StatusBadge `status` → `value` | 40% |
| Import path errors | Broken module resolution | 30% |
| TypeScript type drift | Schema changes without type updates | 20% |
| Null reference errors | Missing null checks | 10% |

**Root cause**: No automated validation. Build errors are **actively suppressed** in `next.config.ts`:

```typescript
// next.config.ts - CURRENT (problematic)
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,  // ← This hides TypeScript errors
  },
  eslint: {
    ignoreDuringBuilds: true, // ← This hides ESLint errors
  },
}
```

**Impact**: 90% of recent regressions would have been caught by `npm run build` if errors weren't suppressed.

---

## Current State Analysis

### What Exists

| Area | Status | Notes |
|------|--------|-------|
| TypeScript | ✓ Configured | Strict mode, but errors suppressed in build |
| ESLint | ✓ Configured | Rules defined, but ignored during build |
| Prettier | ✓ Configured | Manual formatting |
| Test Framework | ✗ None | No Vitest, Jest, or other test runner |
| CI Pipeline | ✗ None | No GitHub Actions |
| Pre-commit Hooks | ✗ None | No Husky or lint-staged |
| Code Coverage | ✗ None | No coverage tracking |

### Codebase Characteristics

- **Framework**: Next.js 14+ with App Router
- **Database**: Supabase (PostgreSQL)
- **Components**: ~50+ React components
- **Entity Types**: 20+ domain entities
- **Admin Interfaces**: Extensive CRUD operations
- **AI Integrations**: OpenAI, Anthropic SDKs

### Developer Workflow (Current)

```
Developer makes changes
        │
        ▼
npm run dev (local)
        │
        ▼
Manual browser testing
        │
        ▼
git commit && git push
        │
        ▼
Vercel deploys (build errors hidden)
        │
        ▼
Issues discovered in production 😱
```

---

## Goals & Non-Goals

### Goals

1. **Catch regressions before merge** - Automated validation on every PR
2. **Fast feedback** - Developers know within seconds if something broke
3. **Agent integration** - Leverage AI agents for intelligent review
4. **Minimal maintenance** - Simple tools, colocated tests
5. **Developer experience** - Easy to run locally, clear error messages

### Non-Goals

- **100% test coverage** - Vanity metric; focus on critical paths
- **E2E test suite** - Overkill for current project phase
- **Visual regression testing** - Snapshot testing is brittle
- **Performance testing** - Separate concern for later
- **Complex mocking infrastructure** - Keep it simple

---

## Architecture

### Developer Workflow (Proposed)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                               │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   Develop    │     │  Pre-commit  │     │     CI       │
  │   Locally    │────▶│    Hooks     │────▶│   Pipeline   │
  │              │     │              │     │              │
  │ npm run dev  │     │ lint-staged  │     │ GitHub       │
  │ npm test     │     │ type-check   │     │ Actions      │
  └──────────────┘     │ lint         │     └──────┬───────┘
                       │ format       │            │
                       └──────────────┘            │
                                                   ▼
                                          ┌──────────────┐
                                          │  PR Size     │
                                          │  Check       │
                                          └──────┬───────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                              > 500 LOC                  ≤ 500 LOC
                                    │                         │
                                    ▼                         ▼
                           ┌──────────────┐          ┌──────────────┐
                           │ tech-review  │          │    Merge     │
                           │    Agent     │          │   Ready      │
                           └──────┬───────┘          └──────────────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │  PR Comment  │
                           │  with        │
                           │  Findings    │
                           └──────────────┘
```

### CI Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions CI                                │
└─────────────────────────────────────────────────────────────────────────┘

  PR Opened / Push to PR
           │
           ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Job: validate                                              │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
  │  │ Checkout │─▶│ Setup    │─▶│ Install  │─▶│ Cache    │   │
  │  │          │  │ Node 20  │  │ deps     │  │ deps     │   │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
  └────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Parallel Steps                                             │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
  │  │ Lint     │  │ Type     │  │ Unit     │                  │
  │  │          │  │ Check    │  │ Tests    │                  │
  │  └──────────┘  └──────────┘  └──────────┘                  │
  └────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Job: build                                                 │
  │  ┌──────────┐  ┌──────────┐                                │
  │  │ Build    │─▶│ Upload   │                                │
  │  │ Next.js  │  │ Artifact │                                │
  │  └──────────┘  └──────────┘                                │
  └────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Job: coverage-report                                       │
  │  ┌──────────┐  ┌──────────┐                                │
  │  │ Generate │─▶│ Post to  │                                │
  │  │ Coverage │  │ PR       │                                │
  │  └──────────┘  └──────────┘                                │
  └────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Build Enforcement

**Goal**: Stop suppressing errors. Enforce build validation in CI.

**Effort**: ~1-2 hours (plus time to fix existing errors)

### Step 1.1: Fix next.config.ts

Remove error suppression:

```typescript
// next.config.ts - AFTER
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remove these lines entirely:
  // typescript: { ignoreBuildErrors: true },
  // eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
```

### Step 1.2: Fix Existing Errors

Run locally and fix all errors:

```bash
npm run lint          # Fix ESLint errors
npx tsc --noEmit      # Fix TypeScript errors
npm run build         # Verify full build succeeds
```

**Strategy for many errors**:
- Fix errors incrementally by file/component
- Use `// @ts-expect-error` sparingly with explanation
- Track remaining tech debt in Linear

### Step 1.3: Add GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NEXT_TELEMETRY_DISABLED: 1

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build application
        run: npm run build
        env:
          # Add any required env vars for build
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Step 1.4: Add Package.json Scripts

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check"
  }
}
```

### Phase 1 Success Criteria

- [ ] `next.config.ts` no longer suppresses errors
- [ ] `npm run build` succeeds locally with no errors
- [ ] GitHub Actions CI runs on every PR
- [ ] PRs cannot merge if CI fails

---

## Phase 2: Testing Infrastructure

**Goal**: Add component and utility testing with Vitest.

**Effort**: ~4-6 hours initial setup

### Step 2.1: Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitejs/plugin-react happy-dom
```

| Package | Purpose |
|---------|---------|
| `vitest` | Test runner (Jest-compatible, native ESM, fast) |
| `@testing-library/react` | React component testing utilities |
| `@testing-library/user-event` | Simulate user interactions |
| `@testing-library/jest-dom` | DOM assertion matchers |
| `@vitejs/plugin-react` | React support for Vite/Vitest |
| `happy-dom` | Lightweight DOM implementation |

### Step 2.2: Create vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster tests (jsdom alternative)
    environment: 'happy-dom',

    // Enable Jest-like globals (describe, it, expect)
    globals: true,

    // Setup file for global mocks and matchers
    setupFiles: ['./__tests__/setup.ts'],

    // Test file patterns
    include: ['**/*.test.{ts,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.test.{ts,tsx}',
        '__tests__/**',
      ],
      // Thresholds (optional, enable when ready)
      // thresholds: {
      //   lines: 60,
      //   functions: 60,
      //   branches: 60,
      //   statements: 60,
      // },
    },

    // Watch mode exclude
    watchExclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Step 2.3: Create Test Setup File

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => {
    return <a href={href} {...props}>{children}</a>
  },
}))

// ============================================
// Supabase Mocks
// ============================================

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
    })),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
  supabase: mockSupabaseClient,
}))

// Export for use in individual tests
export { mockSupabaseClient }

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
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
})
```

### Step 2.4: Create Test Fixtures

```typescript
// __tests__/fixtures/entities.ts
import { vi } from 'vitest'

// Entity factories for test data
export const createMockProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Project',
  slug: 'test-project',
  description: 'A test project',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockVenture = (overrides = {}) => ({
  id: 'venture-1',
  name: 'Test Venture',
  slug: 'test-venture',
  description: 'A test venture',
  status: 'exploring',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockJourney = (overrides = {}) => ({
  id: 'journey-1',
  name: 'Test Journey',
  description: 'A test journey',
  status: 'draft',
  stages: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// Add more entity factories as needed...
```

### Step 2.5: Update Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check && npm run test:run"
  }
}
```

### Step 2.6: Update CI Workflow

Add testing to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NEXT_TELEMETRY_DISABLED: 1

jobs:
  validate:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npm run type-check

  test:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [validate, test]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Step 2.7: File Structure

```
/
├── .github/
│   └── workflows/
│       └── ci.yml
├── __tests__/
│   ├── setup.ts                    # Global test setup and mocks
│   ├── fixtures/
│   │   └── entities.ts             # Test data factories
│   └── mocks/
│       └── handlers.ts             # MSW handlers (if needed later)
├── vitest.config.ts
├── components/
│   ├── admin/
│   │   ├── status-badge.tsx
│   │   └── status-badge.test.tsx   # ← Colocated test
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx         # ← Colocated test
├── lib/
│   ├── entity-links.ts
│   └── entity-links.test.ts        # ← Colocated test
└── app/
    └── api/
        └── [route]/
            ├── route.ts
            └── route.test.ts       # ← Colocated test
```

### Phase 2 Success Criteria

- [ ] Vitest installed and configured
- [ ] Test setup file with mocks for Next.js, Supabase, AI SDKs
- [ ] At least 5 component tests written
- [ ] At least 3 utility function tests written
- [ ] `npm test` runs in <30s locally
- [ ] CI runs tests and uploads coverage

---

## Phase 3: Pre-commit Hooks

**Goal**: Immediate feedback before commit.

**Effort**: ~2 hours

### Step 3.1: Install Dependencies

```bash
npm install -D husky lint-staged
```

### Step 3.2: Initialize Husky

```bash
npx husky init
```

This creates `.husky/` directory with a sample pre-commit hook.

### Step 3.3: Configure Pre-commit Hook

Update `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Step 3.4: Configure lint-staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "vitest related --run"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.css": [
      "prettier --write"
    ]
  }
}
```

**Explanation**:
- `eslint --fix` - Auto-fix linting issues
- `--max-warnings=0` - Treat warnings as errors
- `vitest related --run` - Run tests related to changed files only
- `prettier --write` - Format non-code files

### Step 3.5: Add Type Check to Pre-commit (Optional)

For stricter validation, add type checking:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Type check (fast, checks whole project)
npx tsc --noEmit

# Lint and test staged files only
npx lint-staged
```

**Note**: Type checking the whole project adds ~10-15s. Consider making this optional if it feels too slow.

### Step 3.6: Add Commit Message Hook (Optional)

Create `.husky/commit-msg` for conventional commits:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
npx --no -- commitlint --edit $1
```

Install commitlint:

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'],
    ],
    'subject-case': [0], // Disable case enforcement
  },
}
```

### Phase 3 Success Criteria

- [ ] Husky installed and configured
- [ ] Pre-commit hook runs lint-staged
- [ ] Staged TypeScript files are linted and tested
- [ ] Pre-commit completes in <10s for typical changes
- [ ] Developers can use `--no-verify` to bypass in emergencies

---

## Phase 4: Agent Integration

**Goal**: Automated intelligent review on significant PRs.

**Effort**: ~4-6 hours

### Concept

AI agents (like Claude Code's `tech-review` agent) can provide architectural review that goes beyond what automated tests catch:

- Code quality and maintainability concerns
- Architectural inconsistencies
- Security considerations
- Performance implications
- Missing edge cases

### Step 4.1: Create Agent Review Workflow

Create `.github/workflows/agent-review.yml`:

```yaml
name: Agent Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check-size:
    name: Check PR Size
    runs-on: ubuntu-latest
    outputs:
      significant: ${{ steps.changes.outputs.significant }}
      lines_changed: ${{ steps.changes.outputs.lines }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Calculate change size
        id: changes
        run: |
          # Get lines changed
          STATS=$(git diff --shortstat origin/${{ github.base_ref }}...HEAD)
          INSERTIONS=$(echo "$STATS" | grep -oP '\d+(?= insertion)' || echo "0")
          DELETIONS=$(echo "$STATS" | grep -oP '\d+(?= deletion)' || echo "0")
          TOTAL=$((INSERTIONS + DELETIONS))

          echo "lines=$TOTAL" >> $GITHUB_OUTPUT

          # Check if significant (>500 lines)
          if [ "$TOTAL" -gt 500 ]; then
            echo "significant=true" >> $GITHUB_OUTPUT
          else
            echo "significant=false" >> $GITHUB_OUTPUT
          fi

          echo "📊 PR Statistics:"
          echo "   Insertions: $INSERTIONS"
          echo "   Deletions: $DELETIONS"
          echo "   Total: $TOTAL"

  agent-review:
    name: Tech Review Agent
    needs: check-size
    if: needs.check-size.outputs.significant == 'true'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Notify about agent review
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🤖 Tech Review Triggered

              This PR has **${{ needs.check-size.outputs.lines_changed }}** lines changed, which exceeds the 500-line threshold.

              **Recommendation**: Run the \`tech-review\` agent locally for detailed architectural feedback:

              \`\`\`bash
              claude --agent tech-review
              \`\`\`

              Or wait for a maintainer to run the review.`
            })

      # Future: Automated agent invocation
      # - name: Run tech-review agent
      #   run: |
      #     claude-code --agent tech-review --pr ${{ github.event.pull_request.number }}
```

### Step 4.2: Agent Context Collection

Create a script to gather context for agent review:

```typescript
// scripts/collect-review-context.ts
import { execSync } from 'child_process'
import * as fs from 'fs'

interface ReviewContext {
  prNumber: string
  baseBranch: string
  headBranch: string
  filesChanged: string[]
  diffStats: {
    insertions: number
    deletions: number
    filesChanged: number
  }
  testResults?: {
    passed: number
    failed: number
    coverage: number
  }
  buildOutput?: string
}

function collectContext(): ReviewContext {
  const baseBranch = process.env.GITHUB_BASE_REF || 'main'
  const headBranch = process.env.GITHUB_HEAD_REF || 'HEAD'

  // Get changed files
  const filesChanged = execSync(`git diff --name-only origin/${baseBranch}...${headBranch}`)
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)

  // Get diff stats
  const stats = execSync(`git diff --shortstat origin/${baseBranch}...${headBranch}`)
    .toString()

  const insertions = parseInt(stats.match(/(\d+) insertion/)?.[1] || '0')
  const deletions = parseInt(stats.match(/(\d+) deletion/)?.[1] || '0')

  return {
    prNumber: process.env.PR_NUMBER || 'unknown',
    baseBranch,
    headBranch,
    filesChanged,
    diffStats: {
      insertions,
      deletions,
      filesChanged: filesChanged.length,
    },
  }
}

// Run and output
const context = collectContext()
console.log(JSON.stringify(context, null, 2))

// Write to file for agent consumption
fs.writeFileSync('.review-context.json', JSON.stringify(context, null, 2))
```

### Step 4.3: Agent Review Prompt Template

When invoking the `tech-review` agent, provide structured context:

```markdown
# Tech Review Request

## PR Context
- **PR**: #{{prNumber}}
- **Branch**: {{headBranch}} → {{baseBranch}}
- **Files Changed**: {{filesChanged.length}}
- **Lines**: +{{diffStats.insertions}} / -{{diffStats.deletions}}

## Changed Files
{{#each filesChanged}}
- {{this}}
{{/each}}

## Review Focus Areas
1. **Architecture**: Does this change fit the existing patterns?
2. **Security**: Any potential vulnerabilities introduced?
3. **Performance**: Any obvious performance concerns?
4. **Maintainability**: Is the code readable and maintainable?
5. **Edge Cases**: Are error cases handled properly?

## Test Results
- Passed: {{testResults.passed}}
- Failed: {{testResults.failed}}
- Coverage: {{testResults.coverage}}%

Please provide:
1. Summary of what this PR does
2. Any concerns or issues found
3. Suggestions for improvement
4. Verdict: Approve / Request Changes / Needs Discussion
```

### Phase 4 Success Criteria

- [ ] GitHub Action triggers on large PRs
- [ ] PR comment notifies about agent review recommendation
- [ ] Context collection script works
- [ ] Clear documentation on how to run agent review manually
- [ ] (Future) Automated agent invocation in CI

---

## Testing Strategy

### What to Test (Priority Order)

| Priority | Category | Examples | Approach |
|----------|----------|----------|----------|
| P0 | Build | TypeScript compilation | `tsc --noEmit` |
| P0 | Lint | Code style, imports | `eslint` |
| P0 | Build | Application builds | `next build` |
| P1 | Shared Components | StatusBadge, Button, Form | Unit tests |
| P1 | Utilities | entity-links, formatters | Unit tests |
| P2 | API Routes | CRUD endpoints | Integration tests |
| P2 | Forms | Validation, submission | Integration tests |
| P3 | Pages | Admin interfaces | E2E (future) |

### What NOT to Test

- **Implementation details** - Test behavior, not internal state
- **Third-party libraries** - Trust that Radix, Supabase, etc. work
- **Styling** - Visual tests are brittle; manual review is better
- **Trivial code** - Don't test obvious getters/setters
- **100% coverage** - Diminishing returns past 60-70%

### Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('when [condition]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

Example:

```typescript
describe('StatusBadge', () => {
  describe('when given a valid status', () => {
    it('should render the status text', () => {
      render(<StatusBadge value="active" />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('should apply the correct color class', () => {
      const { container } = render(<StatusBadge value="completed" />)
      expect(container.firstChild).toHaveClass('bg-blue-100')
    })
  })

  describe('when given an undefined value', () => {
    it('should fall back to draft styling', () => {
      // @ts-expect-error - Testing defensive behavior
      render(<StatusBadge value={undefined} />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })
  })
})
```

---

## Configuration Reference

### Complete vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.test.{ts,tsx}',
        '__tests__/**',
      ],
    },
    watchExclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Complete package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "validate": "npm run lint && npm run type-check && npm run test:run",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "vitest related --run"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Complete GitHub Actions CI

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NEXT_TELEMETRY_DISABLED: 1
  NODE_VERSION: '20'

jobs:
  validate:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npm run type-check

  test:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

      - name: Report coverage to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverageSummary = JSON.parse(
              fs.readFileSync('./coverage/coverage-summary.json', 'utf8')
            );
            const total = coverageSummary.total;

            const body = `## 📊 Coverage Report

            | Metric | Coverage |
            |--------|----------|
            | Lines | ${total.lines.pct}% |
            | Statements | ${total.statements.pct}% |
            | Functions | ${total.functions.pct}% |
            | Branches | ${total.branches.pct}% |
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [validate, test]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: nextjs-build
          path: .next/
          retention-days: 1
```

---

## Example Tests

### StatusBadge Component Test

```typescript
// components/admin/status-badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders the value text', () => {
      render(<StatusBadge value="active" />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('renders as a span element', () => {
      const { container } = render(<StatusBadge value="active" />)
      expect(container.querySelector('span')).toBeInTheDocument()
    })
  })

  describe('color mapping', () => {
    it('applies green styling for active status', () => {
      const { container } = render(<StatusBadge value="active" />)
      expect(container.firstChild).toHaveClass('bg-green-100')
      expect(container.firstChild).toHaveClass('text-green-700')
    })

    it('applies blue styling for completed status', () => {
      const { container } = render(<StatusBadge value="completed" />)
      expect(container.firstChild).toHaveClass('bg-blue-100')
      expect(container.firstChild).toHaveClass('text-blue-700')
    })

    it('applies yellow styling for pending status', () => {
      const { container } = render(<StatusBadge value="pending" />)
      expect(container.firstChild).toHaveClass('bg-yellow-100')
      expect(container.firstChild).toHaveClass('text-yellow-700')
    })

    it('falls back to gray styling for unknown statuses', () => {
      const { container } = render(<StatusBadge value="unknown-status" />)
      expect(container.firstChild).toHaveClass('bg-gray-100')
      expect(container.firstChild).toHaveClass('text-gray-700')
    })
  })

  describe('edge cases', () => {
    it('handles undefined value gracefully', () => {
      // @ts-expect-error - Testing defensive behavior
      render(<StatusBadge value={undefined} />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('handles null value gracefully', () => {
      // @ts-expect-error - Testing defensive behavior
      render(<StatusBadge value={null} />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('handles empty string value', () => {
      render(<StatusBadge value="" />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })
  })

  describe('custom color map', () => {
    it('accepts and uses custom color mapping', () => {
      const customMap = {
        'custom-status': 'bg-pink-100 text-pink-700',
      }
      const { container } = render(
        <StatusBadge value="custom-status" colorMap={customMap} />
      )
      expect(container.firstChild).toHaveClass('bg-pink-100')
      expect(container.firstChild).toHaveClass('text-pink-700')
    })

    it('merges custom map with defaults', () => {
      const customMap = {
        'custom-status': 'bg-pink-100 text-pink-700',
      }
      // Default 'active' should still work
      const { container } = render(
        <StatusBadge value="active" colorMap={customMap} />
      )
      expect(container.firstChild).toHaveClass('bg-green-100')
    })
  })
})
```

### Utility Function Test

```typescript
// lib/entity-links.test.ts
import { describe, it, expect } from 'vitest'
import {
  getEntityLink,
  getEntityAdminLink,
  formatEntityType
} from './entity-links'

describe('getEntityLink', () => {
  it('returns correct link for project entity', () => {
    expect(getEntityLink('project', 'my-project')).toBe('/projects/my-project')
  })

  it('returns correct link for venture entity', () => {
    expect(getEntityLink('venture', 'my-venture')).toBe('/ventures/my-venture')
  })

  it('returns correct link for specimen entity', () => {
    expect(getEntityLink('specimen', 'abc123')).toBe('/specimens/abc123')
  })

  it('handles unknown entity types gracefully', () => {
    // @ts-expect-error - Testing unknown type
    expect(getEntityLink('unknown', 'test')).toBe('/unknown/test')
  })
})

describe('getEntityAdminLink', () => {
  it('returns correct admin link for project', () => {
    expect(getEntityAdminLink('project', 'my-project')).toBe('/admin/projects/my-project')
  })

  it('includes edit action when specified', () => {
    expect(getEntityAdminLink('project', 'my-project', 'edit')).toBe('/admin/projects/my-project/edit')
  })
})

describe('formatEntityType', () => {
  it('capitalizes single word types', () => {
    expect(formatEntityType('project')).toBe('Project')
  })

  it('handles snake_case types', () => {
    expect(formatEntityType('canvas_item')).toBe('Canvas Item')
  })

  it('handles camelCase types', () => {
    expect(formatEntityType('canvasItem')).toBe('Canvas Item')
  })

  it('returns empty string for null/undefined', () => {
    expect(formatEntityType(null as unknown as string)).toBe('')
    expect(formatEntityType(undefined as unknown as string)).toBe('')
  })
})
```

### API Route Test

```typescript
// app/api/projects/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient } from '@/__tests__/setup'

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns projects list on success', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', status: 'active' },
      { id: '2', name: 'Project 2', status: 'draft' },
    ]

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
    })

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projects).toEqual(mockProjects)
  })

  it('returns 500 on database error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)

    expect(response.status).toBe(500)
  })
})

describe('POST /api/projects', () => {
  it('creates a new project', async () => {
    const newProject = { name: 'New Project', description: 'Test' }
    const createdProject = { id: '123', ...newProject, status: 'draft' }

    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: createdProject, error: null }),
    })

    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify(newProject),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.project).toEqual(createdProject)
  })

  it('returns 400 for invalid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }), // Missing required 'name'
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| CI pipeline duration | < 5 min | GitHub Actions timing |
| Pre-commit duration | < 10 sec | Local timing |
| Local test run | < 30 sec | `npm test` timing |
| Regression catch rate | 90%+ | Regressions caught vs. shipped |
| Test coverage (critical paths) | 60-70% | Vitest coverage report |
| Build success rate | 100% on main | No failed builds merged |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Too many existing errors to fix | High | Medium | Fix incrementally; track in Linear |
| Pre-commit hooks slow development | Medium | Low | Run only on staged files; `--no-verify` escape |
| Test maintenance burden | Medium | Medium | Keep tests focused on behavior |
| Over-testing / coverage obsession | Medium | Low | Prioritize by regression risk |
| Flaky tests | Low | High | Use deterministic mocks; avoid timers |
| CI costs | Low | Low | Use caching; cancel redundant runs |

---

## Architectural Decision Record

### ADR-001: Adopt Vitest for Testing

**Status**: Proposed

**Context**:
The jonfriis.com codebase has grown to include 20+ entity types, 50+ components, and complex admin interfaces. Recent commits reveal a pattern of preventable regressions (prop mismatches, import errors, schema drift) that ship to production because there is no automated validation.

**Decision**:
Adopt Vitest as the test framework with React Testing Library for component testing.

**Rationale**:
1. **Vitest** - Jest-compatible API (familiar), native ESM support, fast execution, built-in coverage
2. **React Testing Library** - Behavior-focused testing, accessibility-first, widely adopted
3. **happy-dom** - Faster than jsdom for most use cases
4. **Colocated tests** - Tests live next to source files for discoverability

**Alternatives Considered**:
- **Jest** - Slower, ESM support is awkward, but more mature
- **Playwright Component Testing** - Too heavy for unit tests
- **No tests, just TypeScript** - Insufficient for runtime behavior verification

**Consequences**:
- *Positive*: Fast feedback, documented component contracts, regression prevention
- *Negative*: Initial setup investment, ongoing maintenance burden
- *Neutral*: Developers need to learn Vitest (minimal if they know Jest)

---

### ADR-002: GitHub Actions for CI

**Status**: Proposed

**Context**:
No CI pipeline exists. Vercel deploys on push but doesn't validate code quality.

**Decision**:
Use GitHub Actions for CI with lint, type-check, test, and build jobs.

**Rationale**:
1. **Free for public repos** - No cost concern
2. **Native GitHub integration** - PR checks, status badges, artifact storage
3. **YAML-based** - Easy to understand and modify
4. **Widely adopted** - Lots of examples and community support

**Alternatives Considered**:
- **Vercel Checks** - Limited to build; can't run tests
- **CircleCI** - More complex, no significant advantage for this use case
- **Self-hosted** - Unnecessary complexity

---

### ADR-003: Pre-commit Hooks via Husky

**Status**: Proposed

**Context**:
Developers currently push broken code that fails in CI (or worse, passes due to suppressed errors).

**Decision**:
Use Husky + lint-staged for pre-commit validation.

**Rationale**:
1. **Immediate feedback** - Catch issues before they're committed
2. **Only staged files** - Fast execution via lint-staged
3. **Industry standard** - Husky is the de facto choice
4. **Escape hatch** - `--no-verify` for emergencies

**Alternatives Considered**:
- **No hooks** - CI catches issues anyway, but feedback is slower
- **Pre-push hooks** - Less immediate than pre-commit
- **lefthook** - Faster but less widely adopted

---

## Open Questions

1. **Pre-commit strictness**: Should hooks be blocking or warning-only initially?
   - *Recommendation*: Blocking, with documented `--no-verify` escape hatch

2. **Agent review threshold**: 500 LOC? 10 files? Something else?
   - *Recommendation*: Start with 500 LOC, adjust based on experience

3. **Coverage thresholds**: Should CI fail if coverage drops?
   - *Recommendation*: Not initially; add thresholds after baseline is established

4. **Linear tracking**: Should this work be tracked as a Linear issue?
   - *Recommendation*: Yes, create OJI-XX for test infrastructure

5. **E2E timing**: When should Playwright E2E tests be added?
   - *Recommendation*: After public launch, when user flows are stable

---

## Implementation Checklist

### Phase 1: Build Enforcement ✅ COMPLETE
- [x] Remove `ignoreBuildErrors` from `next.config.ts`
- [x] Remove `ignoreDuringBuilds` from `next.config.ts`
- [x] Fix existing TypeScript errors (67 files fixed)
- [x] Fix existing ESLint errors
- [x] Add `type-check` script to `package.json`
- [~] Create `.github/workflows/ci.yml` - SKIPPED (using local validation)
- [~] Verify CI runs on PR - SKIPPED (using local validation)
- [~] Enable branch protection - SKIPPED (using local validation)

### Phase 2: Testing Infrastructure ✅ COMPLETE
- [x] Install Vitest and dependencies
- [x] Create `vitest.config.ts`
- [x] Create `__tests__/setup.ts` with mocks
- [x] Create `__tests__/fixtures/entities.ts`
- [x] Add test scripts to `package.json`
- [x] Write StatusBadge component tests (18 tests)
- [x] Write entity-links-validation utility tests (30 tests)
- [x] Configure lint-staged to run related tests
- [~] Add test job to CI workflow - SKIPPED (using local validation)
- [~] Add coverage reporting to CI - SKIPPED (using local validation)

### Phase 3: Pre-commit Hooks (PARTIALLY COMPLETE)
- [x] Install Husky and lint-staged (already installed)
- [x] Husky initialized
- [x] Add `lint-staged` config to `package.json` (updated with vitest)
- [ ] Configure `.husky/pre-commit` to include type-check
- [ ] Test pre-commit hook locally
- [ ] Document `--no-verify` escape hatch

### Phase 4: Agent Integration
- [~] Create `.github/workflows/agent-review.yml` - SKIPPED (no GitHub CI)
- [~] Create PR size check job - SKIPPED (no GitHub CI)
- [~] Create notification comment for large PRs - SKIPPED (no GitHub CI)
- [ ] Document manual agent review process (use `tech-review` agent locally)
- [ ] (Future) Implement automated agent invocation

---

*Document version: 2.1*
*Last updated: 2026-01-23*
